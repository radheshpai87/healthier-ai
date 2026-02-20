#!/usr/bin/env bash
# ─────────────────────────────────────────────
# AuraHealth — Start Everything
# ─────────────────────────────────────────────
# Launches all three services at once:
#   1. Backend   (Express + MongoDB)  → http://localhost:3000
#   2. Dashboard (React)              → http://localhost:3001
#   3. Mobile    (Expo Go)            → Expo DevTools
#
# Auto-detects your LAN IP so the phone can
# reach the backend running on your computer.
#
# Usage:
#   chmod +x start-all.sh
#   ./start-all.sh
#
# Stop all: press Ctrl+C (kills all child processes)
# ─────────────────────────────────────────────

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Track child PIDs
PIDS=()

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Shared helpers (kill_port, clear_all_caches, detect_lan_ip, ensure_deps)
source "$ROOT_DIR/scripts/_common.sh"

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       AuraHealth — Starting All Services  ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════╝${NC}"
echo ""

# ── Reset: kill all ports, clear all caches (incl. dashboard) ────────────
# Ensure a completely fresh start every run
if [ ! -f "$ROOT_DIR/dashboard/.env" ] && [ -f "$ROOT_DIR/dashboard/.env.example" ]; then
    cp "$ROOT_DIR/dashboard/.env.example" "$ROOT_DIR/dashboard/.env"
fi
clear_all_caches "$ROOT_DIR" dashboard
detect_lan_ip "$ROOT_DIR"

if [ -z "$LAN_IP" ]; then
    echo -e "${RED}Could not detect LAN IP. Using localhost (won't work on physical phone).${NC}"
    LAN_IP="localhost"
fi

BACKEND_URL="http://${LAN_IP}:3000/api"
echo -e "${GREEN}Detected LAN IP: ${CYAN}${LAN_IP}${NC}"
echo -e "${GREEN}Backend URL:     ${CYAN}${BACKEND_URL}${NC}"
echo ""

# ── Update app.json with current LAN IP ────────
if command -v python3 &>/dev/null; then
    python3 -c "
import json, sys
try:
    with open('${ROOT_DIR}/app.json', 'r') as f:
        config = json.load(f)
    config['expo']['extra']['backendUrl'] = '${BACKEND_URL}'
    with open('${ROOT_DIR}/app.json', 'w') as f:
        json.dump(config, f, indent=2)
        f.write('\n')
    print('  Updated app.json -> backendUrl = ${BACKEND_URL}')
except Exception as e:
    print(f'  Warning: Could not update app.json: {e}', file=sys.stderr)
"
    echo ""
fi

# ── Cleanup on exit ─────────────────────────────
CLEANING_UP=false
cleanup() {
    # Prevent recursive calls (SIGINT + EXIT both fire)
    if $CLEANING_UP; then return; fi
    CLEANING_UP=true

    echo ""
    echo -e "${YELLOW}Shutting down all services...${NC}"

    # Kill tracked child processes gracefully
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill -TERM "$pid" 2>/dev/null
        fi
    done

    # Give processes 3 seconds to exit, then force kill
    sleep 2
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null
        fi
    done

    wait 2>/dev/null
    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM
trap 'if ! $CLEANING_UP; then cleanup; fi' EXIT

# ── Install dependencies ────────────────────────────────────────────────────
ensure_deps "$ROOT_DIR"           "Mobile App" "--legacy-peer-deps"
ensure_deps "$ROOT_DIR/backend"   "Backend"
ensure_deps "$ROOT_DIR/dashboard" "Dashboard"

# ── Check backend .env ──────────────────────────────────────────────────────
if [ ! -f "$ROOT_DIR/backend/.env" ]; then
    echo -e "${RED}ERROR: backend/.env not found!${NC}"
    echo "Copy backend/.env.example to backend/.env and add your MongoDB URI."
    exit 1
fi

# ── Auto-create / update dashboard .env with LAN IP ─────
if [ ! -f "$ROOT_DIR/dashboard/.env" ] && [ -f "$ROOT_DIR/dashboard/.env.example" ]; then
    cp "$ROOT_DIR/dashboard/.env.example" "$ROOT_DIR/dashboard/.env"
    echo -e "  ${GREEN}✓ Created dashboard/.env from .env.example${NC}"
fi

# Always write the current LAN IP into the dashboard .env so
# REACT_APP_API_URL points to the live backend on this machine.
if [ -f "$ROOT_DIR/dashboard/.env" ]; then
    python3 -c "
import re, sys
path = '${ROOT_DIR}/dashboard/.env'
with open(path) as f:
    content = f.read()
new_line = 'REACT_APP_API_URL=${BACKEND_URL}'
if re.search(r'^REACT_APP_API_URL=', content, re.MULTILINE):
    content = re.sub(r'^REACT_APP_API_URL=.*', new_line, content, flags=re.MULTILINE)
else:
    content = content.rstrip('\n') + '\n' + new_line + '\n'
with open(path, 'w') as f:
    f.write(content)
print('  Updated dashboard/.env → REACT_APP_API_URL = ${BACKEND_URL}')
" 2>/dev/null || true
fi

# ── Start Backend (port 3000) ───────────────────
echo -e "${GREEN}[1/3] Starting Backend server (port 3000)...${NC}"
(cd "$ROOT_DIR/backend" && exec node server.js 2>&1 | sed 's/^/  [Backend] /') &
PIDS+=($!)

# Wait for backend to be ready
echo -n "  Waiting for backend"
for i in {1..10}; do
    if curl -s "http://localhost:3000/api/ping" > /dev/null 2>&1; then
        echo ""
        echo -e "  ${GREEN}✓ Backend running → http://${LAN_IP}:3000${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

if ! curl -s "http://localhost:3000/api/ping" > /dev/null 2>&1; then
    echo ""
    echo -e "  ${YELLOW}⚠ Backend may still be starting (MongoDB connection can be slow)${NC}"
fi

# ── Start Dashboard (port 3001) ─────────────────
echo -e "${GREEN}[2/3] Starting Dashboard (port 3001)...${NC}"
(cd "$ROOT_DIR/dashboard" && PORT=3001 BROWSER=none exec npm start 2>&1 | sed 's/^/  [Dashboard] /') &
PIDS+=($!)

echo -e "  ${GREEN}✓ Dashboard starting → http://localhost:3001${NC}"

# ── Start Mobile App (Expo) ────────────────────
echo -e "${GREEN}[3/3] Starting Mobile App (Expo)...${NC}"
echo ""

echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  All services launching!${NC}"
echo ""
echo -e "  ${CYAN}Backend:${NC}    http://${LAN_IP}:3000   (API for mobile app)"
echo -e "  ${CYAN}Dashboard:${NC}  http://localhost:3001   (NGO analytics)"
echo -e "  ${CYAN}Mobile:${NC}     Scan QR code below with Expo Go"
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop all services"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""

# Run Expo in foreground so QR code is visible (--clear resets bundler cache)
cd "$ROOT_DIR" && npx expo start --lan --clear &
PIDS+=($!)

# Wait for any child to exit
wait
