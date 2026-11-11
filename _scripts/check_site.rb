#!/usr/bin/env ruby
# frozen_string_literal: true

# Prüft die fertig gebaute Seite in _site/:
#   1. Tote interne Links (href, src, poster, srcset) und fehlende #Anker
#   2. Verwaiste Seiten: HTML-Seiten, die von der Startseite aus über Links nicht erreichbar sind
#   3. Optional (--extern): externe Links per HTTP prüfen
#
# Aufruf:  bundle exec jekyll build && ruby _scripts/check_site.rb [--extern]
# Exit-Code 1, wenn tote interne Links oder verwaiste Seiten gefunden wurden.

require "set"
require "uri"
require "cgi"
require "net/http"

SITE = File.expand_path("../_site", __dir__)
HOST = "ifsmb.de"
CHECK_EXTERNAL = ARGV.include?("--extern")

# Seiten, die absichtlich nicht verlinkt sein müssen
ORPHAN_OK = %w[/404.html].freeze
# Pfade, die erst im CI entstehen (Pagefind-Index)
GENERATED_PREFIXES = %w[/pagefind/].freeze

abort "#{SITE} fehlt – erst `bundle exec jekyll build` ausführen." unless Dir.exist?(SITE)

def url_path_for(file)
  rel = "/" + file.delete_prefix(SITE + "/")
  rel.sub(%r{(^|/)index\.html\z}, '\1')
end

def resolve(path)
  path = CGI.unescape(path)
  candidates = [path]
  candidates << File.join(path, "index.html") if path.end_with?("/") || File.extname(path).empty?
  candidates << "#{path}.html" if File.extname(path).empty?
  candidates.map { |c| File.join(SITE, c) }.find { |f| File.file?(f) }
end

def ids_in(html)
  html.scan(/\s(?:id|name)\s*=\s*["']([^"']+)["']/i).flatten.to_set
end

# Alle Verweise aus einer HTML-Datei holen
def refs_in(html)
  html = html.gsub(/<!--.*?-->/m, "")
  refs = html.scan(/\s(?:href|src|poster)\s*=\s*["']([^"']*)["']/i).flatten
  html.scan(/\ssrcset\s*=\s*["']([^"']*)["']/i).flatten.each do |set|
    refs.concat(set.split(",").map { |s| s.strip.split(/\s+/).first }.compact)
  end
  refs.map { |r| CGI.unescapeHTML(r.strip) }.reject(&:empty?)
end

pages = Dir.glob(File.join(SITE, "**", "*.html")).sort
html_of = pages.to_h { |f| [f, File.read(f, encoding: "UTF-8")] }
ids_of = Hash.new { |h, f| h[f] = ids_in(File.read(f, encoding: "UTF-8")) }
html_of.each { |f, h| ids_of[f] = ids_in(h) }

broken = Hash.new { |h, k| h[k] = [] }  # Seite -> [Problem]
links_from = Hash.new { |h, k| h[k] = Set.new } # Datei -> verlinkte HTML-Dateien
external = Hash.new { |h, k| h[k] = Set.new }   # URL -> Seiten
known_dead = Set.new                            # mit class="link-tot" markierte Links

