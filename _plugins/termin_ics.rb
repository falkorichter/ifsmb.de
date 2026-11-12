# Writes one iCal file per event: /kalender/<name>.ics (next to /kalender/<name>/).
# Reuses _includes/ics-kopf.txt and _includes/ics-vevent.txt, the same as the feed kalender.ics.
module TerminIcs
  class Generator < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      events = site.collections["events"]
      return unless events

      events.docs.each do |doc|
        name = doc.url.split("/").last
        page = Jekyll::PageWithoutAFile.new(site, site.source, "kalender", "#{name}.ics")
        page.data["layout"] = nil
        page.data["sitemap"] = false
        page.data["suche"] = false
        page.data["termin_url"] = doc.url
        # The CRLF inside the capture becomes `nl`; all other line breaks are stripped by Liquid.
        page.content = "{% capture nl %}\r\n{% endcapture -%}\n" \
                       "{%- assign termin = site.events | where: \"url\", page.termin_url | first -%}\n" \
                       "{%- include ics-kopf.txt -%}\n" \
                       "{%- include ics-vevent.txt event=termin -%}\n" \
                       "END:VCALENDAR{{ nl -}}\n"
        site.pages << page
      end
    end
  end
end
