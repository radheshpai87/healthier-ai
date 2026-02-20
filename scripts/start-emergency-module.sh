#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# AuraHealth — Phase 4: feature/emergency-module
# Emergency button, GPS, intensity classification, SMS simulation
# ─────────────────────────────────────────────────────────────────────────────
#  What this branch adds over feature/local-storage:
#   ✓ Emergency panic button on Home screen
#   ✓ expo-location integration (GPS fetch with fallback)
#       - Tries lastKnownPosition first (instant)
#       - Falls back to getCurrentPosition (20 s timeout)
#       - Low-accuracy retry at 15 s if high-accuracy fails
#   ✓ Emergency intensity classifier (src/services/emergencyService.js):
#       - SEVERE symptoms  → HIGH   { action: "Call 112" }
#       - MODERATE         → MEDIUM { action: "Contact ASHA" }
#       - Otherwise        → LOW    { action: "Monitor at home" }
#   ✓ SMS simulation function (mock, log-only in dev)
#   ✓ Emergency contacts stored in SecureStore
#   ✓ Works fully OFFLINE — no internet required
#
#  Demonstrate:  Home → Emergency button → select severity → see level + action
#
#  Usage:
#    chmod +x scripts/start-emergency-module.sh
#    ./scripts/start-emergency-module.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
source "$(dirname "$0")/_common.sh"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   AuraHealth  ·  Branch: feature/emergency-module║${NC}"
echo -e "${CYAN}║   Phase 4 — Offline Emergency SOS Module         ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Emergency intensity classifier output:${NC}"
echo -e "  ${RED}HIGH  ${NC}→ SEVERE  symptoms  → Call 112 immediately"
echo -e "  ${YELLOW}MEDIUM${NC}→ MODERATE symptoms → Contact ASHA worker"
echo -e "  ${GREEN}LOW   ${NC}→ Mild/none          → Monitor at home"
echo ""
echo -e "  ${BOLD}GPS strategy:${NC} lastKnown → getCurrentPos (20s) → Low-accuracy (15s)"
echo -e "  ${BOLD}SMS:${NC} Mock simulation (console log) — offline safe"
echo ""
echo -e "  ${BOLD}Demo path:${NC} Home → red SOS button → pick severity → check result"
echo ""

echo -e "${YELLOW}Switching to branch: feature/emergency-module${NC}"
cd "$ROOT_DIR"

if ! git diff --quiet || ! git diff --staged --quiet; then
    git stash push -m "auto-stash before switch to feature/emergency-module" 2>/dev/null || true
fi

git checkout feature/emergency-module
git clean -fd app/ src/ 2>/dev/null || true
echo -e "${GREEN}  ✓ On branch: $(git branch --show-current)${NC}"
echo ""

clear_all_caches "$ROOT_DIR"
ensure_deps "$ROOT_DIR" "Mobile App" "--legacy-peer-deps"

echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Starting Expo — Phase 4: Emergency Module${NC}"
echo -e "  Scan QR code with ${BOLD}Expo Go${NC} · Press ${YELLOW}Ctrl+C${NC} to stop"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""

cd "$ROOT_DIR" && npx expo start --lan --clear