html_of.each do |file, html|
  page = url_path_for(file)
  html.scan(/<a\s[^>]*>/i).grep(/class\s*=\s*["'][^"']*\blink-tot\b/i).each do |tag|
    known_dead << CGI.unescapeHTML(tag[/href\s*=\s*["']([^"']*)["']/i, 1].to_s.strip)
  end
  refs_in(html).each do |ref|
    next if ref.start_with?("#") && ref.length == 1
    next if ref =~ /\A(mailto|tel|javascript|data):/i

    begin
      uri = URI.parse(ref)
    rescue URI::InvalidURIError
      broken[page] << "ungültige URL: #{ref}"
      next
    end

    if uri.host && uri.host.sub(/\Awww\./, "") != HOST
      external[ref] << page if %w[http https].include?(uri.scheme)
      next
    end

    path = uri.path.to_s
    path = File.join(File.dirname(page.end_with?("/") ? page + "x" : page), path) unless path.empty? || path.start_with?("/")
    path = File.expand_path(path, "/") + (path.end_with?("/") && path != "/" ? "/" : "") unless path.empty?
    target = path.empty? ? file : resolve(path)

    if target.nil?
      next if GENERATED_PREFIXES.any? { |p| path.start_with?(p) }
      broken[page] << "fehlt: #{ref}"
      next
    end

    if uri.fragment && !uri.fragment.empty? && target.end_with?(".html")
      frag = CGI.unescape(uri.fragment)
      broken[page] << "Anker fehlt: #{ref}" unless ids_of[target].include?(frag)
    end

    links_from[file] << target if target.end_with?(".html") && target != file
  end
end

# Erreichbarkeit ab der Startseite (Menü + alle Links)
start = File.join(SITE, "index.html")
reachable = Set[start]
queue = [start]
until queue.empty?
  links_from[queue.shift].each { |t| queue << t if reachable.add?(t) }
end

linked_anywhere = links_from.values.reduce(Set.new, :|)
# redirect pages for old addresses (layout weiterleitung) are meant to be unlinked
redirect = ->(f) { File.read(f, 2000).include?('http-equiv="refresh"') }
orphans = pages.reject { |f| reachable.include?(f) || ORPHAN_OK.include?(url_path_for(f)) || redirect.call(f) }

# --- Ausgabe ---
ok = true
puts "Geprüft: #{pages.size} HTML-Seiten"

if broken.empty?
  puts "✓ Keine toten internen Links"
else
  ok = false
  puts "\n✗ Tote interne Links (#{broken.values.sum(&:size)}):"
  broken.sort.each do |page, probs|
    puts "  #{page}"
    probs.uniq.each { |p| puts "    - #{p}" }
  end
end

if orphans.empty?
  puts "✓ Alle Seiten sind von der Startseite aus erreichbar"
else
  ok = false
  puts "\n✗ Nicht von der Startseite erreichbar (#{orphans.size}):"
  orphans.each do |f|
    note = linked_anywhere.include?(f) ? " (nur von anderen verwaisten Seiten verlinkt)" : " (nirgends verlinkt)"
    puts "  #{url_path_for(f)}#{note}"
  end
end

if CHECK_EXTERNAL
  marked = external.keys.select { |u| known_dead.include?(u) }
  to_check = external.keys - marked
  puts "\nExterne Links prüfen (#{to_check.size}, dazu #{marked.size} als tot markiert 🪦) …"
  dead = {}
  to_check.each_slice(8) do |slice|
    slice.map do |url|
      Thread.new do
        uri = URI.parse(url)
        code = nil
        3.times do
          http = Net::HTTP.new(uri.host, uri.port)
          http.use_ssl = uri.scheme == "https"
          http.open_timeout = http.read_timeout = 15
          req = Net::HTTP::Get.new(uri.request_uri, "User-Agent" => "Mozilla/5.0 (ifsmb.de link check)")
          res = http.request(req)
          code = res.code.to_i
          break unless [301, 302, 303, 307, 308].include?(code) && res["location"]
          uri = URI.join(uri.to_s, res["location"])
        end
        dead[url] = code.to_s if code.nil? || code >= 400
      rescue StandardError => e
        dead[url] = e.class.name
      end
    end.each(&:join)
  end
  if dead.empty?
    puts "✓ Alle externen Links erreichbar"
  else
    puts "! Externe Links mit Problemen (#{dead.size}) – 403/429 sind oft nur Bot-Sperren:"
    dead.sort.each { |url, code| puts "  [#{code}] #{url}\n      auf: #{external[url].to_a.sort.join(', ')}" }
  end
end

exit(ok ? 0 : 1)
