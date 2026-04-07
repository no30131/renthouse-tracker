FROM python:3.13-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 安裝 uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /src

# 複製依賴定義並安裝
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# 安裝 Playwright Chromium 及其系統依賴
RUN uv run playwright install --with-deps chromium

# 複製應用程式碼
COPY . .

RUN chmod +x start.sh

ENV PORT=8080
EXPOSE 8080

CMD ["./start.sh"]
