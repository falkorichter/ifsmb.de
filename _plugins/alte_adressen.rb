# Keeps the old German addresses alive after the URL folders were renamed to English
# (e.g. /projekte/<name>/ → /projects/<name>/, /kalender/ → /calendar/).
#
# For every page and collection document under one of the new prefixes, this generator adds
# a page at the old address:
#   - HTML pages (…/ or .html) → redirect page (layout `weiterleitung`, `target` = new address)
#   - feeds (.ics, .xml)       → a copy of the feed, because calendar apps and feed readers
#                                can't follow an HTML redirect (e.g. /kalender.ics, /projekte/<name>.ics,
#                                /projekte/<name>/feed.xml, /news/persoenlich/feed.xml)
#
# Hand-written redirect files (layout `weiterleitung`) already live at old addresses and are skipped.
# An old address that is already taken by another page is left alone.
require "set"

module IfsmbAlteAdressen
  # new prefix => old prefix; more specific prefixes first
  PREFIXES = [
    ["/projects/archive/", "/projekte/archiv/"],
    ["/projects/personal/", "/projekte/persoenlich/"],
    ["/project/ideas/", "/projekte/ideen/"],
    ["/projects/", "/projekte/"],
    ["/news/personal/", "/news/persoenlich/"],
    ["/calendar.ics", "/kalender.ics"],
    ["/calendar/", "/kalender/"],
    ["/challenges/", "/herausforderungen/"],
    ["/equipment/", "/ausstattung/"],
    ["/partners/", "/partner/"],
    ["/press/", "/presse/"],
    ["/search/", "/suche/"],
    ["/network/", "/netzwerk/"],
    ["/map/", "/karte/"],
    ["/tags/", "/stichworte/"]
  ].freeze

  def self.alte_adresse(url)
    PREFIXES.each do |neu, alt|
      return alt + url.delete_prefix(neu) if url.start_with?(neu)
    end
    nil
  end

  class Generator < Jekyll::Generator
    safe true
    priority :lowest # after the feed generators (termin_ics.rb, beitrag_feeds.rb)

    def generate(site)
      quellen = site.pages.dup
      site.collections.each_value { |c| quellen.concat(c.docs) if c.write? }
      belegt = quellen.map(&:url).to_set

      quellen.each do |q|
        next if q.data["layout"] == "weiterleitung"

        alt = IfsmbAlteAdressen.alte_adresse(q.url)
        next if alt.nil? || belegt.include?(alt)

        belegt << alt
        site.pages << (html?(q.url) ? weiterleitung(site, alt, q) : kopie(site, alt, q))
      end
    end

    private

    def html?(url)
      url.end_with?("/") || url.end_with?(".html")
    end

    # PageWithoutAFile at the given address (…/ → <dir>/index.html)
    def seite(site, url)
      if url.end_with?("/")
        dir, name = url, "index.html"
      else
        dir, name = File.dirname(url), File.basename(url)
      end
      Jekyll::PageWithoutAFile.new(site, site.source, dir.delete_prefix("/"), name)
    end

    def weiterleitung(site, alt, q)
      page = seite(site, alt)
      page.data.merge!(
        "layout" => "weiterleitung",
        "target" => q.url,
        "target_title" => q.data["title"],
        "search" => false,
        "sitemap" => false
      )
      page.content = ""
      page
    end

    def kopie(site, alt, q)
      page = seite(site, alt)
      page.data.merge!(q.data.reject { |k, _| %w[permalink uuid].include?(k) })
      page.data["sitemap"] = false
      page.data["search"] = false
      page.content = q.content.dup
      page
    end
  end
end
