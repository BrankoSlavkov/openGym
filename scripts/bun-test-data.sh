#!/bin/sh
# Fork: fresh copy of ./data for docker-compose.bun-test.yml. Run it with the test stack stopped;
# it replaces data-bun-test/ (never ./data, which is only read).
#
# The copy keeps profiles, passwords, workouts and the session secret, and drops what would let it
# reach the outside world as the real instance:
#   vapid.json      a new key is made at start, so the real devices' push subscriptions cannot be
#                   reached from here (no duplicate rest-timer or reminder notifications)
#   integrations/   no sealed webhook connections
set -eu
cd "$(dirname "$0")/.."
[ -d data ] || { echo "no ./data folder" >&2; exit 1; }
rm -rf data-bun-test
cp -a data data-bun-test
rm -rf data-bun-test/vapid.json data-bun-test/integrations data-bun-test/*.before-* data-bun-test/*.bak
mkdir -p coach-auth-bun-test
grep -qx 'data-bun-test/' .git/info/exclude 2>/dev/null || printf 'data-bun-test/\ncoach-auth-bun-test/\n' >> .git/info/exclude
echo "data-bun-test/ ready ($(du -sh data-bun-test | cut -f1))"
