#!/bin/bash

# Configuration
PORT=5173
BACKEND_PORT=3001
DB_FILE="database.sqlite"

# Get the directory where the script is located
cd "$(dirname "$0")"
ROOT_DIR=$(pwd)

echo "----------------------------------------------------"
echo "🚀 Initializing Angebot Workspace..."
echo "----------------------------------------------------"

# 1. Kill any existing processes on the ports
kill_port() {
    local port=$1
    # Get all PIDs on the port and kill them one by one
    local pids=$(lsof -ti :$port)
    if [ ! -z "$pids" ]; then
        echo "⚡ Port $port in use. Cleaning up previous processes..."
        for pid in $pids; do
            echo "🔪 Killing PID $pid..."
            kill -9 $pid 2>/dev/null
        done
    fi
}

kill_port $PORT
kill_port $BACKEND_PORT

# 2. Check Node environment
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install it to continue."
    exit 1
fi

# Use .nvmrc if it exists (assuming nvm is installed and sourced)
if [ -f ".nvmrc" ] && command -v nvm &> /dev/null; then
    echo "🌿 Using Node version from .nvmrc..."
    nvm use
fi

# 3. Check dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Dependencies missing. Installing... (this may take a minute)"
    npm install || { echo "❌ npm install failed!"; exit 1; }
else
    echo "✅ Dependencies found."
fi

# 4. Pre-flight Stability Checks
echo "🔍 Performing Stability Checks..."

# Verify Backend Syntax
if node --check server/index.js; then
    echo "✅ Backend Syntax: OK"
else
    echo "❌ Error: Backend syntax check failed (server/index.js). Please fix errors before launching."
    exit 1
fi

# Explicit Database Integrity Check
if [ -f "$DB_FILE" ]; then
    echo "✅ Database File Found: OK"
    # Basic check - can we read the tables?
    TABLES=$(sqlite3 "$DB_FILE" ".tables")
    if [[ $TABLES == *"reviews"* ]]; then
        echo "✅ Database Integrity: OK (Core tables found)"
    else
        echo "⚠️  Database Warning: Core tables missing. Server will attempt initialization."
    fi
else
    echo "ℹ️  Database File Not Found. It will be created on first start."
fi

# 5. Open Database Viewer
echo "📂 Opening Database Viewer ($DB_FILE)..."
open "$DB_FILE"

# 6. Start Services in Terminal tabs
echo "🖥️  Opening Terminal tabs..."
osascript <<EOF
tell application "Terminal"
    activate
    
    -- Backend Tab
    set newWin to (do script "cd '$ROOT_DIR' && echo '📦 Starting Backend...' && npm run server")
    
    -- Delay slightly to ensure tabs are created in order
    delay 1
    
    -- Frontend Tab
    tell application "System Events" to keystroke "t" using command down
    delay 0.5
    do script "cd '$ROOT_DIR' && echo '🌐 Starting Frontend...' && npm run dev" in front window
end tell
EOF

echo "⌛ Waiting for services to initialize..."

# 6. Wait for BOTH backend and frontend
for i in {1..30}; do
    FE_UP=false
    BE_UP=false
    
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then FE_UP=true; fi
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null ; then BE_UP=true; fi
    
    if [ "$FE_UP" = true ] && [ "$BE_UP" = true ]; then
        echo "✨ Both services are responsive! Opening browser..."
        open "http://localhost:$PORT"
        
        echo ""
        echo "===================================================="
        echo "✅ SUCCESS: Workspace is UP at http://localhost:$PORT"
        echo "💾 Database: $DB_FILE (opened in viewer)"
        echo "🛑 To stop: run 'Stop Angebot Workspace.command'"
        echo "===================================================="
        exit 0
    fi
    echo "   ...waiting for ports :$PORT and :$BACKEND_PORT ($i/30)"
    sleep 1
done

echo "⚠️  Timeout: Services starting slowly. Please check Terminal tabs for errors."
echo "URL: http://localhost:$PORT"
exit 1


