# Stage 1: build
FROM node:22-alpine AS builder

# VITE_API_URL 是 build time 變數，預設指向本機後端
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app

# 先裝依賴（利用 layer cache）
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# 複製原始碼並 build
COPY . .
RUN yarn build

# Stage 2: serve
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing：所有路徑都導回 index.html
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
