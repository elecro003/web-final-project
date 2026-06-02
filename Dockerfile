# 1단계: React 프론트엔드 빌드
FROM node:18 AS build-stage
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# 2단계: Nginx + Node.js (Express) 단일 컨테이너 세팅
FROM node:18
RUN apt-get update && apt-get install -y nginx

WORKDIR /app
# 백엔드 파일 복사 및 설치
COPY backend/package*.json ./
RUN npm install
COPY backend/ .

# 1단계에서 빌드된 React 결과물을 Nginx 서빙 폴더로 복사
COPY --from=build-stage /app/frontend/dist /usr/share/nginx/html

# Nginx 설정 파일 덮어쓰기 (sites-enabled에 직접 복사하여 즉시 활성화)
COPY nginx.conf /etc/nginx/sites-enabled/default

# 실행 스크립트 복사 및 권한 부여
COPY start.sh /start.sh
RUN chmod +x /start.sh


EXPOSE 80
CMD ["/start.sh"]