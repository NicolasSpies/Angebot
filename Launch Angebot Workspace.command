#!/bin/bash

# Get the directory where the script is located
cd "$(dirname "$0")"
ROOT_DIR=$(pwd)

echo "🚀 Launching Angebot Workspace..."

# Use a heredoc for AppleScript to avoid complex quote escaping
osascript <<EOF
tell application "Terminal"
    activate
    do script "cd '$ROOT_DIR' && echo '📦 Starting Backend...' && npm run server"
    do script "cd '$ROOT_DIR' && echo '🌐 Starting Frontend...' && npm run dev"
end tell
EOF

echo "✨ Services initiated in new Terminal windows."
echo "Please wait a few seconds, then open: http://localhost:5173"
sleep 3
exit
