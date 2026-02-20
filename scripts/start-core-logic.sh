#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# AuraHealth — Phase 2: feature/core-logic
# Form handling, validation, rule-based risk detection
# ─────────────────────────────────────────────────────────────────────────────
#  What this branch adds over main:
#   ✓ Multi-select symptom form (SymptomToggle component)
#   ✓ Rule-based risk scoring (src/services/riskEngine.js)
#       - Hemoglobin < 10  → HIGH anemia risk
#       - Irregular cycles > 3 months → PCOS flag
#       - Severe pain + missed cycle → pregnancy alert
#   ✓ Form validation with bilingual error messages
#   ✓ Input guards for invalid / out-of-range values
#
#  Demonstrate:  Risk tab → enter vitals → see rule-based output
#
#  Usage:
#    chmod +x scripts/start-core-logic.sh
#    ./scripts/start-core-logic.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
source "$(dirname "$0")/_common.sh"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   AuraHealth  ·  Branch: feature/core-logic      ║${NC}"
echo -e "${CYAN}║   Phase 2 — Rule-Based Risk Engine & Forms       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Risk rules active (src/services/riskEngine.js):${NC}"
echo -e "  ${RED}●${NC} Hemoglobin < 10        → HIGH anemia risk"
echo -e "  ${YELLOW}●${NC} Hemoglobin 10–12       → MEDIUM anemia risk"
echo -e "  ${YELLOW}●${NC} Irregular cycles > 3m  → PCOS risk flag"
echo -e "  ${RED}●${NC} Severe pain + no period → Pregnancy alert"
echo ""
echo -e "  ${BOLD}Demo path:${NC} Risk tab → fill vitals → check result"
echo ""

# ── Switch to branch ──────────────────────────────────────────────────────────
echo -e "${YELLOW}Switching to branch: feature/core-logic${NC}"
cd "$ROOT_DIR"

if ! git diff --quiet || ! git diff --staged --quiet; then
    echo -e "${YELLOW}Stashing uncommitted changes...${NC}"
    git stash push -m "auto-stash before switch to feature/core-logic" 2>/dev/null || true
fi

git checkout feature/core-logic
git clean -fd app/ src/ 2>/dev/null || true
echo -e "${GREEN}  ✓ On branch: $(git branch --show-current)${NC}"
echo ""

clear_all_caches "$ROOT_DIR"
ensure_deps "$ROOT_DIR" "Mobile App" "--legacy-peer-deps"

echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Starting Expo — Phase 2: Core Logic${NC}"
echo -e "  Scan QR code with ${BOLD}Expo Go${NC} · Press ${YELLOW}Ctrl+C${NC} to stop"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""

cd "$ROOT_DIR" && npx expo start --lan --clear
