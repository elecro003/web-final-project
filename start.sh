#!/bin/sh
# Express 백엔드 서버를 백그라운드에서 실행
node /app/server.js &

# Nginx를 포그라운드에서 실행
nginx -g 'daemon off;'