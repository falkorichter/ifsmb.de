# frozen_string_literal: true

# Tests for the UI languages (_data/i18n/de.yml, en.yml, fr.yml – see _plugins/i18n.rb and assets/js/i18n.js):
#   - all three files have exactly the same keys, every value is a non-empty text (or plural forms with "other"),
#     and the placeholders ({name}, {0} …) are the same in every language,
#   - every key the built site uses (data-i18n, data-i18n-attr, ➕ buttons) and every key in the scripts
#     (t("…") in assets/js/ and the edit row) exists,
#   - the German text in the HTML is the one from de.yml (so switching back to German shows the same text),
#   - data-i18n-params is valid JSON.
#
#   ruby _scripts/test_i18n.rb        (after `bundle exec jekyll build`; without _site/ only the files are checked)

require "minitest/autorun"
require "json"
require "yaml"
require "cgi"

ROOT = File.expand_path("..", __dir__)
SITE = File.join(ROOT, "_site")
LANGUAGES = %w[de en fr].freeze
PLURAL_FORMS = %w[zero one two few many other].freeze

module I18nData
  module_function

  def file(language)
    @files ||= {}
    @files[language] ||= YAML.safe_load(File.read(File.join(ROOT, "_data/i18n/#{language}.yml")))
  end

  def plural?(value)
    value.is_a?(Hash) && !value.empty? && (value.keys - PLURAL_FORMS).empty?
  end

  # { "nav.news" => "Neuigkeiten", "activity.events" => { "one" => …, "other" => … }, … }
  def flat(node = nil, prefix = nil, out = {})
    node.each do |key, value|
      full = prefix ? "#{prefix}.#{key}" : key.to_s
      if value.is_a?(Hash) && !plural?(value) then flat(value, full, out) else out[full] = value end
    end
    out
  end

  def strings(language)
    @strings ||= {}
    @strings[language] ||= flat(file(language))
  end

  def placeholders(value)
    texts = plural?(value) ? value.values : [value]
    texts.flat_map { |t| t.to_s.scan(/\{(\w+)\}/).flatten }.uniq.sort
  end

  # German text as _plugins/i18n.rb renders it (plural by n, {name} replaced)
  def german(key, params)
    value = strings("de")[key]
    value = params["n"].to_i == 1 && value["one"] ? value["one"] : value["other"] if plural?(value)
    value.to_s.gsub(/\{(\w+)\}/) { params.key?(Regexp.last_match(1)) ? params[Regexp.last_match(1)].to_s : Regexp.last_match(0) }
  end

  def html_files
    @html_files ||= Dir.glob(File.join(SITE, "**/*.html")).reject { |f| f.include?("/source/") || f.include?("/pagefind/") }
  end
end

