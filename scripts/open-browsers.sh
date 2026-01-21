#!/bin/bash
#
# Open multiple browser windows for testing multiplayer.
# Each window opens in incognito/private mode for separate sessions.
#
# Usage:
#   ./scripts/open-browsers.sh [count] [url]
#
# Examples:
#   ./scripts/open-browsers.sh           # 2 windows to localhost:5173
#   ./scripts/open-browsers.sh 4         # 4 windows
#   ./scripts/open-browsers.sh 3 http://localhost:5173/lobby/ABC123

COUNT=${1:-2}
URL=${2:-"http://localhost:5173"}

echo "Opening $COUNT browser windows to $URL"

# Detect OS and browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS

    # Try Chrome first (most common for dev)
    if [ -d "/Applications/Google Chrome.app" ]; then
        echo "Using Google Chrome (incognito)"
        for i in $(seq 1 $COUNT); do
            # Each incognito window is a separate session
            open -na "Google Chrome" --args --incognito --new-window "$URL"
            sleep 0.3
        done
    # Try Firefox
    elif [ -d "/Applications/Firefox.app" ]; then
        echo "Using Firefox (private)"
        for i in $(seq 1 $COUNT); do
            open -na "Firefox" --args --private-window "$URL"
            sleep 0.3
        done
    # Fall back to Safari
    elif [ -d "/Applications/Safari.app" ]; then
        echo "Using Safari (note: private windows share session)"
        echo "For separate sessions, use Chrome or Firefox"
        for i in $(seq 1 $COUNT); do
            open -a "Safari" "$URL"
            sleep 0.3
        done
    else
        echo "No supported browser found"
        exit 1
    fi

elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v google-chrome &> /dev/null; then
        echo "Using Google Chrome (incognito)"
        for i in $(seq 1 $COUNT); do
            google-chrome --incognito --new-window "$URL" &
            sleep 0.3
        done
    elif command -v firefox &> /dev/null; then
        echo "Using Firefox (private)"
        for i in $(seq 1 $COUNT); do
            firefox --private-window "$URL" &
            sleep 0.3
        done
    else
        echo "No supported browser found (install chrome or firefox)"
        exit 1
    fi

elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows (Git Bash / MSYS)
    echo "Using default browser"
    for i in $(seq 1 $COUNT); do
        start "$URL"
        sleep 0.3
    done
else
    echo "Unsupported OS: $OSTYPE"
    exit 1
fi

echo "Done! $COUNT windows opened."
