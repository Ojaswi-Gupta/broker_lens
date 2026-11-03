"""FastAPI application entrypoint for BrokerLens."""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api.auth import router as auth_router
from app.api.shipments import router as shipments_router
from app.services.seeder import seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for database initialization and realistic customs sample data seeding."""
    # Create all relational tables
    Base.metadata.create_all(bind=engine)
    # Seed database with demo users, 4 full shipments, 12 PDFs, and 60+ edit history logs
    db = SessionLocal()
    try:
        seed_database(db)
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

# Static file serving for generated and uploaded customs documents
static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static"))
os.makedirs(os.path.join(static_dir, "docs"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Include Routers
app.include_router(auth_router)
app.include_router(shipments_router)


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
        "shipments": "/api/shipments",
    }
