#!/usr/bin/env bash
PID_FILE="/tmp/home-distribution-dev.pid"
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p "$PID" > /dev/null; then
    echo "Stopping dev server (PID $PID)..."
    kill "$PID"
    # Wait a bit for process to terminate
    sleep 1
    if ps -p "$PID" > /dev/null; then
      echo "Process did not terminate gracefully, forcing..."
      kill -9 "$PID"
    fi
    echo "Dev server stopped."
  else
    echo "No running process found with PID $PID."
  fi
  rm -f "$PID_FILE"
else
  echo "PID file not found at $PID_FILE. Is the dev server running?"
fi