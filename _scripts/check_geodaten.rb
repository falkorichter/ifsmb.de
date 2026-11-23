#!/usr/bin/env ruby
# frozen_string_literal: true

# Checks image files for embedded GPS / geolocation metadata (EXIF GPSInfo IFD or XMP GPS tags).
# Photos must never be uploaded or published with geolocation coordinates (see CLAUDE.md).
#
# Usage: ruby _scripts/check_geodaten.rb [files …]   (no files = all images in assets/)
# Exit code 1 if any image contains GPS metadata.

ROOT = File.expand_path("..", __dir__)
IMAGE_EXT = %w[.jpg .jpeg .png .webp .tif .tiff .heic .heif .avif].freeze
SKIP_DIRS = %w[_site _logo _pr-vorschau vendor node_modules .git .jekyll-cache].freeze

# Checks a raw TIFF buffer for a non-empty GPSInfo IFD (tag 0x8825).
def tiff_has_gps?(tiff)
  return false if tiff.nil? || tiff.bytesize < 8

  endian = tiff.byteslice(0, 2)
  u16, u32 =
    case endian
    when "II" then %w[v V]
    when "MM" then %w[n N]
    else return false
    end

  magic, ifd_offset = tiff.byteslice(2, 6).unpack("#{u16}#{u32}")
  return false unless magic == 42

  visited = {}
  while ifd_offset && ifd_offset > 0 && ifd_offset + 2 <= tiff.bytesize && !visited[ifd_offset]
    visited[ifd_offset] = true
    count = tiff.byteslice(ifd_offset, 2).unpack1(u16)
    entries_pos = ifd_offset + 2
    return false if entries_pos + count * 12 > tiff.bytesize

    count.times do |i|
      entry = tiff.byteslice(entries_pos + i * 12, 12)
      tag, _type, _cnt, val_offset = entry.unpack("#{u16}#{u16}#{u32}#{u32}")
      next unless tag == 0x8825 # GPSInfo IFD pointer

      return true if val_offset + 2 > tiff.bytesize

      gps_count = tiff.byteslice(val_offset, 2).unpack1(u16)
      return true if gps_count && gps_count > 0
    end

    next_ptr_pos = entries_pos + count * 12
    break if next_ptr_pos + 4 > tiff.bytesize

    ifd_offset = tiff.byteslice(next_ptr_pos, 4).unpack1(u32)
  end

  false
end

# Extracts EXIF TIFF payloads from JPEG, PNG, WebP, or TIFF and checks for GPS data or XMP GPS tags.
def image_has_gps?(path)
  data = File.binread(path)
  return false if data.empty?

  # XMP GPS tags in any container format
  return true if data.match?(/exif:GPS(?:Latitude|Longitude|Position)|<GPS(?:Latitude|Longitude)\b/i)

  # JPEG (\xFF\xD8)
  if data.start_with?("\xFF\xD8".b)
    pos = 2
    while pos + 4 <= data.bytesize && data.getbyte(pos) == 0xFF
      marker = data.getbyte(pos + 1)
      break if marker == 0xDA || marker == 0xD9 # SOS or EOI

      if marker == 0xFF
        pos += 1
        next
      end
      seg_len = data.byteslice(pos + 2, 2).unpack1("n")
      break if seg_len < 2 || pos + 2 + seg_len > data.bytesize

      if marker == 0xE1 # APP1
        payload = data.byteslice(pos + 4, seg_len - 2)
        if payload.start_with?("Exif\0\0".b)
          return true if tiff_has_gps?(payload.byteslice(6..-1))
        end
      end
      pos += 2 + seg_len
    end
    return false
  end

  # PNG (\x89PNG\r\n\x1a\n)
  if data.start_with?("\x89PNG\r\n\x1A\n".b)
    pos = 8
    while pos + 8 <= data.bytesize
      len, type = data.byteslice(pos, 8).unpack("Na4")
      break if pos + 12 + len > data.bytesize

      if type == "eXIf"
        payload = data.byteslice(pos + 8, len)
        payload = payload.byteslice(6..-1) if payload.start_with?("Exif\0\0".b)
        return true if tiff_has_gps?(payload)
      end
      pos += 12 + len
    end
    return false
  end

  # WebP (RIFF....WEBP)
  if data.bytesize >= 12 && data.byteslice(0, 4) == "RIFF".b && data.byteslice(8, 4) == "WEBP".b
    pos = 12
    while pos + 8 <= data.bytesize
      type, len = data.byteslice(pos, 8).unpack("a4V")
      break if pos + 8 + len > data.bytesize

      if type == "EXIF"
        payload = data.byteslice(pos + 8, len)
        payload = payload.byteslice(6..-1) if payload.start_with?("Exif\0\0".b)
        return true if tiff_has_gps?(payload)
      end
      pos += 8 + len + (len.odd? ? 1 : 0)
    end
    return false
  end

  # Raw TIFF
  return true if tiff_has_gps?(data)

  false
end

def image_files(args)
  candidates =
    if args.empty?
      Dir.glob(File.join(ROOT, "assets", "**", "*")).select { |f| File.file?(f) }
         .map { |f| f.delete_prefix("#{ROOT}/") }
    else
      args
    end
  candidates.select do |f|
    IMAGE_EXT.include?(File.extname(f).downcase) &&
      File.file?(File.expand_path(f, ROOT)) &&
      SKIP_DIRS.none? { |d| f == d || f.start_with?("#{d}/") }
  end.sort
end

files = image_files(ARGV)
with_gps = files.select { |rel| image_has_gps?(File.expand_path(rel, ROOT)) }

if with_gps.empty?
  puts "✓ Keine Geokoordinaten in Bildern (#{files.size} Dateien geprüft)"
  exit 0
end

puts "✗ #{with_gps.size} Bild(er) enthalten Geokoordinaten (EXIF-GPS/XMP):"
with_gps.each { |f| puts "  #{f}" }
puts <<~HINT

  Fotos dürfen niemals mit Geokoordinaten hochgeladen oder veröffentlicht werden!
  Bitte Bilder vor dem Speichern mit Pillow ohne Metadaten neu schreiben (siehe CLAUDE.md).
HINT

with_gps.each do |file|
  puts "::error file=#{file}::Foto enthält Geokoordinaten (EXIF-GPS) – bitte ohne Metadaten neu speichern"
end if ENV["GITHUB_ACTIONS"]
exit 1
