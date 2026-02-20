#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# AuraHealth — Shared script helpers
# Source this file at the top of every start script:
#   source "$(dirname "$0")/_common.sh"
# ─────────────────────────────────────────────────────────────────────────────

# ── Kill any process occupying a port ────────────────────────────────────────
# Usage: kill_port 8081
kill_port() {
    local port="$1"
    local pids
    pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo -e "  ${YELLOW}⚡ Killing existing process on port $port${NC}"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 0.3
    fi
}

# ── Comprehensive cache + state reset ────────────────────────────────────────
# Usage: clear_all_caches "$ROOT_DIR"          (mobile only)
#        clear_all_caches "$ROOT_DIR" dashboard (mobile + dashboard)
clear_all_caches() {
    local root="$1"
    local include_dashboard="${2:-}"

    echo -e "${YELLOW}Resetting all caches and state...${NC}"

    # ── Kill Expo / Metro ports ───────────────────────────────────────────────
    kill_port 8081   # Metro bundler
    kill_port 19000  # Expo CLI / DevTools
    kill_port 19001  # Expo DevTools alternate
    kill_port 19002  # Expo DevTools UI

    # ── Watchman (file-watcher) ───────────────────────────────────────────────
    if command -v watchman &>/dev/null; then
        watchman watch-del-all 2>/dev/null && \
            echo -e "  ${GREEN}✓${NC} Watchman watch list cleared" || true
    fi

    # ── Expo state directory ──────────────────────────────────────────────────
    rm -rf "$root/.expo" 2>/dev/null || true

    # ── Metro bundler disk cache (node_modules/.cache) ───────────────────────
    rm -rf "$root/node_modules/.cache" 2>/dev/null || true

    # ── Metro / Haste temp files (both /tmp and $TMPDIR) ─────────────────────
    local tmpdir="${TMPDIR:-/tmp}"
    rm -rf /tmp/metro-*                           2>/dev/null || true
    rm -rf /tmp/haste-map-*                       2>/dev/null || true
    rm -rf /tmp/react-native-packager-cache-*     2>/dev/null || true
    rm -rf "${tmpdir}"/metro-*                    2>/dev/null || true
    rm -rf "${tmpdir}"/haste-map-*                2>/dev/null || true
    rm -rf "${tmpdir}"/react-native-packager-*    2>/dev/null || true

    # ── Expo shared state ─────────────────────────────────────────────────────
    rm -rf "$root/.expo-shared" 2>/dev/null || true

    # ── Babel transform cache ─────────────────────────────────────────────────
    rm -rf "$root/.babel_transform_cache" 2>/dev/null || true
    rm -rf "$HOME/.babel.json"            2>/dev/null || true

    # ── Dashboard (React scripts) cache if requested ──────────────────────────
    if [ "$include_dashboard" = "dashboard" ]; then
        kill_port 3000  # Backend (Node)
        kill_port 3001  # Dashboard (React)
        rm -rf "$root/dashboard/node_modules/.cache" 2>/dev/null || true
        echo -e "  ${GREEN}✓${NC} Dashboard cache cleared (ports 3000/3001 freed)"
    fi

    echo -e "  ${GREEN}✓${NC} Expo / Metro / bundler caches cleared"
    echo -e "  ${GREEN}✓${NC} Ports 8081 / 19000-19002 freed"
    echo ""
}

# ── Auto-detect LAN IP ────────────────────────────────────────────────────────
# Sets global variable $LAN_IP and $BACKEND_URL
detect_lan_ip() {
    local root="$1"

    LAN_IP=$(python3 -c "
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.connect(('8.8.8.8', 80))
print(s.getsockname()[0])
s.close()
" 2>/dev/null || true)

    if [ -z "$LAN_IP" ]; then
        LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi

    if [ -z "$LAN_IP" ]; then
        echo -e "${RED}Could not detect LAN IP — using localhost (phone won't reach backend).${NC}"
        LAN_IP="localhost"
    fi

    BACKEND_URL="http://${LAN_IP}:3000/api"

    echo -e "  ${GREEN}LAN IP:      ${CYAN}${LAN_IP}${NC}"
    echo -e "  ${GREEN}Backend URL: ${CYAN}${BACKEND_URL}${NC}"
    echo ""

    # Write into app.json so the mobile app reads the correct URL at runtime
    python3 -c "
import json
try:
    with open('${root}/app.json') as f: cfg = json.load(f)
    cfg['expo']['extra']['backendUrl'] = '${BACKEND_URL}'
    with open('${root}/app.json', 'w') as f:
        json.dump(cfg, f, indent=2); f.write('\n')
    print('  Updated app.json → backendUrl = ${BACKEND_URL}')
except Exception as e:
    print(f'  Warning: could not update app.json: {e}')
" 2>/dev/null || true

    # Write into dashboard/.env
    if [ -f "$root/dashboard/.env" ]; then
        python3 -c "
import re
path = '${root}/dashboard/.env'
with open(path) as f: content = f.read()
new_line = 'REACT_APP_API_URL=${BACKEND_URL}'
if re.search(r'^REACT_APP_API_URL=', content, re.MULTILINE):
    content = re.sub(r'^REACT_APP_API_URL=.*', new_line, content, flags=re.MULTILINE)
else:
    content = content.rstrip('\n') + '\n' + new_line + '\n'
with open(path, 'w') as f: f.write(content)
print('  Updated dashboard/.env → REACT_APP_API_URL = ${BACKEND_URL}')
" 2>/dev/null || true
    fi
}

# ── Install deps if missing ───────────────────────────────────────────────────
# Usage: ensure_deps "$ROOT_DIR" "Mobile App" "--legacy-peer-deps"
ensure_deps() {
    local dir="$1" name="$2" flags="${3:-}"
    if [ ! -d "$dir/node_modules" ]; then
        echo -e "${YELLOW}[$name] node_modules not found — installing...${NC}"
        (cd "$dir" && npm install $flags)
        echo -e "  ${GREEN}✓ [$name] Dependencies installed${NC}"
        echo ""
    fi
}
