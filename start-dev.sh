#!/usr/bin/env bash
# Source nvm using the provided script
source /home/zeroclaw/.zeroclaw/workspace/run_nvm.sh
# Use the Node.js version specified in .nvmrc if exists, otherwise default
if [ -f .nvmrc ]; then
  nvm use
else
  nvm use node
fi
# Start Vite dev server listening on 0.0.0.0
echo "Starting home-distribution dev server on 0.0.0.0:3000..."
npm run dev -- --host 0.0.0.0 &
# Save the PID
echo $! > /tmp/home-distribution-dev.pid
echo "Dev server started with PID $(cat /tmp/home-distribution-dev.pid)"