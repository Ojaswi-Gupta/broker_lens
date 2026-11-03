"""FastAPI application entrypoint for BrokerLens."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api.auth import router as auth_router, ensure_demo_users


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for database initialization and demo data seeding."""
    # Create tables if not exist
    Base.metadata.create_all(bind=engine)
    # Ensure demo users exist
    db = SessionLocal()
    try:
        ensure_demo_users(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="BrokerLens API",
    description="Customs Broker AI Document Extraction & 3-Way Cross-Check Workbench API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list if settings.cors_origins_list else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)


@app.get("/api/health", tags=["Health"])
def health_check():
    """Health check endpoint for container probes."""
    return {
        "status": "healthy",
        "service": "broker-lens-backend",
        "environment": settings.APP_ENV,
        "region": settings.AWS_REGION,
        "dpdp_compliant": settings.ENABLE_PII_MASKING_BY_DEFAULT,
    }


@app.get("/", tags=["Root"])
def root():
    """Root info endpoint."""
    return {
        "project": "BrokerLens",
        "description": "Customs Broker AI Document Extraction & 3-Way Cross-Check Workbench",
        "docs": "/docs",
        "health": "/api/health",
    }
