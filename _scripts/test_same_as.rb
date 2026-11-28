# frozen_string_literal: true

# Tests for _plugins/same_as.rb (`same_as`: the same thing on another instance or website, schema.org sameAs):
# normalising, checking (https only, not this site itself), the Liquid filter with the partner lookup – and, after
# `bundle exec jekyll build`, that the built site carries the values (Microdata sameAs, „🤖 Maschinenlesbar“,
# network/graph.json).
#   ruby _scripts/test_same_as.rb   (läuft in „Prüfen“ nach dem Bauen)
require "minitest/autorun"
require "json"
begin
  require "jekyll"
rescue LoadError
  # outside Bundler: the plugin only needs these
  module Jekyll
    module Errors
      class FatalException < StandardError; end
    end
    class Generator
      def self.priority(*) = nil
    end
    def self.logger = @logger ||= Struct.new(:warnings) { def warn(*a) = (self.warnings ||= []) << a.join(" ") }.new
  end
  module Liquid
    class Template
      def self.register_filter(*) = nil
    end
  end
end
require_relative "../_plugins/same_as"

class SameAsTest < Minitest::Test
  ROOT = File.expand_path("..", __dir__)
  SITE_DIR = File.join(ROOT, "_site")
  PEER = "https://35services.ifsmb.de/partners/35-services-e-v/"

  FakeSite = Struct.new(:config, :data, :collections, :pages)
  FakeDoc = Struct.new(:relative_path, :data)
  FakeCollection = Struct.new(:docs)

  def site(partners: [], docs: [])
    FakeSite.new({ "url" => "https://ifsmb.de" }, { "partners" => partners },
                 { "team" => FakeCollection.new(docs) }, [])
  end

  # a template context with the site, like Liquid gives the filter
  class Ctx
    include IfsmbSameAs::Filter
    def initialize(site) = (@context = Struct.new(:registers).new({ site: site }))
  end

  def test_list_accepts_one_value_or_a_list
    assert_equal [PEER], IfsmbSameAs.list(PEER)
    assert_equal [PEER, "https://x.org/"], IfsmbSameAs.list([" #{PEER} ", nil, "", "https://x.org/"])
    assert_equal [], IfsmbSameAs.list(nil)
  end

  def test_only_absolute_https_urls
    assert_nil IfsmbSameAs.problem(PEER)
    refute_nil IfsmbSameAs.problem("http://35services.ifsmb.de/")
    refute_nil IfsmbSameAs.problem("/partners/35services/")
    refute_nil IfsmbSameAs.problem("35services.ifsmb.de/team/")
    refute_nil IfsmbSameAs.problem("https://")
  end

  def test_own_site_is_dropped
    assert IfsmbSameAs.own?("https://IFSMB.de/team/x/", "ifsmb.de")
    refute IfsmbSameAs.own?(PEER, "ifsmb.de")
    assert_equal [PEER], IfsmbSameAs.urls([PEER, "https://ifsmb.de/team/x/", "http://x.org/"], "ifsmb.de")
  end

  def test_check_stops_the_build_on_invalid_values
    s = site(partners: [{ "name" => "A", "same_as" => "http://a.org/" }],
             docs: [FakeDoc.new("_team/b.md", { "same_as" => ["/team/b/"] })])
    err = assert_raises(Jekyll::Errors::FatalException) { IfsmbSameAs::Check.new.generate(s) }
    assert_includes err.message, "Partner „A“"
    assert_includes err.message, "_team/b.md"
  end

  def test_check_accepts_valid_and_own_values
    s = site(partners: [{ "name" => "A", "same_as" => PEER }],
             docs: [FakeDoc.new("_team/b.md", { "same_as" => ["https://ifsmb.de/team/b/"] }), FakeDoc.new("_team/c.md", {})])
    IfsmbSameAs::Check.new.generate(s) # own site: only a warning
  end

  def test_filter_partner_page_takes_the_partner_entry
    s = site(partners: [{ "name" => "35 services e. V.", "page" => "/partners/35services/", "same_as" => PEER }])
    ctx = Ctx.new(s)
    assert_equal [PEER], ctx.same_as({ "url" => "/partners/35services/" })
    assert_equal ["https://x.org/"], ctx.same_as({ "url" => "/partners/35services/", "same_as" => "https://x.org/" })
    assert_equal [], ctx.same_as({ "url" => "/team/nobody/" })
    assert_equal [], ctx.same_as(nil)
  end

  # ---- the built site (skipped without _site/) ----

  def built(path)
    f = File.join(SITE_DIR, path)
    skip "#{path} fehlt – vorher bundle exec jekyll build" unless File.exist?(f)
    File.read(f)
  end

  def test_graph_json_has_same_as
    graph = JSON.parse(built("network/graph.json"))
    pt = graph["nodes"].find { |n| n["type"] == "partner" && n["title"] == "35 services e. V." }
    assert_equal [PEER], pt["same_as"]
    assert_equal 1, graph["version"]
    # nodes without same_as stay as they were
    refute graph["nodes"].find { |n| n["type"] == "beitrag" }.key?("same_as")
  end

  def test_partner_page_microdata_and_box
    html = built("partners/35services/index.html")
    assert_includes html, %(<link itemprop="sameAs" href="#{PEER}">)
    assert_match(/data-i18n="microdata.same_as"/, html)
  end
end
