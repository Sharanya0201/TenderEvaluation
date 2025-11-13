
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db

# ---------- Schemas ----------
from app.schemas.user import (
    UserCreate, UserLogin, UserUpdate, UserResponse, UserListResponse,
    UserStatusUpdate, RoleListResponse, RoleCreate, RoleUpdate,
    RoleResponseWithMessage, RoleStatusUpdate,
)
from app.schemas.tender_types import TenderTypeCreate, TenderTypeUpdate
from app.schemas.evaluation import (
    EvaluationCriterionCreate, EvaluationCriterionUpdate,
    EvaluationCriterionListResponse,
)

# ---------- Services ----------
from app.services.auth_service import (
    register_user, login_user,    # auth
    get_users, get_user_by_id, create_user, update_user, delete_user, toggle_user_status,  # users
    get_roles_with_pagination, create_role, update_role, delete_role, toggle_role_status,  # roles
    # Optional: implement check_duplicate in auth_service to support /check-duplicate
)
from app.services.tender_types_service import (
    get_tender_types, bulk_import_tender_types, create_tender_type,
    update_tender_type, delete_tender_type,
)

from app.services.evaluation_service import (
    get_evaluation_criteria,  # list
    get_evaluation_criterion_by_id,  # get by id
    create_evaluation_criterion, update_evaluation_criterion, delete_evaluation_criterion,
    toggle_criterion_status, restore_default_criteria,
)

router = APIRouter()


# ============================= AUTH =============================

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a user (Viewer by default)."""
    return register_user(db, user)


@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    """Login for Admins, Evaluators, and Viewers."""
    return login_user(db, user)


@router.post("/logout")
def logout():
    """Stateless placeholder; frontend clears token."""
    return {"success": True, "message": "Logged out"}


@router.get("/verify")
def verify():
    """Simple token verification endpoint for the frontend ping."""
    return {"success": True}


@router.post("/check-duplicate")
def check_duplicate(field: str, value: str, db: Session = Depends(get_db)):
    """
    Optional helper used by the frontend to check duplicates.
    Implement `check_duplicate` in auth_service if not present.
    """
    try:
        from app.services.auth_service import check_duplicate as svc_check_dup  # local import if you add it
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="check_duplicate not implemented in backend"
        )
    return svc_check_dup(db, field, value)


# ============================= USERS =============================

@router.get("/users", response_model=UserListResponse)
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """List users with pagination."""
    return get_users(db, skip=skip, limit=limit)


@router.post("/users", response_model=UserResponse)
def create_new_user(user: UserCreate, db: Session = Depends(get_db)):
    """Create a user (Admin/Evaluator/Viewer)."""
    return create_user(db, user)


@router.put("/users/{user_id}", response_model=UserResponse)
def update_existing_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db)):
    """Update a user's profile or role."""
    return update_user(db, user_id, user)


@router.delete("/users/{user_id}")
def delete_existing_user(user_id: int, db: Session = Depends(get_db)):
    """Soft delete / deactivate a user."""
    return delete_user(db, user_id)


@router.put("/users/{user_id}/status")
def update_user_status(user_id: int, status_data: UserStatusUpdate, db: Session = Depends(get_db)):
    """Toggle user active status."""
    return toggle_user_status(db, user_id, status_data)


# ============================= ROLES =============================

@router.get("/roles", response_model=RoleListResponse)
def list_roles(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """List roles with pagination."""
    return get_roles_with_pagination(db, skip=skip, limit=limit)


@router.post("/roles", response_model=RoleResponseWithMessage)
def create_new_role(role: RoleCreate, db: Session = Depends(get_db)):
    """Create a role."""
    return create_role(db, role)


@router.put("/roles/{role_id}", response_model=RoleResponseWithMessage)
def update_existing_role(role_id: int, role: RoleUpdate, db: Session = Depends(get_db)):
    """Update a role."""
    return update_role(db, role_id, role)


@router.delete("/roles/{role_id}")
def delete_existing_role(role_id: int, db: Session = Depends(get_db)):
    """Delete a role."""
    return delete_role(db, role_id)


@router.put("/roles/{role_id}/status")
def update_role_status(role_id: int, status_data: RoleStatusUpdate, db: Session = Depends(get_db)):
    """Toggle role active status."""
    return toggle_role_status(db, role_id, status_data)


# ========================== TENDER TYPES ==========================

@router.get("/tender-types")
def get_tender_types_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """List tender types (paginated)."""
    return get_tender_types(db, skip, limit)


@router.post("/tender-types/import")
def import_tender_types(tender_types_data: dict, db: Session = Depends(get_db)):
    """Bulk import tender types from JSON."""
    return bulk_import_tender_types(db, tender_types_data)


@router.post("/tender-types")
def create_tender_type_endpoint(tender_type: TenderTypeCreate, db: Session = Depends(get_db)):
    """Create a tender type."""
    return create_tender_type(db, tender_type)


@router.put("/tender-types/{code}")
def update_tender_type_endpoint(code: str, tender_type_update: TenderTypeUpdate, db: Session = Depends(get_db)):
    """Update a tender type by code."""
    result = update_tender_type(db, code, tender_type_update)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tender type not found")
    return result


@router.delete("/tender-types/{code}")
def delete_tender_type_endpoint(code: str, db: Session = Depends(get_db)):
    """Delete a tender type by code."""
    result = delete_tender_type(db, code)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tender type not found")
    return result



# ======================= EVALUATION CRITERIA =======================

@router.get("/evaluation-criteria", response_model=EvaluationCriterionListResponse)
def list_evaluation_criteria(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
):
    """List evaluation criteria."""
    return get_evaluation_criteria(db, skip=skip, limit=limit, active_only=active_only)


@router.get("/evaluation-criteria/{criterion_id}")
def get_evaluation_criterion(criterion_id: int, db: Session = Depends(get_db)):
    """Get a single criterion by ID."""
    return get_evaluation_criterion_by_id(db, criterion_id)


@router.post("/evaluation-criteria")
def create_evaluation_criterion_endpoint(criterion: EvaluationCriterionCreate, db: Session = Depends(get_db)):
    """Create an evaluation criterion."""
    return create_evaluation_criterion(db, criterion)


@router.put("/evaluation-criteria/{criterion_id}")
def update_evaluation_criterion_endpoint(
    criterion_id: int, criterion: EvaluationCriterionUpdate, db: Session = Depends(get_db)
):
    """Update an evaluation criterion."""
    return update_evaluation_criterion(db, criterion_id, criterion)


@router.delete("/evaluation-criteria/{criterion_id}")
def delete_evaluation_criterion_endpoint(criterion_id: int, db: Session = Depends(get_db)):
    """Delete an evaluation criterion."""
    return delete_evaluation_criterion(db, criterion_id)


@router.put("/evaluation-criteria/{criterion_id}/status")
def update_criterion_status_endpoint(criterion_id: int, payload: dict, db: Session = Depends(get_db)):
    """Toggle criterion active status."""
    return toggle_criterion_status(db, criterion_id, payload.get("is_active", True))


@router.post("/evaluation-criteria/restore-defaults")
def restore_default_criteria_endpoint(db: Session = Depends(get_db)):
    """Restore default criteria (removes custom ones)."""
    return restore_default_criteria(db)
