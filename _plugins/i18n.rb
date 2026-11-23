# UI languages: the strings of the site chrome live in _data/i18n/<language>.yml (de, en, fr; keys in English).
# German is rendered into the HTML at build time, so visitors without JavaScript and search engines see the page as
# before. assets/js/i18n.js swaps in English or French in the browser, using the data-i18n attributes next to the
# German text and assets/js/i18n-strings.js (all three files as one object).
#
# Liquid filters:
#   {{ "nav.news" | t }}                          German text of a key (HTML-escaped); the build stops if it is missing
#   {{ "activity.events" | t: "n", 3 }}           with parameters {n}; a value { one: …, other: … } picks by n
#   {{ "projects.ideas_intro" | t_html: link }}   {0}, {1} … replaced by HTML (the element's children, in order) –
#                                                 the browser keeps those children and puts them where the
#                                                 other language has its {0}, {1} …
#   {{ "n" | i18n_params: 3, "up", 1 }}           JSON for data-i18n-params (HTML-escaped)
#   {{ post.date | i18n_date }}                   <time datetime="2026-11-21" data-i18n-date>21.11.2026</time>
#
# _scripts/test_i18n.js checks that all three files have the same keys and that every key used in _site exists.
require "cgi"
require "json"

module IfsmbI18n
  LANGUAGES = %w[de en fr].freeze

  def self.lookup(site, language, key)
    data = site.data.dig("i18n", language)
    return nil unless data

    key.to_s.split(".").reduce(data) { |node, part| node.is_a?(Hash) ? node[part] : nil }
  end

  def self.pairs(params)
    params.each_slice(2).to_h { |k, v| [k.to_s, v] }
  end

  module Filters
    def t(key, *params)
      site = @context.registers[:site]
      value = IfsmbI18n.lookup(site, "de", key)
      raise ArgumentError, "i18n: Schlüssel „#{key}“ fehlt in _data/i18n/de.yml" if value.nil?

      vars = IfsmbI18n.pairs(params)
      if value.is_a?(Hash)
        raise ArgumentError, "i18n: „#{key}“ braucht one/other" unless value.key?("other")

        value = vars["n"].to_i == 1 && value.key?("one") ? value["one"] : value["other"]
      end
      text = value.to_s.gsub(/\{(\w+)\}/) { vars.key?(Regexp.last_match(1)) ? vars[Regexp.last_match(1)].to_s : Regexp.last_match(0) }
      CGI.escapeHTML(text)
    end

    def t_html(key, *children)
      t(key).gsub(/\{(\d+)\}/) { children[Regexp.last_match(1).to_i].to_s.strip }
    end

    def i18n_params(first_key, *rest)
      CGI.escapeHTML(JSON.generate(IfsmbI18n.pairs([first_key] + rest)))
    end

    def i18n_date(input)
      return "" if input.nil? || input == ""

      iso = date(input, "%Y-%m-%d")
      %(<time datetime="#{iso}" data-i18n-date>#{date(input, "%d.%m.%Y")}</time>)
    end
  end
end

Liquid::Template.register_filter(IfsmbI18n::Filters)
