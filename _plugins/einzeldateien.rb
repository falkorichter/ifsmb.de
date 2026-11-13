# Some lists in _data/ can also be extended with one file per entry, so the "➕" buttons
# (_includes/neu-buttons.html) can create a new entry as a new file on GitHub:
#
#   _data/partner/<name>.yml        → appended to site.data["partners"]        (partner page, network, map …)
#   _data/pressebericht/<name>.yml  → inserted into site.data["presseberichte"] ("Wir in der Presse"),
#                                     sorted in by `datum` (newest first, entries without a date at the end)
#
# Each file holds one entry with the same fields as an item of the list file.
module IfsmbEinzeldateien
  LISTEN = {
    # directory => [list in _data, field that identifies an entry, field to sort in by (newest first)]
    "partner" => ["partners", "name", nil],
    "pressebericht" => ["presseberichte", "url", "datum"]
  }.freeze

  class Generator < Jekyll::Generator
    priority :highest

    def generate(site)
      LISTEN.each do |ordner, (liste_name, schluessel, datum_feld)|
        einzeln = site.data[ordner]
        next unless einzeln.is_a?(Hash)

        liste = site.data[liste_name]
        liste = site.data[liste_name] = [] unless liste.is_a?(Array)
        einzeln.keys.sort.each do |datei|
          eintrag = einzeln[datei]
          unless eintrag.is_a?(Hash) && eintrag[schluessel].to_s.strip != ""
            Jekyll.logger.warn "Einzeldateien:", "_data/#{ordner}/#{datei}.yml hat kein Feld „#{schluessel}“ – übersprungen"
            next
          end
          next if liste.any? { |e| e.is_a?(Hash) && e[schluessel] == eintrag[schluessel] } # already listed (also on rebuilds)

          einfuegen(liste, eintrag, datum_feld)
        end
      end
    end

    private

    def einfuegen(liste, eintrag, datum_feld)
      datum = datum_feld && eintrag[datum_feld]
      if datum
        # before the first entry with an older date
        pos = liste.index { |e| e.is_a?(Hash) && e[datum_feld] && e[datum_feld].to_s < datum.to_s }
        return liste.insert(pos, eintrag) if pos
      end
      liste << eintrag
    end
  end
end
