import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.entities import User, Workspace, WorkspaceMembership
from app.schemas.api_models import UserCreate, UserLogin, UserOut, Token, WorkspaceCreate, WorkspaceOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication & Workspaces"])


@router.post("/register", response_model=Token)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hash_password(user_in.password),
        is_active=True,
    )
    db.add(user)
    db.commit()

    # Create default workspace
    ws_id = str(uuid.uuid4())
    slug = f"ws-{user_in.full_name.lower().replace(' ', '-')[:20]}-{user_id[:4]}"
    ws = Workspace(
        id=ws_id,
        name=f"{user_in.full_name}'s Lab",
        slug=slug,
        owner_id=user_id
    )
    db.add(ws)

    mem = WorkspaceMembership(
        id=str(uuid.uuid4()),
        workspace_id=ws_id,
        user_id=user_id,
        role="owner"
    )
    db.add(mem)
    db.commit()

    token = create_access_token(user_id)
    return Token(
        access_token=token,
        user=UserOut(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            created_at=user.created_at
        )
    )


@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user.id)
    return Token(
        access_token=token,
        user=UserOut(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            created_at=user.created_at
        )
    )


@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        created_at=current_user.created_at
    )


@router.get("/workspaces", response_model=list[WorkspaceOut])
def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    memberships = db.query(WorkspaceMembership).filter(WorkspaceMembership.user_id == current_user.id).all()
    ws_ids = [m.workspace_id for m in memberships]
    workspaces = db.query(Workspace).filter(Workspace.id.in_(ws_ids)).all()
    return [
        WorkspaceOut(
            id=w.id,
            name=w.name,
            slug=w.slug,
            description=w.description,
            owner_id=w.owner_id,
            created_at=w.created_at
        )
        for w in workspaces
    ]
