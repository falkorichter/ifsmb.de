# Publishes the unprocessed source of every page that has an edit form under /source/<path in the repo>
# (collections below, plain pages with `layout: page` via edit_form),
# e.g. /source/_posts/2026-11-13-titel.md. The ✏️ button (_includes/edit-buttons.html, assets/js/neu.js)
# loads it on click to fill the form – from our own domain, no request to GitHub.
# The files are copied after the build (no Liquid, no layout) and are not part of site.static_files.
module IfsmbSourceFiles
  # collections with an edit form (same list as _includes/edit-buttons.html)
  COLLECTIONS = %w[posts events projects equipment challenges team press].freeze
  # data files edited from the site itself (slogan editor: _includes/slogan-editor.html)
  DATA_FILES = %w[_data/slogans.yml].freeze

  # Pages outside the collections get a form too (#154): every real file with `layout: page` (or `default`, the
  # start page) – Markdown pages
  # (partners/<name>/index.md, angebot/ …) the form "seite", HTML overview pages (team/, partners/ …) "uebersicht".
  # page.edit_form tells _includes/edit-buttons.html which one; generated pages have no file and get none.
  # `edit_form: false` in the front matter keeps a page on GitHub's editor (e.g. /mitmachen/offen/, mostly JS).
  # HTML sources are published as <path>.txt (page.edit_source): as .html they would be pages of their own – found
  # by the link check, indexed by Pagefind, opened with raw Liquid.
  PAGE_FORMS = { ".md" => "seite", ".markdown" => "seite", ".html" => "uebersicht" }.freeze
  # `page` for ordinary pages, `default` for the start page (index.html)
  FORM_LAYOUTS = %w[page default].freeze

  def self.source_path(relative_path)
    File.extname(relative_path) == ".html" ? "#{relative_path}.txt" : relative_path
  end

  def self.page_form(site, page)
    return nil unless page.instance_of?(Jekyll::Page) && FORM_LAYOUTS.include?(page.data["layout"])
    return nil if page.data.key?("edit_form")
    return nil unless File.file?(File.join(site.source, page.relative_path))

    PAGE_FORMS[File.extname(page.relative_path)]
  end

  Jekyll::Hooks.register :site, :post_read do |site|
    site.pages.each do |page|
      form = page_form(site, page)
      next unless form

      page.data["edit_form"] = form
      page.data["edit_source"] = source_path(page.relative_path)
    end
  end

  Jekyll::Hooks.register :site, :post_write do |site|
    site.pages.each do |page|
      next unless page.data["edit_form"] && page.data["edit_source"]

      target = File.join(site.dest, "source", page.data["edit_source"])
      FileUtils.mkdir_p(File.dirname(target))
      FileUtils.cp(File.join(site.source, page.relative_path), target)
    end

    COLLECTIONS.each do |name|
      collection = site.collections[name]
      next unless collection

      collection.docs.each do |doc|
        target = File.join(site.dest, "source", doc.relative_path)
        FileUtils.mkdir_p(File.dirname(target))
        FileUtils.cp(doc.path, target)
      end
    end

    DATA_FILES.each do |path|
      source = File.join(site.source, path)
      next unless File.exist?(source)

      target = File.join(site.dest, "source", path)
      FileUtils.mkdir_p(File.dirname(target))
      FileUtils.cp(source, target)
    end
  end
end
