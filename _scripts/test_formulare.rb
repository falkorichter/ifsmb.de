# frozen_string_literal: true

# Tests for the "➕ new" forms (assets/js/neu.js) and the todo format (assets/js/todos.js):
# every file a form can create must
#   - parse as YAML the way Jekyll reads it (front matter or a _data/*.yml file) and keep the values typed in,
#   - fit Pages CMS (.pages.yml): same folder, file name pattern, only known fields, list/scalar,
#     boolean, number, date and select values as the CMS expects them,
#   - only use fields that the matching template in _includes/vorlagen/ documents.
# Also: every ➕ button type has a form, every chip field uses a known autocomplete source,
# and the todo files survive parse → serialize unchanged.
#
#   ruby _scripts/test_formulare.rb      (needs Node; runs in the workflows "Prüfen" and "Pages")

require "minitest/autorun"
require "json"
require "yaml"
require "date"
require "open3"

ROOT = File.expand_path("..", __dir__)

module Daten
  module_function

  def beispiele
    @beispiele ||= begin
      out, err, status = Open3.capture3("node", File.join(ROOT, "_scripts/formulare_beispiele.js"))
      raise "formulare_beispiele.js ist fehlgeschlagen:\n#{err}" unless status.success?
      JSON.parse(out)
    end
  end

  def cms
    @cms ||= YAML.safe_load(File.read(File.join(ROOT, ".pages.yml")))["content"]
  end

  # Jekyll reads front matter with SafeYAML; dates and times become Date/Time objects.
  def lade_yaml(text)
    YAML.safe_load(text, permitted_classes: [Date, Time])
  end

  def front_matter(inhalt)
    m = inhalt.match(/\A---\n(.*?)\n---\n(.*)\z/m) or raise "kein Front Matter:\n#{inhalt}"
    [lade_yaml(m[1]), m[2]]
  end

  # Field names a template documents (also commented-out ones like "#  - image:" are ignored – only top-level keys).
  def vorlage_felder(datei)
    text = File.read(File.join(ROOT, "_includes/vorlagen", datei)).sub(/\{%-?\s*comment\s*-?%\}.*?\{%-?\s*endcomment\s*-?%\}/m, "")
    text.scan(/^([a-z_]+):/).flatten.uniq
  end
end

# Form type → Pages CMS entry (collection or list file) and template.
ZUORDNUNG = {
  "beitrag" => { cms: "posts", vorlage: "beitrag.md" },
  "termin" => { cms: "events", vorlage: "termin.md" },
  "projekt" => { cms: "projects", vorlage: "projekt.md" },
  "projekt-vergangen" => { cms: "projects", vorlage: "projekt-vergangen.md" },
  "geraet" => { cms: "equipment", vorlage: "geraet.md" },
  "herausforderung" => { cms: "herausforderungen", vorlage: "herausforderung.md" },
  "team" => { cms: "team", vorlage: "team.md" },
  "presse" => { cms: "press", vorlage: "presse.md" },
  # one file per partner in _data/partner/ – same fields as an entry of the CMS list file _data/partners.yml
  "partner" => { cms: "partners", vorlage: "partner.yml", ordner: "_data/partner" },
  # not in the CMS – checked against the template only
  "pressebericht" => { cms: nil, vorlage: "pressebericht.yml", ordner: "_data/pressebericht" }
}.freeze

