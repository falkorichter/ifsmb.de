# frozen_string_literal: true

# `same_as` (schema.org sameAs): "this is the same thing as that page on another instance or website" – on partners
# (_data/partners.yml, _data/partner/<name>.yml), equipment (_equipment/) and people (_team/). One absolute https URL
# or a list of them. Used by _includes/microdata.html (<link itemprop="sameAs">), _includes/microdata-info.html
# (the visible „🤖 Maschinenlesbar“ box) and network/graph.json ("same_as": [...]) – so another instance can tell
# that a node in our graph is one of its own pages (incoming links across instances, issue #299).
#
# Complements "same uuid = same thing": same_as needs no shared uuid and also works for partners from _data/
# (they have none).
#
# Liquid filter: {{ page | same_as }} → array of URLs (empty when not set). A partner page (/partners/<name>/, written
# or generated) takes the value of its partner entry (the entry whose `page` is the page's URL), unless the page
# sets its own.
#
# Checked at build time (Generator below): every value must be an absolute https URL – otherwise the build stops
# with a German message. A URL on this site itself is dropped with a warning (a fork that merges our data must not
# fail, and "same as myself" says nothing).
require "uri"

module IfsmbSameAs
  module_function

  # value from front matter / data → array of non-empty strings
  def list(value)
    Array(value).flatten.compact.map { |v| v.to_s.strip }.reject(&:empty?)
  end

  # German problem description for one URL, or nil when it is fine.
  def problem(url)
    uri = begin
      URI.parse(url)
    rescue URI::InvalidURIError
      nil
    end
    return "„#{url}“ ist keine gültige Adresse" unless uri
    return "„#{url}“ muss eine vollständige https-Adresse sein (https://…)" unless uri.is_a?(URI::HTTPS) && uri.host.to_s != ""

    nil
  end

  def own?(url, own_host)
    return false if own_host.to_s.empty?

    URI.parse(url).host.to_s.downcase == own_host.downcase
  rescue URI::InvalidURIError
    false
  end

  def own_host(site)
    URI.parse(site.config["url"].to_s).host
  rescue URI::InvalidURIError
    nil
  end

  # The valid URLs of a value: not on this site itself.
  def urls(value, own_host)
    list(value).reject { |u| problem(u) || own?(u, own_host) }
  end

  # Partner entry whose page is `url` (written or generated partner page), or nil.
  def partner_for(site, url)
    return nil if url.to_s.empty?

    Array(site.data["partners"]).find { |pt| pt.is_a?(Hash) && pt["page"].to_s == url.to_s }
  end

  module Filter
    # {{ page | same_as }} / {{ partner_entry | same_as }} → array of URLs
    def same_as(obj)
      return [] unless obj.respond_to?(:[])

      site = @context.registers[:site]
      value = obj["same_as"]
      if IfsmbSameAs.list(value).empty?
        # a partner page: the value lives in the partner's data entry
        pt = obj["url"] && IfsmbSameAs.partner_for(site, obj["url"])
        value = pt && pt["same_as"]
      end
      IfsmbSameAs.urls(value, IfsmbSameAs.own_host(site))
    end
  end

  # Checks every same_as of the site: invalid → build stops, own site → warning.
  class Check < Jekyll::Generator
    priority :lowest # after IfsmbEinzeldateien and IfsmbPartnerPages

    def generate(site)
      host = IfsmbSameAs.own_host(site)
      problems = []
      check = lambda do |where, value|
        IfsmbSameAs.list(value).each do |u|
          if (p = IfsmbSameAs.problem(u))
            problems << "#{where}: #{p}"
          elsif IfsmbSameAs.own?(u, host)
            Jekyll.logger.warn "same_as:", "#{where}: „#{u}“ zeigt auf diese Website selbst – wird ignoriert"
          end
        end
      end
      Array(site.data["partners"]).each do |pt|
        check.call("Partner „#{pt['name']}“", pt["same_as"]) if pt.is_a?(Hash)
      end
      (site.collections.values.flat_map(&:docs) + site.pages).each do |d|
        check.call(d.relative_path, d.data["same_as"]) if d.data.key?("same_as")
      end
      return if problems.empty?

      raise Jekyll::Errors::FatalException, "Ungültige same_as-Angaben:\n  " + problems.join("\n  ")
    end
  end
end

Liquid::Template.register_filter(IfsmbSameAs::Filter)
