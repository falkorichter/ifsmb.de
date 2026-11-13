# Atom feeds next to the pages, built with _includes/atom-feed.xml (same as /feed.xml):
#   /projekte/<name>/feed.xml   posts with the project's event_tag + manual `updates:`
#                               (same as "Stand / Updates" on the project page)
#   /team/<name>/feed.xml       all posts by the person (`author`), personal ones included
#   /news/persoenlich/feed.xml  all personal posts
# The buttons on the pages come from _includes/feed-abo.html.
module BeitragFeeds
  class Generator < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      if (projects = site.collections["projects"])
        projects.docs.each do |doc|
          add(site, doc.url, "res_url" => doc.url, "content" =>
            "{%- assign res = site.projects | where: \"url\", page.res_url | first -%}\n" \
            "{%- include feed-auswahl.html res=res art=\"projects\" -%}\n" \
            "{%- assign t = res.title | prepend: \"#{site.config['short_title']} – \" -%}\n" \
            "{%- include atom-feed.xml titel=t self=page.url alt=res.url beitraege=feed_auswahl projekt=res -%}\n")
        end
      end

      if (team = site.collections["team"])
        team.docs.each do |doc|
          add(site, doc.url, "res_url" => doc.url, "content" =>
            "{%- assign res = site.team | where: \"url\", page.res_url | first -%}\n" \
            "{%- include feed-auswahl.html res=res art=\"team\" -%}\n" \
            "{%- assign t = res.title | prepend: \"#{site.config['short_title']} – Beiträge von \" -%}\n" \
            "{%- include atom-feed.xml titel=t self=page.url alt=res.url beitraege=feed_auswahl -%}\n")
        end
      end

      add(site, "/news/persoenlich/", "content" =>
        "{%- assign pers = site.posts | where: \"persoenlich\", true -%}\n" \
        "{%- assign t = site.short_title | append: \" – Persönliche Blogs aus dem Team\" -%}\n" \
        "{%- include atom-feed.xml titel=t self=page.url alt=\"/news/persoenlich/\" beitraege=pers -%}\n")
    end

    private

    # /projekte/foo/ → /projekte/foo/feed.xml
    def add(site, url, data)
      dir = url.split("/").reject(&:empty?).join("/")
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "feed.xml")
      page.content = data.delete("content")
      page.data.merge!(data)
      page.data["layout"] = nil
      page.data["sitemap"] = false
      page.data["suche"] = false
      site.pages << page
    end
  end
end