class TestI18nFiles < Minitest::Test
  def test_same_keys_in_all_languages
    de = I18nData.strings("de").keys.sort
    (LANGUAGES - ["de"]).each do |language|
      keys = I18nData.strings(language).keys.sort
      assert_empty de - keys, "fehlt in _data/i18n/#{language}.yml"
      assert_empty keys - de, "in _data/i18n/#{language}.yml, aber nicht in de.yml"
    end
  end

  def test_values_are_texts
    LANGUAGES.each do |language|
      I18nData.strings(language).each do |key, value|
        if I18nData.plural?(value)
          assert value.key?("other"), "#{language}: #{key} braucht die Pluralform other"
          value.each { |form, text| assert text.is_a?(String) && !text.strip.empty?, "#{language}: #{key}.#{form} ist leer oder kein Text" }
        else
          assert value.is_a?(String) && !value.strip.empty?, "#{language}: #{key} ist leer oder kein Text (#{value.inspect})"
        end
      end
    end
  end

  def test_same_placeholders
    I18nData.strings("de").each do |key, value|
      expected = I18nData.placeholders(value)
      (LANGUAGES - ["de"]).each do |language|
        other = I18nData.strings(language)[key]
        next unless other

        assert_equal expected, I18nData.placeholders(other), "Platzhalter von #{key} in #{language}.yml"
      end
    end
  end

  # keys the scripts ask for: t("…"), tr("…"), I18n.t("…") and t('…') in the edit row
  def test_script_keys_exist
    files = Dir.glob(File.join(ROOT, "assets/js/*.js")) + [File.join(ROOT, "_includes/edit-buttons.html")]
    used = files.flat_map do |f|
      File.read(f).scan(/\b(?:t|tr|I18n\.t)\(\s*["']([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+)["']/).flatten
    end.uniq
    refute_empty used
    missing = used - I18nData.strings("de").keys
    assert_empty missing, "Schlüssel aus den Skripten fehlen in _data/i18n/de.yml"
  end
end

class TestI18nSite < Minitest::Test
  def setup
    skip "_site/ fehlt – erst `bundle exec jekyll build`" unless File.exist?(File.join(SITE, "index.html"))
  end

  def attributes(tag)
    tag.scan(/([\w-]+)="([^"]*)"/).to_h { |k, v| [k, CGI.unescapeHTML(v)] }
  end

  def test_keys_used_in_site_exist
    keys = I18nData.strings("de")
    missing = Hash.new { |h, k| h[k] = [] }
    I18nData.html_files.each do |f|
      html = File.read(f)
      html.scan(/<[a-z][^>]*\bdata-i18n(?:-attr)?="[^"]*"[^>]*>/i).each do |tag|
        a = attributes(tag)
        used = []
        used << a["data-i18n"] if a["data-i18n"]
        used += a["data-i18n-attr"].split(";").map { |pair| pair.split(":", 2)[1].to_s.strip } if a["data-i18n-attr"]
        used.each { |k| missing[k] << f.sub("#{SITE}/", "") unless keys.key?(k) }
        JSON.parse(a["data-i18n-params"]) if a["data-i18n-params"]
      rescue JSON::ParserError
        flunk "data-i18n-params ist kein JSON in #{f}: #{tag}"
      end
      # ➕ buttons: data-neu carries the key prefix for the form title and hint
      html.scan(/data-neu="([^"]*)"/).flatten.each do |raw|
        prefix = JSON.parse(CGI.unescapeHTML(raw))["i18n"]
        %w[label hint].each { |part| missing["#{prefix}.#{part}"] << f.sub("#{SITE}/", "") unless keys.key?("#{prefix}.#{part}") }
      end
    end
    assert_empty missing.transform_values { |v| v.uniq.first(3) }, "Schlüssel in _site, die in _data/i18n/de.yml fehlen"
  end

  # Elements with plain text: the German in the HTML must be the text from de.yml
  def test_german_text_matches_de_yml
    wrong = []
    I18nData.html_files.each do |f|
      File.read(f).scan(/<([a-z][a-z0-9]*)\b([^>]*\bdata-i18n="([^"]+)"[^>]*)>([^<]*)<\/\1>/i).each do |_, attrs, key, text|
        next unless I18nData.strings("de").key?(key)

        a = attributes("<x #{attrs}>")
        params = a["data-i18n-params"] ? JSON.parse(a["data-i18n-params"]) : {}
        params = params.transform_values { |v| v.is_a?(String) && v.start_with?("@") ? I18nData.german(v[1..], {}) : v }
        expected = I18nData.german(key, params).strip
        actual = CGI.unescapeHTML(text).strip
        wrong << "#{f.sub("#{SITE}/", "")}: #{key} = „#{actual}“, de.yml: „#{expected}“" unless actual == expected
      end
    end
    assert_empty wrong.uniq.first(20), "Deutscher Text im HTML weicht von _data/i18n/de.yml ab"
  end

  def test_strings_file_has_all_languages
    js = File.read(File.join(SITE, "assets/js/i18n-strings.js"))
    data = JSON.parse(js[/\{.*\}/m])
    assert_equal LANGUAGES.sort, data.keys.sort
  end
end
