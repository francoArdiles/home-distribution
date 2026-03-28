#!/bin/bash
cd /home/zeroclaw/.zeroclaw/workspace/zero-projects/home-distribution
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use node
./node_modules/.bin/jest