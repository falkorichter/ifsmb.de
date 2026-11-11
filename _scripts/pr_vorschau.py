#!/usr/bin/env python3
"""Preview images for pull requests.

Takes headless-Chrome screenshots of pages from _site/ (desktop 1280 px and
phone 390 px) and uploads them to the `pr-previews` branch – never to the
feature branch. Prints Markdown to paste into the PR description.

    bundle exec jekyll build
    python3 -I _scripts/pr_vorschau.py /team/falko-richter/ /news/
    python3 -I _scripts/pr_vorschau.py --unten /team/falko-richter/   # area above the footer
    python3 -I _scripts/pr_vorschau.py --unten --kontext 400 /news/    # show more content above the footer
    python3 -I _scripts/pr_vorschau.py --nur-lokal /                  # don't upload

Without --unten the top of the page is captured (desktop 1280×900, phone
390×844). Images are also kept in _pr-vorschau/ (in .gitignore).
"""
import argparse, functools, html, http.server, os, re, subprocess, sys, tempfile, threading, urllib.parse
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "_site")
OUT = os.path.join(ROOT, "_pr-vorschau")
CHROME = os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
PREVIEW_BRANCH = "pr-previews"


def git(*args, env=None, input=None):
    return subprocess.run(["git", *args], cwd=ROOT, env=env, input=input, text=True,
                          capture_output=True, check=True).stdout.strip()


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_GET(self):
            # Serve the phone frame from memory, not from _site/ – a running
            # `jekyll serve` rebuilds _site/ as soon as images land in _pr-vorschau/
            url = urllib.parse.urlsplit(self.path)
            if url.path != "/__pr_handy.html":
                return super().do_GET()
            q = urllib.parse.parse_qs(url.query)
            src, h = html.escape(q["src"][0], quote=True), int(q["h"][0])
            # --unten: scroll the framed page to its end, so long pages fit without a huge window
            scroll = ' onload="this.contentWindow.scrollTo({top: 1e9, behavior: \'instant\'})"' if "unten" in q else ""
            body = (f'<body style="margin:0"><iframe src="{src}"{scroll} '
                    f'style="border:0;width:390px;height:{h}px"></iframe>').encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
    handler = functools.partial(Quiet, directory=SITE)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}"


