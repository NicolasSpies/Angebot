#!/bin/bash
set -e
set -o pipefail

# Configuration
PORT=5173
BACKEND_PORT=3001
DB_FILE="database.sqlite"

# Get the directory where the script is located
cd "$(dirname "$0")"
ROOT_DIR=$(pwd)

echo "----------------------------------------------------"
echo "🚀 Initializing Angebot Workspace (Stable Mode)..."
echo "----------------------------------------------------"

# 1. Kill any existing processes on the ports
kill_port() {
    local port=$1
    # Check if lsof exists
    if ! command -v lsof >/dev/null 2>&1; then
        echo "⚠️  'lsof' not found. Skipping port cleanup."
        return
    fi

    local pids=$(lsof -ti :$port)
    if [ ! -z "$pids" ]; then
        echo "⚡ Port $port in use. Cleaning up previous processes..."
        for pid in $pids; do
            echo "🔪 Killing PID $pid..."
            kill -9 $pid 2>/dev/null || true
        done
        sleep 2
    fi
}

echo "🧹 Cleaning up work area..."
kill_port $PORT
kill_port $BACKEND_PORT

# 2. Check Dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Dependencies missing. Installing..."
    npm install
fi

# 3. Pre-flight Stability Checks
echo "🔍 Performing System Audit..."

if ! node --check server/index.js; then
    echo "❌ Error: Backend syntax check failed."
    exit 1
fi

if [ ! -f "$DB_FILE" ]; then
    echo "❌ Error: Database file '$DB_FILE' missing."
    exit 1
fi

# Validation Layer
echo "💾 Validating Database Integrity..."
# Ensure we use local sqlite3
SERVICES_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM services WHERE deleted_at IS NULL;" 2>/dev/null || echo "ERROR")
if [ "$SERVICES_COUNT" = "ERROR" ]; then
    echo "❌ Error: Database is corrupted or schema is invalid."
    exit 1
fi
echo "✅ Database Connection: LOCAL OK ($SERVICES_COUNT services found)"

# 4. Starting Backend
echo "📦 Launching Backend Server (localhost:$BACKEND_PORT)..."
# Start backend in a persistent terminal tab
osascript <<EOF || echo "⚠️  Warning: Failed to open Backend tab. Running in background..."
tell application "Terminal"
    activate
    do script "cd '$ROOT_DIR' && TITLE='Angebot Backend' npm run server"
end tell
EOF

# 5. Wait for Backend Health (Deterministic)
echo "⌛ Waiting for Backend Health Check (http://127.0.0.1:$BACKEND_PORT/api/health)..."
MAX_RETRIES=30
COUNT=0
HEALTH_OK=false

while [ $COUNT -lt $MAX_RETRIES ]; do
    # Use 127.0.0.1 to avoid DNS resolution issues for localhost
    RESPONSE=$(curl -sf -m 2 http://127.0.0.1:$BACKEND_PORT/api/health || echo "failure")
    if echo "$RESPONSE" | grep -q '"database":"connected"'; then
        HEALTH_OK=true
        break
    fi
    printf "."
    COUNT=$((COUNT+1))
    sleep 1
done

if [ "$HEALTH_OK" = false ]; then
    echo -e "\n❌ Error: Backend failed to stabilize."
    echo "Possible causes: Port conflict, syntax error, or DB lock."
    exit 1
fi
echo " OK"

# 6. Starting Frontend
echo "🌐 Launching Frontend Dev Server (localhost:$PORT)..."
osascript <<EOF || echo "⚠️  Warning: Failed to open Frontend tab. Running in background..."
tell application "Terminal"
    activate
    tell application "System Events" to keystroke "t" using command down
    delay 1
    do script "cd '$ROOT_DIR' && TITLE='Angebot Frontend' npm run dev" in front window
end tell
EOF

# 7. Final Readiness Wait
echo "⌛ Waiting for Frontend UI..."
COUNT=0
until $(curl -sf -m 2 http://127.0.0.1:$PORT > /dev/null); do
    COUNT=$((COUNT+1))
    if [ $COUNT -gt $MAX_RETRIES ]; then
        echo -e "\n❌ Error: Frontend failed to start."
        exit 1
    fi
    printf "."
    sleep 1
done
echo " OK"

echo "----------------------------------------------------"
echo "✨ WORKSPACE STABILIZED (Strict Local Mode)"
echo "Database: $ROOT_DIR/$DB_FILE"
echo "Backend:  http://localhost:$BACKEND_PORT"
echo "Frontend: http://localhost:$PORT"
echo "----------------------------------------------------"

open "http://localhost:$PORT/dashboard"
exit 0


