from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import decode_access_token
from app.models.entities import User, Workspace, WorkspaceMembership

# Strict OAuth2 scheme - requires valid bearer token on protected routes
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Authenticate user strictly via Bearer token.
    Fails closed with HTTP 401 if token is missing, expired, invalid, or forged.
    Validates that user exists and is active.
    Zero backdoors, zero automatic privileged user creation.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise credentials_exception

    user_id = payload["sub"]
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or disabled",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return user


def get_current_workspace(
    x_workspace_id: Optional[str] = Header(None, alias="X-Workspace-Id"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Workspace:
    """
    Resolves the active workspace strictly through authenticated membership.
    If X-Workspace-Id is provided, enforces that current_user has an active membership record.
    If X-Workspace-Id is omitted, resolves current_user's primary membership.
    Fails closed with HTTP 403 if user has no authorized membership.
    Never falls back to arbitrary global workspaces or creates default workspaces.
    """
    if x_workspace_id:
        membership = db.query(WorkspaceMembership).filter(
            WorkspaceMembership.workspace_id == x_workspace_id,
            WorkspaceMembership.user_id == current_user.id
        ).first()

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: user is not an authorized member of the requested workspace."
            )

        ws = db.query(Workspace).filter(Workspace.id == x_workspace_id).first()
        if not ws:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Requested workspace does not exist."
            )
        return ws

    # No workspace header provided: resolve user's primary membership
    membership = db.query(WorkspaceMembership).filter(
        WorkspaceMembership.user_id == current_user.id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of any workspace. Please create or accept an invitation to a workspace."
        )

    ws = db.query(Workspace).filter(Workspace.id == membership.workspace_id).first()
    if not ws:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated workspace could not be found."
        )

    return ws
