from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User, Role
from app.schemas.user import (
    UserCreate, UserLogin, UserResponse, RoleResponse,
    UserUpdate, UserStatusUpdate, UserData, RoleCreate,
    RoleUpdate, RoleStatusUpdate
)
from app.core.security import hash_password, verify_password, create_access_token


# ----------------------------- AUTHENTICATION ---------------------------------

def register_user(db: Session, user: UserCreate):
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    existing_email = db.query(User).filter(User.email == user.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed = hash_password(user.password)

    new_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed,
        role_name="Viewer",  # All registrations from outside default to Viewer
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "success": True,
        "message": "User registered successfully",
        "user": new_user
    }


def login_user(db: Session, user: UserLogin):
    db_user = db.query(User).filter(User.username == user.username).first()

    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"sub": db_user.username, "role": db_user.role_name})
    return {
        "access_token": token,
        "token_type": "bearer",
        "success": True,
        "user": db_user
    }


# ----------------------------- ADMIN USER MANAGEMENT -----------------------------

def get_users(db: Session, skip: int = 0, limit: int = 100):
    users = db.query(User).offset(skip).limit(limit).all()

    user_list = []
    for user in users:
        role_name = user.role_name or (
            db.query(Role).filter(Role.id == user.role_id).first().role_name
            if user.role_id else "Viewer"
        )

        user_list.append(UserData(
            id=user.id,
            username=user.username,
            mobile_number=user.mobile_number,
            email=user.email,
            role_id=user.role_id,
            role_name=role_name,
            is_active=user.is_active,
            created_at=user.created_at
        ))

    return {
        "success": True,
        "users": user_list,   # You might want to use UserListResponse for API consistency
        "total": len(user_list)
    }

def get_user_by_id(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role_name = user.role_name or (
        db.query(Role).filter(Role.id == user.role_id).first().role_name
        if user.role_id else "Viewer"
    )

    return {
        "success": True,
        "user": UserResponse(
            id=user.id,
            username=user.username,
            mobile_number=user.mobile_number,
            email=user.email,
            role_id=user.role_id,
            role_name=role_name,
            is_active=user.is_active,
            created_at=user.created_at
        )
    }


def create_user(db: Session, user: UserCreate):
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    existing_email = db.query(User).filter(User.email == user.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")

    role = db.query(Role).filter(Role.id == user.role_id).first()
    if not role:
        raise HTTPException(status_code=400, detail="Invalid role")

    hashed_password = hash_password(user.password)
    db_user = User(
        username=user.username,
        mobile_number=user.mobile_number,
        email=user.email,
        hashed_password=hashed_password,
        role_id=user.role_id,
        role_name=role.role_name,
        is_active=True
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return {
        "success": True,
        "message": "User created successfully",
        "user": db_user
    }


def update_user(db: Session, user_id: int, user_data: UserUpdate):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_data.email:
        existing_email = db.query(User).filter(
            User.email == user_data.email, User.id != user_id
        ).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already exists")

    update_data = user_data.dict(exclude_unset=True)

    if "password" in update_data and update_data["password"]:
        db_user.hashed_password = hash_password(update_data.pop("password"))

    for field, value in update_data.items():
        setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)

    return {"success": True, "message": "User updated successfully", "user": db_user}


def delete_user(db: Session, user_id: int):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.is_active = False
    db.commit()
    return {"success": True, "message": "User deactivated successfully"}


def toggle_user_status(db: Session, user_id: int, status_data: UserStatusUpdate):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.is_active = status_data.is_active
    db.commit()
    db.refresh(db_user)
    return {
        "success": True,
        "message": f"User {'activated' if status_data.is_active else 'deactivated'} successfully"
    }


# ----------------------------- ROLE MANAGEMENT ---------------------------------

def get_roles(db: Session):
    """
    Original function - Get all roles without pagination
    """
    roles = db.query(Role).all()
    role_list = [
        RoleResponse(
            id=role.id,
            role_name=role.role_name,
            description=role.description,
            is_active=role.is_active,
            created_at=role.created_at
        )
        for role in roles
    ]
    return {"success": True, "roles": role_list}

def get_roles_with_pagination(db: Session, skip: int = 0, limit: int = 100):
    """
    New function - Get roles with pagination
    """
    roles = db.query(Role).offset(skip).limit(limit).all()
    total = db.query(Role).count()
    
    return {
        "success": True,
        "roles": roles,
        "total": total
    }

def get_role_by_id(db: Session, role_id: int):
    """
    Get a specific role by ID
    """
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    return {
        "success": True,
        "role": role
    }


def create_role(db: Session, role_data: RoleCreate):
    """
    Create a new role
    """
    # Check if role name already exists
    existing_role = db.query(Role).filter(Role.role_name == role_data.role_name).first()
    if existing_role:
        raise HTTPException(status_code=400, detail="Role name already exists")

    # Create new role - use is_active from data or default to True
    db_role = Role(
        role_name=role_data.role_name,
        description=role_data.description,
        is_active=getattr(role_data, 'is_active', True)  # Safe way to get is_active
    )

    db.add(db_role)
    db.commit()
    db.refresh(db_role)

    return {
        "success": True,
        "message": "Role created successfully",
        "role": db_role
    }


def update_role(db: Session, role_id: int, role_data: RoleUpdate):
    """
    Update an existing role
    """
    db_role = db.query(Role).filter(Role.id == role_id).first()
    if not db_role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Check if new role name conflicts with existing roles (excluding current role)
    if role_data.role_name and role_data.role_name != db_role.role_name:
        existing_role = db.query(Role).filter(
            Role.role_name == role_data.role_name,
            Role.id != role_id
        ).first()
        if existing_role:
            raise HTTPException(status_code=400, detail="Role name already exists")

    # Update fields
    update_data = role_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_role, field, value)

    db.commit()
    db.refresh(db_role)

    return {
        "success": True,
        "message": "Role updated successfully",
        "role": db_role
    }


def delete_role(db: Session, role_id: int):
    """
    Soft delete a role by setting is_active to False
    """
    db_role = db.query(Role).filter(Role.id == role_id).first()
    if not db_role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Check if role is being used by any users
    users_with_role = db.query(User).filter(User.role_id == role_id).first()
    if users_with_role:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete role that is assigned to users. Deactivate instead."
        )

    # Soft delete by setting inactive
    db_role.is_active = False
    db.commit()

    return {
        "success": True,
        "message": "Role deleted successfully"
    }



def toggle_role_status(db: Session, role_id: int, status_data: RoleStatusUpdate):
    """
    Activate or deactivate a role
    """
    db_role = db.query(Role).filter(Role.id == role_id).first()
    if not db_role:
        raise HTTPException(status_code=404, detail="Role not found")

    db_role.is_active = status_data.is_active
    db.commit()
    db.refresh(db_role)

    return {
        "success": True,
        "message": f"Role {'activated' if status_data.is_active else 'deactivated'} successfully"
    }