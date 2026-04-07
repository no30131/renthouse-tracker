from fastapi import APIRouter, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Depends
from pydantic import BaseModel

from app.auth import verify_password, create_access_token
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends()):
    if form.username != settings.ADMIN_USERNAME or not verify_password(
        form.password, settings.ADMIN_PASSWORD_HASH
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    token = create_access_token({"sub": form.username})
    return TokenResponse(access_token=token)
