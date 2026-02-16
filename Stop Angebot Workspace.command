#!/bin/bash

# Configuration
PORT=5173
BACKEND_PORT=3001

# Get the directory where the script is located
cd "$(dirname "$0")"

echo "🛑 Stopping Angebot Workspace..."

# Function to kill process on a port
kill_port() {
    local port=$1
    local pids=$(lsof -ti :$port)
    if [ ! -z "$pids" ]; then
        echo "⚡ Port $port in use. Cleaning up previous processes..."
        for pid in $pids; do
            echo "🔪 Killing PID $pid..."
            kill -9 $pid 2>/dev/null
        done
    else
        echo "✅ Port $port is already free."
    fi
}

kill_port $PORT
kill_port $BACKEND_PORT

echo "----------------------------------------------------"
echo "✅ All services stopped. Ports $PORT and $BACKEND_PORT are free."
echo "----------------------------------------------------"

# Brief pause to show the message
sleep 2
exit
