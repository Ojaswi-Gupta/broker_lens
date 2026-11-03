"""Authentication endpoints and RBAC dependencies for BrokerLens."""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import User
from app.schemas.auth import (
    UserLoginRequest,
    DemoLoginRequest,
    UserResponse,
    TokenResponse,
    UserRole,
)
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication & RBAC"])
security_scheme = HTTPBearer(auto_error=False)

# Seed configurations for demo users specified in client brief
DEMO_USERS_SPEC = [
    {
        "email": "exec@companya-cha.in",
        "password": "DemoExec!2026",
        "full_name": "Rohan Deshmukh",
        "role": "DOCUMENTATION_EXECUTIVE",
    },
    {
        "email": "manager@companya-cha.in",
        "password": "DemoMgr!2026",
        "full_name": "Priya Nair",
        "role": "DOCUMENTATION_MANAGER",
    },
]


def ensure_demo_users(db: Session) -> None:
    """Ensure baseline demo users exist in the database."""
    for spec in DEMO_USERS_SPEC:
        existing = db.query(User).filter(User.email == spec["email"]).first()
        if not existing:
            user = User(
                email=spec["email"],
                full_name=spec["full_name"],
                hashed_password=get_password_hash(spec["password"]),
                role=spec["role"],
                created_at=datetime.utcnow(),
            )
            db.add(user)
    db.commit()


def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Dependency that extracts and validates JWT from Authorization: Bearer <token>."""
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is expired or invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token claims.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User belonging to this token no longer exists.",
        )
    return user


def require_role(allowed_roles: List[UserRole]):
    """RBAC dependency factory enforcing user roles."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}. Your role is '{current_user.role}'.",
            )
        return current_user
    return role_checker


# Convenient pre-configured role dependencies
require_executive = require_role(["DOCUMENTATION_EXECUTIVE", "DOCUMENTATION_MANAGER"])
require_manager = require_role(["DOCUMENTATION_MANAGER"])


@router.post("/login", response_model=TokenResponse)
def login(request: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email and password."""
    ensure_demo_users(db)
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify credentials.",
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/demo-login", response_model=TokenResponse)
def demo_login(request: DemoLoginRequest, db: Session = Depends(get_db)):
    """1-click instant login for reviewers to switch roles (Documentation Executive vs Manager)."""
    ensure_demo_users(db)
    user = db.query(User).filter(User.role == request.role).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Demo user for role '{request.role}' could not be initialized.",
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return profile of currently authenticated user."""
    return UserResponse.model_validate(current_user)
