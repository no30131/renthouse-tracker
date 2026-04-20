# Stage 1: build
FROM node:22-alpine AS builder

# build 時燒入 placeholder，runtime 再由 sed 替換成實際 URL
ARG VITE_API_URL=__API_URL__
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

# SPA routing：用 template 讓 nginx 動態讀 $PORT（Zeabur 會注入此變數）
RUN mkdir -p /etc/nginx/templates && printf 'server {\n\
    listen ${PORT};\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/templates/default.conf.template

# 預設 port（本機測試用）
ENV PORT=80
EXPOSE 80

CMD ["/bin/sh", "-c", "envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && find /usr/share/nginx/html -name '*.js' -exec sed -i \"s|__API_URL__|${VITE_API_URL:-http://localhost:8000}|g\" {} \\; && nginx -g 'daemon off;'"]
