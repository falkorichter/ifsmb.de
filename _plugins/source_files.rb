# Publishes the unprocessed source of every page that has an edit form under /source/<path in the repo>,
# e.g. /source/_posts/2026-11-13-titel.md. The ✏️ button (_includes/edit-buttons.html, assets/js/neu.js)
# loads it on click to fill the form – from our own domain, no request to GitHub.
# The files are copied after the build (no Liquid, no layout) and are not part of site.static_files.
module IfsmbSourceFiles
  # collections with an edit form (same list as _includes/edit-buttons.html)
  COLLECTIONS = %w[posts events projects equipment herausforderungen team press].freeze

  Jekyll::Hooks.register :site, :post_write do |site|
    COLLECTIONS.each do |name|
      collection = site.collections[name]
      next unless collection

      collection.docs.each do |doc|
        target = File.join(site.dest, "source", doc.relative_path)
        FileUtils.mkdir_p(File.dirname(target))
        FileUtils.cp(doc.path, target)
      end
    end
  end
end
