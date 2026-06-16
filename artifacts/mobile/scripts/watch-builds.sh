#!/bin/bash
cd "$(dirname "$0")/.."
export EXPO_TOKEN="${EXPO_TOKEN:-$(grep -oP '(?<=EXPO_TOKEN=)[^\s'"'"']+' ../../.replit 2>/dev/null | head -1)}"
APK_ID="d88f51c1-a692-4cc6-8e3d-b86669635c51"
AAB_ID="1c837e43-2c23-4c26-8c19-0f61725d45a4"
echo "=== Monitoring EAS Android builds (audit + referral fixes) ==="
echo "APK (preview):    https://expo.dev/accounts/afuapp/projects/afuchat/builds/$APK_ID"
echo "AAB (production): https://expo.dev/accounts/afuapp/projects/afuchat/builds/$AAB_ID"
watch_build() {
  local ID=$1 LABEL=$2
  while true; do
    RAW=$(EAS_NO_VCS=1 EXPO_TOKEN=$EXPO_TOKEN node_modules/.bin/eas build:view "$ID" --json 2>&1)
    OUT=$(echo "$RAW" | python3 -c "import sys,re,json; m=re.search(r'\{.*\}',sys.stdin.read(),re.DOTALL); print(m.group() if m else '')" 2>/dev/null || echo "")
    STATUS=$(echo "$OUT" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['status'])" 2>/dev/null || echo "IN_PROGRESS")
    ARTIFACT=$(echo "$OUT" | python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('artifacts',{}).get('buildUrl','none'))" 2>/dev/null || echo "none")
    echo "$(date -u +%H:%M:%S) [$LABEL] status=$STATUS artifact=$ARTIFACT"
    if [ "$STATUS" = "FINISHED" ] || [ "$STATUS" = "ERRORED" ] || [ "$STATUS" = "EXPIRED" ] || [ "$STATUS" = "CANCELLED" ]; then
      echo "=== [$LABEL] FINAL: $STATUS — $ARTIFACT ==="
      break
    fi
    sleep 60
  done
}
watch_build "$APK_ID" "APK" &
watch_build "$AAB_ID" "AAB" &
wait
echo "=== Both builds finished ==="
