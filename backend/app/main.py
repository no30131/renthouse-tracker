import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, climate, commute, crawler, houses, isochrone, preferences, real_price
from app.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):

    # 確保 admin user 存在於 users 資料表
    try:
        from app.database import SessionLocal
        from app.models.user import User
        db = SessionLocal()
        try:
            existing = db.query(User).filter(User.username == settings.ADMIN_USERNAME).first()
            if not existing:
                db.add(User(username=settings.ADMIN_USERNAME, password_hash=settings.ADMIN_PASSWORD_HASH))
                db.commit()
                logger.info("Admin user seeded into users table.")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Failed to seed admin user: {e}", exc_info=True)

    # 啟動排程爬蟲（需設定 CRAWLER_ENABLED=true）
    scheduler = None
    if settings.CRAWLER_ENABLED:
        from app.scheduler import create_scheduler
        scheduler = create_scheduler()
        scheduler.start()
        from app.crawler_config import CRON
        logger.info("APScheduler 啟動，排程: %s", CRON)

    yield

    if scheduler:
        scheduler.shutdown(wait=False)


app = FastAPI(
    lifespan=lifespan,
    title="RentHouse Tracker API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(preferences.router)
app.include_router(houses.router)
app.include_router(commute.router)
app.include_router(isochrone.router)
app.include_router(climate.router)
app.include_router(real_price.router)
app.include_router(crawler.router)


@app.get("/health")
def health():
    return {"status": "ok"}
