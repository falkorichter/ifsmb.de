#!/usr/bin/env ruby
# frozen_string_literal: true

# Adds a `uuid:` line to the front matter of every content page that has none yet.
# The UUID identifies the page for the "read" marker (localStorage in the visitor's browser,
# see assets/js/gelesen.js) and stays the same when the file is renamed or moved.
#
# Skipped: overview pages (`suche: false`), redirects (`layout: weiterleitung`), files without a
# layout-rendered HTML output (feeds, JSON, ICS) and everything Jekyll does not build.
#
#   ruby _scripts/uuids_ergaenzen.rb           # add missing UUIDs
#   ruby _scripts/uuids_ergaenzen.rb --pruefen # only check: duplicate UUIDs fail (exit 1),
#                                              # missing ones are only listed (e.g. pages created in Pages CMS)

require "securerandom"
require "yaml"
require "date"

ROOT = File.expand_path("..", __dir__)
Dir.chdir(ROOT)

# Files Jekyll does not render as pages
IGNORIERT = %r{\A(?:_site|_includes|_layouts|_data|_plugins|_scripts|_logo|_internal|_pr-vorschau|node_modules|vendor|\.)}
OHNE_SEITE = %w[README.md CLAUDE.md CHANGELOG.md DATENSTRUKTUR.md LICENSE].freeze

def front_matter(text)
  return nil unless text.start_with?("---\n", "---\r\n")

  ende = text.index(/^---\s*$/, 4)
  return nil unless ende

  daten = YAML.safe_load(text[4...ende], permitted_classes: [Date, Time], aliases: true) || {}
  [daten, ende]
rescue Psych::SyntaxError
  nil
end

def zaehlt?(daten)
  return false if daten["suche"] == false
  return false if daten["layout"] == "weiterleitung"

  !daten["permalink"].to_s.match?(/\.(xml|json|ics|txt|js|css)\z/)
end

def kandidaten
  Dir.glob("**/*.{md,markdown,html}").reject do |p|
    p.match?(IGNORIERT) || OHNE_SEITE.include?(p) || p.start_with?("todo")
  end.sort
end

pruefen = ARGV.include?("--pruefen")
fehlend = []
neu = 0
vergeben = Hash.new { |h, k| h[k] = [] }

kandidaten.each do |pfad|
  text = File.read(pfad)
  fm = front_matter(text)
  next unless fm

  daten, ende = fm
  uuid = daten["uuid"].to_s.strip
  unless uuid.empty?
    vergeben[uuid.downcase] << pfad
    next
  end
  next unless zaehlt?(daten)

  fehlend << pfad
  next if pruefen

  # insert just before the closing "---" so existing fields stay untouched
  zeilenende = text.include?("\r\n") ? "\r\n" : "\n"
  text.insert(ende, "uuid: #{SecureRandom.uuid}#{zeilenende}")
  File.write(pfad, text)
  neu += 1
end

doppelt = vergeben.select { |_, pfade| pfade.size > 1 }
doppelt.each do |uuid, pfade|
  puts "✗ uuid #{uuid} mehrfach vergeben (Datei kopiert?) – in allen Dateien außer einer die uuid-Zeile löschen " \
       "und „ruby _scripts/uuids_ergaenzen.rb“ starten:"
  pfade.each { |p| puts "    #{p}" }
end

if pruefen
  if fehlend.empty?
    puts "✓ Alle Inhaltsseiten haben eine eigene uuid." if doppelt.empty?
  else
    puts "! Ohne uuid (#{fehlend.size}) – keine Gelesen-Markierung; ergänzen mit: ruby _scripts/uuids_ergaenzen.rb"
    fehlend.each { |p| puts "    #{p}" }
  end
else
  puts "uuid ergänzt in #{neu} Datei(en)."
end
exit(doppelt.empty? ? 0 : 1)
