#!/bin/sh

# Render는 $PORT 환경 변수를 통해 포트를 지정합니다. 
# Nginx 설정 파일에서 80 포트를 $PORT로 교체합니다.
# 만약 $PORT가 없으면 기본값 80을 사용합니다.
LISTEN_PORT=${PORT:-80}
sed -i "s/listen 80;/listen ${LISTEN_PORT};/g" /etc/nginx/sites-enabled/default

echo "🌐 Nginx will listen on port: ${LISTEN_PORT}"

# Express 백엔드 서버를 백그라운드에서 실행
# 로그를 출력하여 디버깅을 돕습니다.
node /app/server.js &

# Nginx를 포그라운드에서 실행
nginx -g 'daemon off;'