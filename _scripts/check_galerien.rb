#!/usr/bin/env ruby
# frozen_string_literal: true

# Checks the source files for galleries that are not written in Markdown.
# Galleries must use the Markdown form (see CLAUDE.md, "Bilder und Videos als Markdown"):
#
#   ![Alt text](/assets/images/news/<slug>/01.jpg)
#   ![Alt text](/assets/images/news/<slug>/02.jpg)
#   {: .gallery}
#
# HTML galleries (<div class="gallery">, <a class="lightbox">, WordPress gallery markup) are reported
# with file and line; the exit code is 1 so CI (pull requests and the Pages build) fails.
#
# Usage: ruby _scripts/check_galerien.rb [files …]   (no files = whole repository)

ROOT = File.expand_path("..", __dir__)

# directories that hold templates, generated output or originals – not content
SKIP_DIRS = %w[_site _layouts _includes _plugins _scripts _logo _pr-vorschau assets vendor node_modules .git .github .jekyll-cache].freeze
CONTENT_EXT = %w[.md .markdown .html].freeze

PATTERNS = [
  [/<div\b[^>]*class=["'][^"']*\bgallery\b/i, "HTML-Galerie (<div class=\"gallery\">)"],
  [/<a\b[^>]*class=["'][^"']*\blightbox\b/i, "HTML-Lightbox-Link (<a class=\"lightbox\">)"],
  [/\bwp-block-gallery\b|\bgallery-item\b|\[gallery[\s\]]/i, "WordPress-Galerie"]
].freeze

# documentation that shows HTML on purpose (not published)
SKIP_FILES = %w[CLAUDE.md README.md CHANGELOG.md DATENSTRUKTUR.md].freeze

def content_files(args)
  candidates =
    if args.empty?
      # tracked + new files git knows about (ignores _site, worktrees, .gitignore'd originals …)
      Dir.chdir(ROOT) { `git ls-files --cached --others --exclude-standard`.split("\n") }
    else
      args
    end
  candidates.select do |f|
    CONTENT_EXT.include?(File.extname(f)) && File.file?(File.expand_path(f, ROOT)) &&
      !SKIP_FILES.include?(f) && !f.start_with?(".") &&
      SKIP_DIRS.none? { |d| f == d || f.start_with?("#{d}/") }
  end.sort
end

problems = []
files = content_files(ARGV)
files.each do |rel|
  path = File.expand_path(rel, ROOT)
  File.foreach(path).with_index(1) do |line, no|
    PATTERNS.each do |re, what|
      problems << "#{rel}:#{no}: #{what}" if line.match?(re)
    end
  end
end

if problems.empty?
  puts "✓ Alle Galerien sind Markdown (#{files.size} Dateien geprüft)"
  exit 0
end

puts "✗ #{problems.size} Galerie-Stelle(n) nicht in Markdown:"
problems.each { |p| puts "  #{p}" }
puts <<~HINT

  Galerien bitte als Markdown schreiben – Bilder direkt untereinander, darunter {: .gallery}:

    ![Alt-Text 1](/assets/images/news/<slug>/01.jpg)
    ![Alt-Text 2](/assets/images/news/<slug>/02.jpg)
    {: .gallery}

  Das Plugin _plugins/galerie.rb macht daraus Vorschaubilder und Lightbox (siehe CLAUDE.md).
HINT
# GitHub annotations, so the problems show up directly in the pull request
problems.each do |p|
  file, line, msg = p.split(":", 3)
  puts "::error file=#{file},line=#{line}::Galerie nicht in Markdown:#{msg}"
end if ENV["GITHUB_ACTIONS"]
exit 1
