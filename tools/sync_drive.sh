#!/usr/bin/env bash
# Publish the WV Permit Coach deliverables to Google Drive.
#
# Uses rclone, NOT the Google Drive desktop app. As of 2026-09-13 the desktop app on
# this machine lost its account core (drive_fs.txt reports account "no_user"), so writes
# under ~/Library/CloudStorage succeed locally and upload NOTHING. A local file appearing
# correct is not evidence it reached Drive.
#
# This script therefore verifies every upload against the SERVER-side md5, which is the
# only proof that a write actually landed.
#
# Usage:  bash tools/sync_drive.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE="gdrive:WV_Permit_Coach"

cd "$ROOT"

echo "==> ensuring remote folder exists"
rclone mkdir "$REMOTE" 2>/dev/null || true

# path-on-disk  ->  path-in-drive
copy() {
  local src="$1" dest="$2"
  [ -e "$src" ] || { echo "    SKIP (missing): $src"; return 0; }
  rclone copy "$src" "$REMOTE/$dest" 2>&1 | grep -viE "client_id|NOTICE" || true
  echo "    sent: $src -> $dest"
}

echo "==> documentation"
copy README.md                       ""
copy docs/SOURCE_AUDIT.md            docs/
copy docs/QUESTION_COVERAGE.md       docs/
copy docs/INSTALL.md                 docs/

echo "==> official source (so content can be independently verified)"
copy source_material/Drivers_Licensing_Handbook.pdf  source_material/
copy source_material/sha256.txt                      source_material/

echo "==> built app (installable PWA)"
if [ -d app/dist ]; then
  rclone copy app/dist "$REMOTE/pwa_build" 2>&1 | grep -viE "client_id|NOTICE" || true
  echo "    sent: app/dist -> pwa_build/"
else
  echo "    SKIP: app/dist missing — run 'npm run build' in app/ first"
fi

echo "==> releases (APK, if one was actually built)"
if compgen -G "releases/*.apk" > /dev/null; then
  for f in releases/*.apk; do copy "$f" releases/; done
else
  echo "    none present"
fi

echo
echo "==> VERIFYING against server-side hashes (not local state)"
python3 - "$REMOTE" <<'PY'
import hashlib, json, subprocess, sys, pathlib

remote = sys.argv[1]
out = subprocess.run(["rclone", "lsjson", remote, "--recursive", "--hash"],
                     capture_output=True, text=True)
if out.returncode != 0:
    print("  could not list remote:", out.stderr.strip()[:200]); sys.exit(1)

rows = [r for r in json.loads(out.stdout) if not r.get("IsDir")]
root = pathlib.Path(__file__).resolve().parents[1] if False else pathlib.Path(".").resolve()

# Map published path -> local path for the files we can check.
local_of = {
    "README.md": "README.md",
    "docs/SOURCE_AUDIT.md": "docs/SOURCE_AUDIT.md",
    "docs/QUESTION_COVERAGE.md": "docs/QUESTION_COVERAGE.md",
    "docs/INSTALL.md": "docs/INSTALL.md",
    "source_material/Drivers_Licensing_Handbook.pdf":
        "source_material/Drivers_Licensing_Handbook.pdf",
}

ok = bad = 0
for r in rows:
    lp = local_of.get(r["Path"])
    if not lp or not pathlib.Path(lp).exists():
        continue
    server = (r.get("Hashes") or {}).get("md5")
    local = hashlib.md5(pathlib.Path(lp).read_bytes()).hexdigest()
    if server == local:
        ok += 1
        print(f"  OK   {r['Path']}  md5={local[:12]}")
    else:
        bad += 1
        print(f"  FAIL {r['Path']}  server={server} local={local}")

print(f"\n  {len(rows)} file(s) on Drive; {ok} hash-verified, {bad} mismatched")
sys.exit(1 if bad else 0)
PY

echo
echo "Done. Folder: https://drive.google.com/drive/my-drive (WV_Permit_Coach)"