def chrome(url, w, h, scale, dst):
    subprocess.run([CHROME, "--headless=new", "--hide-scrollbars", f"--window-size={w},{h}",
                    f"--force-device-scale-factor={scale}", "--virtual-time-budget=5000", f"--screenshot={dst}", url],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    return Image.open(dst).convert("RGB")


def above_footer(im, scale, kontext=160):
    """Crop the area above the dark footer (the header is dark too -> search from the bottom).

    The window is much taller than the page and the content area stretches down to
    the footer (sticky footer), so long blank stripes are shortened to 80 px to
    keep real content visible above the footer.
    """
    W, H = im.size
    dark = lambda y: all(sum(im.getpixel((x, y))) < 130 for x in range(2, 10 * scale, 2))
    y = H - 1
    while y > 0 and not dark(y):
        y -= 1
    while y > 0 and dark(y - 1):
        y -= 1
    if y <= 0:
        raise SystemExit("Footer nicht gefunden")
    bottom = min(H, y + 60 * scale)
    blank = lambda r: all(lo == hi for lo, hi in im.crop((0, r, W, r + 1)).getextrema())
    keep, run, max_run = [], 0, 80 * scale
    for r in range(bottom - 1, -1, -1):          # collect rows bottom-up
        run = run + 1 if blank(r) else 0
        if run <= max_run:
            keep.append(r)
        if len(keep) >= (kontext + 60) * scale:
            break
    keep.reverse()
    out = Image.new("RGB", (W, len(keep)))
    for i, r in enumerate(keep):
        out.paste(im.crop((0, r, W, r + 1)), (0, i))
    return out


def slug(path):
    return re.sub(r"[^a-z0-9]+", "-", path.lower()).strip("-") or "startseite"


def capture(base, path, unten, tmp, kontext=160):
    # Headless Chrome won't go narrower than ~500 px -> render the phone view in a 390 px iframe
    # --unten: the phone frame scrolls to the page end (Chrome caps screenshots at ~16k device px);
    # desktop is tall enough for long pages (profiles, projects), otherwise the crop would hit the header
    h_mobile = 3000 if unten else 844
    params = {"src": path, "h": h_mobile}
    if unten:
        params["unten"] = 1
    handy = base + "/__pr_handy.html?" + urllib.parse.urlencode(params)
    files = []
    for label, url, w, h, scale, crop_w in [
        ("desktop", base + path, 1280, 10000 if unten else 900, 1, None),
        ("handy", handy, 600, h_mobile, 2, 390),
    ]:
        im = chrome(url, w, h, scale, os.path.join(tmp, "full.png"))
        if crop_w:
            im = im.crop((0, 0, crop_w * scale, im.size[1]))
        if unten:
            im = above_footer(im, scale, kontext)
        name = f"{slug(path)}-{label}.png"
        im.save(os.path.join(OUT, name), optimize=True)  # Pillow saves without metadata
        files.append((path, label, name))
    return files


def upload(branch, names):
    """Commit <branch>/<file> onto pr-previews without a checkout (plumbing)."""
    try:
        git("fetch", "-q", "origin", PREVIEW_BRANCH)
        parent = git("rev-parse", "FETCH_HEAD")
    except subprocess.CalledProcessError:
        parent = None
    with tempfile.TemporaryDirectory() as d:
        env = dict(os.environ, GIT_INDEX_FILE=os.path.join(d, "index"))
        git("read-tree", parent or "--empty", env=env)
        for name in names:
            blob = git("hash-object", "-w", os.path.join(OUT, name))
            git("update-index", "--add", "--cacheinfo", f"100644,{blob},{branch}/{name}", env=env)
        tree = git("write-tree", env=env)
    args = ["commit-tree", tree, "-m", f"PR-Vorschau: {branch}"]
    if parent:
        args[2:2] = ["-p", parent]
    commit = git(*args)
    git("push", "-q", "origin", f"{commit}:refs/heads/{PREVIEW_BRANCH}")
    remote = git("remote", "get-url", "origin")
    repo = re.search(r"github\.com[:/](.+?)(\.git)?$", remote).group(1)
    return f"https://raw.githubusercontent.com/{repo}/{commit}/{branch}"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pfade", nargs="+", help="Seitenpfade, z. B. /team/falko-richter/")
    ap.add_argument("--unten", action="store_true", help="Ausschnitt über dem Footer statt Seitenanfang")
    ap.add_argument("--kontext", type=int, default=160, metavar="PX",
                    help="mit --unten: so viele CSS-Pixel über dem Footer zeigen (Standard 160)")
    ap.add_argument("--nur-lokal", action="store_true", help="nicht hochladen")
    a = ap.parse_args()
    if not os.path.isdir(SITE):
        sys.exit("_site/ fehlt – erst bundle exec jekyll build")
    os.makedirs(OUT, exist_ok=True)
    srv, base = serve()
    files = []
    with tempfile.TemporaryDirectory() as tmp:
        for p in a.pfade:
            files += capture(base, p, a.unten, tmp, a.kontext)
    srv.shutdown()
    for _, _, n in files:
        print("gespeichert:", os.path.join("_pr-vorschau", n), file=sys.stderr)
    if a.nur_lokal:
        return
    branch = git("rev-parse", "--abbrev-ref", "HEAD")
    url = upload(branch, [n for _, _, n in files])
    print("\n## Vorschau\n")
    for p in dict.fromkeys(f[0] for f in files):
        print(f"**`{p}`**\n")
        print("| Desktop | Handy |\n|---|---|")
        cells = [f'<img src="{url}/{n}" alt="{p} ({lab})" width="{600 if lab == "desktop" else 260}">'
                 for pp, lab, n in files if pp == p]
        print("| " + " | ".join(cells) + " |\n")


if __name__ == "__main__":
    main()
