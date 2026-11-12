# iCal files next to the pages, built from the same includes as the feed kalender.ics
# (_includes/ics-kopf.txt, _includes/ics-vevent.txt):
#   /kalender/<name>.ics  one event
#   /projekte/<name>.ics  all events of a project      } same selection as on the page:
#   /team/<name>.ics      all events of a person       } _includes/termine-auswahl.html
#   /partner/<name>.ics   all events of a partner page }
module TerminIcs
  # The CRLF inside the capture becomes `nl`; all other line breaks are stripped by Liquid.
  NL = "{% capture nl %}\r\n{% endcapture -%}\n"

  class Generator < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      events = site.collections["events"]
      return unless events

      events.docs.each do |doc|
        add(site, doc.url, "termin_url" => doc.url, "content" =>
          "{%- assign termin = site.events | where: \"url\", page.termin_url | first -%}\n" \
          "{%- include ics-kopf.txt -%}\n" \
          "{%- include ics-vevent.txt event=termin -%}\n")
      end

      { "projects" => "projects", "team" => "team" }.each do |coll, art|
        next unless site.collections[coll]

        site.collections[coll].docs.each do |doc|
          add(site, doc.url, "res_url" => doc.url, "content" =>
            "{%- assign res = site.#{coll} | where: \"url\", page.res_url | first -%}\n" \
            "{%- include termine-auswahl.html res=res art=\"#{art}\" -%}\n" \
            "{%- include ics-kopf.txt feed=true name=res.title -%}\n" \
            "{%- for e in termine_auswahl -%}{%- include ics-vevent.txt event=e -%}{%- endfor -%}\n")
        end
      end

      Array(site.data["partners"]).each do |pt|
        next unless pt["page"]

        add(site, pt["page"], "res_url" => pt["page"], "partner" => pt["name"], "content" =>
          "{%- assign res = site.pages | where: \"url\", page.res_url | first -%}\n" \
          "{%- include termine-auswahl.html res=res art=\"partner\" partner=page.partner -%}\n" \
          "{%- include ics-kopf.txt feed=true name=page.partner -%}\n" \
          "{%- for e in termine_auswahl -%}{%- include ics-vevent.txt event=e -%}{%- endfor -%}\n")
      end
    end

    private

    # /projekte/foo/ → /projekte/foo.ics
    def add(site, url, data)
      parts = url.split("/").reject(&:empty?)
      name = parts.pop
      page = Jekyll::PageWithoutAFile.new(site, site.source, parts.join("/"), "#{name}.ics")
      content = data.delete("content")
      page.data.merge!(data)
      page.data["layout"] = nil
      page.data["sitemap"] = false
      page.data["suche"] = false
      page.content = NL + content + "END:VCALENDAR{{ nl -}}\n"
      site.pages << page
    end
  end
end
