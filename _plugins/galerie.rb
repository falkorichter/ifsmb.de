# frozen_string_literal: true

# Markdown galleries.
#
# In Markdown, put images on consecutive lines and mark the paragraph with {: .gallery}:
#
#   ![Alt text 1](/assets/images/news/foo/01.jpg)
#   ![Alt text 2](/assets/images/news/foo/02.jpg)
#   {: .gallery}
#
# Kramdown renders that as <p class="gallery"><img …><img …></p>. After rendering, this hook
# turns it into the gallery markup used by the lightbox in _layouts/default.html:
#
#   <div class="gallery"><a class="lightbox" href="01.jpg"><img src="01-600w.jpg" alt="…" loading="lazy"></a>…</div>
#
# - Thumbnail: "<name>-600w.<ext>" next to the image is used if it exists, otherwise the image itself.
# - A gallery with a single image gets "gallery-single" (unless another size class like gallery-small is set).
# - Every image needs an alt text, otherwise the build stops.
# - Videos: a Markdown image pointing to .mp4/.webm becomes <video class="post-video"> with "<name>.jpg" as poster.
module Galerie
  IMG_RE = /<img\b([^>]*?)\s*\/?>/m.freeze
  ATTR_RE = /([a-zA-Z-]+)="([^"]*)"/.freeze
  GALLERY_RE = %r{<p class="(gallery(?:\s[^"]*)?)">(.*?)</p>}m.freeze
  VIDEO_RE = %r{<p>\s*(<img\b[^>]*?src="[^"]+\.(?:mp4|webm)"[^>]*?/?>)\s*</p>}m.freeze
  SIZE_CLASSES = %w[gallery-single gallery-small].freeze

  module_function

  def attrs(tag)
    tag.scan(ATTR_RE).to_h
  end

  def exists?(site, url)
    path = url.sub(%r{\A#{Regexp.escape(site.config['baseurl'].to_s)}}, '')
    File.exist?(File.join(site.source, path))
  end

  def thumb_for(site, src)
    thumb = src.sub(/(\.[a-zA-Z0-9]+)\z/, '-600w\1')
    exists?(site, thumb) ? thumb : src
  end

  def esc(s)
    s.to_s.gsub('&', '&amp;').gsub('"', '&quot;').gsub('<', '&lt;').gsub('>', '&gt;')
  end

  def gallery(site, doc, classes, inner)
    images = inner.scan(IMG_RE).map { |m| attrs(m[0]) }
    return nil if images.empty? || inner.gsub(IMG_RE, '').strip != ''

    classes = classes.split
    classes << 'gallery-single' if images.size == 1 && (classes & SIZE_CLASSES).empty?
    links = images.map do |a|
      src = a['src']
      alt = a['alt'].to_s
      if alt.strip.empty?
        raise Jekyll::Errors::FatalException, "Galerie: Bild ohne Alt-Text in #{doc.relative_path}: #{src}"
      end
      %(  <a class="lightbox" href="#{src}"><img src="#{thumb_for(site, src)}" alt="#{alt}" loading="lazy"></a>)
    end
    %(<div class="#{classes.uniq.join(' ')}">\n#{links.join("\n")}\n</div>)
  end

  def video(img_tag)
    a = attrs(img_tag)
    src = a['src']
    poster = src.sub(/\.[a-zA-Z0-9]+\z/, '.jpg')
    label = a['alt'].to_s.strip.empty? ? '' : %( aria-label="#{a['alt']}")
    %(<video class="post-video" controls preload="none" playsinline poster="#{poster}" src="#{src}"#{label}></video>)
  end

  def process(doc)
    return unless doc.output && doc.output_ext == '.html' && doc.output.include?('<p')

    site = doc.site
    out = doc.output.gsub(GALLERY_RE) do
      gallery(site, doc, Regexp.last_match(1), Regexp.last_match(2)) || Regexp.last_match(0)
    end
    out = out.gsub(VIDEO_RE) { video(Regexp.last_match(1)) }
    doc.output = out
  end
end

Jekyll::Hooks.register [:pages, :documents], :post_render do |doc|
  Galerie.process(doc)
end