class FormulareTest < Minitest::Test
  def proben = Daten.beispiele["proben"]
  def typen = Daten.beispiele["typen"]

  def cms_eintrag(typ)
    name = ZUORDNUNG.fetch(typ)[:cms] or return nil
    Daten.cms.find { |c| c["name"] == name } or flunk "#{typ}: „#{name}“ fehlt in .pages.yml"
  end

  def daten(probe)
    probe["format"] == "yaml" ? [Daten.lade_yaml(probe["inhalt"]), ""] : Daten.front_matter(probe["inhalt"])
  end

  def test_jede_form_hat_eine_zuordnung
    assert_equal ZUORDNUNG.keys.sort, typen.keys.sort, "Formular-Typen und ZUORDNUNG in diesem Test passen nicht zusammen"
  end

  def test_jeder_neu_button_hat_ein_formular
    buttons = File.read(File.join(ROOT, "_includes/neu-button.html")).scan(/when '([a-z-]+)'/).flatten
    refute_empty buttons
    assert_empty buttons - typen.keys, "➕-Button ohne Formular in assets/js/neu.js"
  end

  def test_chip_felder_nutzen_bekannte_quellen
    typen.each do |typ, t|
      t["felder"].select { |f| f["typ"] == "chips" }.each do |f|
        assert_includes Daten.beispiele["quellen"], f["quelle"], "#{typ}.#{f['name']}: unbekannte Quelle"
      end
    end
  end

  def test_yaml_ist_gueltig_und_behaelt_die_werte
    proben.each do |p|
      felder, text = daten(p)
      assert_kind_of Hash, felder, "#{p['typ']} (#{p['fall']}): kein YAML-Objekt"
      typen[p["typ"]]["felder"].each do |f|
        eingabe = p["werte"][f["name"]]
        next if eingabe.nil? || eingabe == "" || eingabe == [] || eingabe == false
        wert = felder[f["name"]]
        ort = "#{p['typ']} (#{p['fall']}) #{f['name']}"
        case f["typ"]
        when "chips" then assert_equal eingabe, Array(wert), ort
        when "haken" then assert_equal true, wert, ort
        when "zahl" then assert_equal eingabe.to_i, wert, ort
        when "datum" then assert_equal eingabe, wert.to_s, ort
        when "zeit" then assert_equal eingabe.tr("T", " "), wert.is_a?(Time) ? wert.strftime("%Y-%m-%d %H:%M") : wert.to_s[0, 16], ort
        when "langtext" then assert_equal eingabe.rstrip, wert.to_s.rstrip, ort
        else
          eingabe = Array(eingabe).first if wert.is_a?(String)
          assert_equal eingabe, wert.is_a?(Array) ? wert.first : wert, ort
        end
      end
      assert_equal p["werte"]["text"].to_s.strip, text.strip, "#{p['typ']} (#{p['fall']}): Text" if p["format"] == "markdown"
    end
  end

  def test_dateiname_und_ordner
    proben.each do |p|
      ort = "#{p['typ']} (#{p['fall']})"
      endung = p["format"] == "yaml" ? "yml" : "md"
      assert_match(/\A[a-z0-9][a-z0-9-]*\.#{endung}\z/, p["datei"], "#{ort}: Dateiname")
      c = cms_eintrag(p["typ"])
      erwartet = ZUORDNUNG[p["typ"]][:ordner] || c["path"]
      assert_equal erwartet, p["ordner"], "#{ort}: Ordner"
      next unless c && c["type"] == "collection"
      if c["filename"].to_s.start_with?("{year}-{month}-{day}")
        assert_match(/\A\d{4}-\d{2}-\d{2}-/, p["datei"], "#{ort}: Pages CMS erwartet das Datum vorne im Dateinamen")
      else
        refute_match(/\A\d{4}-\d{2}-\d{2}-/, p["datei"], "#{ort}: Pages CMS erwartet kein Datum im Dateinamen")
      end
    end
  end

  def test_passt_zu_pages_cms
    proben.each do |p|
      c = cms_eintrag(p["typ"]) or next
      cms_felder = c["fields"].to_h { |f| [f["name"], f] }
      felder, = daten(p)
      felder.each do |name, wert|
        ort = "#{p['typ']} (#{p['fall']}) #{name}"
        f = cms_felder[name]
        refute_nil f, "#{ort}: Feld fehlt in .pages.yml (#{c['name']}) – dort ergänzen"
        if f["list"]
          assert_kind_of Array, wert, "#{ort}: Pages CMS erwartet eine Liste"
          next
        end
        # several values in a single-value field (e.g. author) are allowed by the site, but only one by the CMS
        next if wert.is_a?(Array) && wert.length > 1
        case f["type"]
        when "boolean" then assert_includes [true, false], wert, ort
        when "number" then assert_kind_of Numeric, wert, ort
        when "select"
          erlaubt = f.dig("options", "values").map { |v| v.is_a?(Hash) ? v["value"] : v }.map(&:to_s)
          assert_includes erlaubt, wert.to_s, "#{ort}: Wert fehlt in options.values von .pages.yml"
        when "date"
          muster = f.dig("options", "time") ? /\A\d{4}-\d{2}-\d{2} \d{2}:\d{2}/ : /\A\d{4}-\d{2}-\d{2}\z/
          text = wert.is_a?(Time) ? wert.strftime("%Y-%m-%d %H:%M") : wert.to_s
          assert_match muster, text, "#{ort}: Datumsformat"
        when "string", "text", "image", "rich-text"
          refute_kind_of Array, wert, "#{ort}: Pages CMS erwartet einen einzelnen Wert"
        end
      end
    end
  end

  def test_nur_felder_aus_der_vorlage
    typen.each do |typ, t|
      erlaubt = Daten.vorlage_felder(ZUORDNUNG.fetch(typ)[:vorlage])
      t["felder"].each do |f|
        assert_includes erlaubt, f["name"], "#{typ}: Feld „#{f['name']}“ steht nicht in _includes/vorlagen/#{ZUORDNUNG[typ][:vorlage]}"
      end
    end
  end

  def test_auswahl_werte_sind_in_der_vorlage_beschrieben
    typen.each do |typ, t|
      # templates of the same CMS collection count together (projekt-vergangen.md only shows "abgeschlossen")
      geschwister = ZUORDNUNG.select { |_, z| z[:cms] && z[:cms] == ZUORDNUNG.fetch(typ)[:cms] }.map { |_, z| z[:vorlage] } | [ZUORDNUNG[typ][:vorlage]]
      vorlage = geschwister.map { |v| File.read(File.join(ROOT, "_includes/vorlagen", v)) }.join("\n")
      t["felder"].select { |f| f["typ"] == "auswahl" }.each do |f|
        zeile = vorlage.scan(/^#{f['name']}:.*$/).join("\n")
        f["optionen"].reject(&:empty?).each do |o|
          assert_includes zeile, o, "#{typ}.#{f['name']}: Wert „#{o}“ fehlt im Kommentar der Vorlage"
        end
      end
    end
  end
end

class TodoFormatTest < Minitest::Test
  # TodoFormat.normal(md) = serialize(parse(md)) must not change a file the app wrote.
  def test_todo_dateien_bleiben_beim_lesen_und_schreiben_gleich
    Dir[File.join(ROOT, "todos/todo-*.md")].each do |datei|
      skript = "const F = require(#{File.join(ROOT, 'assets/js/todos.js').to_json}); " \
               "const md = require('fs').readFileSync(#{datei.to_json}, 'utf8'); " \
               "const n = F.normal(md); process.stdout.write(JSON.stringify({ gleich: F.normal(n) === n, todos: F.parse(n).todos.length }));"
      out, err, status = Open3.capture3("node", "-e", skript)
      assert status.success?, err
      r = JSON.parse(out)
      assert r["gleich"], "#{File.basename(datei)}: parse → serialize ist nicht stabil"
      assert_operator r["todos"], :>, 0, "#{File.basename(datei)}: keine Todos gelesen"
    end
  end
end
