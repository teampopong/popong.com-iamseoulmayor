#!/bin/bash

# Usage:
# ./start_server.sh
#  - run server on port 3000(default)
#
# ./start_server.sh 3001
#  - run server on port 3001
NODE_ENV=production nohup node app.js $1 >> server.log 2>&1 &
