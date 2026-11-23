#!/usr/bin/env bash
# End-to-end tests of the ➕/✏️ forms with "direct editing" (pull requests via the GitHub API) against a fake GitHub:
# builds the site once, then runs every *.test.js in _tests/e2e/ with Node's built-in test runner in headless Chrome.
#
#   _scripts/test_e2e.sh                     build + all tests
#   _scripts/test_e2e.sh --no-build          use the existing _site/
#   _scripts/test_e2e.sh --test-name-pattern="Foto"   extra arguments go to `node --test`
#   HEADLESS=0 _scripts/test_e2e.sh          watch Chrome while the tests run
#   E2E_LOGS=1 _scripts/test_e2e.sh          print the browser console of every test (default: failed tests only)
#   CHROME=/path/to/chrome _scripts/test_e2e.sh
#
# Needs Node >= 22 (built-in WebSocket) and Google Chrome/Chromium – no npm packages (DEPENDENCIES.md).
set -euo pipefail
cd "$(dirname "$0")/.."

build=1
args=()
for a in "$@"; do
  if [ "$a" = "--no-build" ]; then build=0; else args+=("$a"); fi
done

node_major=$(node -p 'process.versions.node.split(".")[0]')
if [ "$node_major" -lt 22 ]; then
  echo "Node $node_major ist zu alt – die E2E-Tests brauchen Node 22 oder neuer (eingebautes WebSocket)." >&2
  exit 1
fi

if [ "$build" = 1 ]; then
  echo "Baue die Seite (bundle exec jekyll build) …"
  bundle exec jekyll build -q
fi

exec node --test --test-concurrency=1 "${args[@]+"${args[@]}"}" _tests/e2e/*.test.js
