
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from starlette.responses import FileResponse
from sqlalchemy.orm import Session
import random
from datetime import datetime
from sqlalchemy import func
from app.db.database import get_db
import os
import shutil
import json
import logging
from typing import List, Optional
from fastapi.encoders import jsonable_encoder


# Add these imports with your existing imports
from app.models.user import User, Role, TenderType, EvaluationCriterion
from app.models.upload_models import Tender, Vendor, TenderAttachment, VendorAttachment
import random
from datetime import datetime
from sqlalchemy import func, text

from fastapi import APIRouter, Depends, HTTPException, Query, status, File, UploadFile, Form
# ---------- Schemas ----------
from sqlalchemy.exc import SQLAlchemyError

# ---------- your existing imports ----------
# (keep the imports you already have in your file; below are the ones from your earlier message)
from app.db.database import Base, engine, get_db
from app.api.v1 import routes_auth  # if circular, remove or adapt import
# Schemas (imported from your project as in your earlier file)
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
    register_user, login_user, get_users, get_user_by_id, create_user, update_user, delete_user, toggle_user_status,
    get_roles_with_pagination, create_role, update_role, delete_role, toggle_role_status,
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
    get_evaluation_criteria, get_evaluation_criterion_by_id, create_evaluation_criterion,
    update_evaluation_criterion, delete_evaluation_criterion, toggle_criterion_status, restore_default_criteria,
)
from app.services.document_extraction_service import extraction_service

# ---------- upload model import ----------
from app.models.upload_models import Tender, Vendor, TenderAttachment, VendorAttachment

logger = logging.getLogger(__name__)
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
        from app.services.auth_service import check_duplicate as svc_check_dup
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


# ======================= UPLOAD ENDPOINTS (TENDERS & VENDORS) =======================

# Attempt to use your auth dependency (if present). This function tries to import a get_current_user
# dependency from common locations; if none found, it returns None and endpoints accept uploadedby form field.
def _try_get_current_user_dependency():
    """
    Returns a dependency callable or None if not found.
    The returned callable should be used as: current_user: Optional[User] = Depends(dep)
    """
    # try common places; adapt if your project stores get_current_user elsewhere
    candidate_locations = [
        "app.api.v1.auth_utils.get_current_user",
        "app.api.v1.dependencies.get_current_user",
        "app.services.auth_service.get_current_user",
        "app.api.v1.routes_auth.get_current_user",  # in case already defined
    ]
    for loc in candidate_locations:
        try:
            module_path, func_name = loc.rsplit(".", 1)
            module = __import__(module_path, fromlist=[func_name])
            func = getattr(module, func_name)
            return func
        except Exception:
            continue
    return None


get_current_user_dep = _try_get_current_user_dependency()


# Configure where files are stored on server (change via env UPLOAD_DIR)
BASE_UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")
TENDER_UPLOAD_DIR = os.path.join(BASE_UPLOAD_DIR, "tenders")
VENDORS_UPLOAD_DIR = os.path.join(BASE_UPLOAD_DIR, "vendors")
os.makedirs(TENDER_UPLOAD_DIR, exist_ok=True)
os.makedirs(VENDORS_UPLOAD_DIR, exist_ok=True)


@router.get("/uploads/tenders")
def get_all_tenders(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    tenderid: int = Query(None),
    db: Session = Depends(get_db)
):
    """Get list of tender attachments with optional filtering by tenderid"""
    try:
        from app.models.upload_models import TenderAttachment

        attachment_query = (
            db.query(TenderAttachment, Tender)
            .outerjoin(Tender, Tender.tenderid == TenderAttachment.tenderid)
        )

        if tenderid:
            attachment_query = attachment_query.filter(TenderAttachment.tenderid == tenderid)

        total = attachment_query.count()
        rows = attachment_query.offset(skip).limit(limit).all()

        def _serialize_attachment(attachment, tender_obj):
            tender_status = (tender_obj.status if tender_obj and tender_obj.status else attachment.status)
            tender_title = (tender_obj.title if tender_obj and tender_obj.title else attachment.filename)
            tender_created = (
                tender_obj.createddate if tender_obj and tender_obj.createddate else attachment.createddate
            )

            return {
                "tenderid": attachment.tenderattachmentsid,
                "tenderid_fk": attachment.tenderid,
                "title": tender_title,
                "filename": attachment.filename,
                "filepath": attachment.filepath,
                "status": tender_status,
                "attachment_status": attachment.status,
                "uploadedby": attachment.uploadedby,
                "createddate": tender_created.isoformat() if tender_created else None,
                "form_data": attachment.form_data or {},
            }

        return {
            "success": True,
            "total": total,
            "skip": skip,
            "limit": limit,
            "tenders": [
                _serialize_attachment(attachment, tender_obj)
                for attachment, tender_obj in rows
            ],
        }
    except Exception as e:
        logger.error(f"Error fetching tenders: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching tenders: {str(e)}")






@router.post("/upload/vendors")
def upload_vendors(
    tenderid: int = Form(...),
    vendorform: Optional[str] = Form(None),
    uploadedby: Optional[str] = Form(None),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_dep) if get_current_user_dep else None,
):
    """
    Upload multiple vendor files with automatic data extraction.
    Creates one vendor row per file with extracted data saved as JSON in form_data field.
    File paths are saved separately.
    """
    # Determine uploader
    uploader_str = None
    if current_user:
        uploader_str = getattr(current_user, "username", None) or getattr(current_user, "email", None) or str(getattr(current_user, "id", "user"))
    else:
        if not uploadedby:
            raise HTTPException(status_code=400, detail="uploadedby is required")
        uploader_str = uploadedby

    # Verify tender exists
    tender = db.query(Tender).filter(Tender.tenderid == tenderid).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    saved = []
    tender_folder = os.path.join(VENDORS_UPLOAD_DIR, str(tenderid))
    os.makedirs(tender_folder, exist_ok=True)

    try:
        for upload in files:
            filename = upload.filename
            
            # Create vendor record
            vendor = Vendor(
                tenderid=tenderid,
                vendorform=vendorform,
                uploadedby=uploader_str,
                form_data={},  # Initialize empty form_data
            )
            db.add(vendor)
            db.flush()  # get vendor.vendorid

            # Save file to disk
            # Allow relative paths from webkitRelativePath, but create parent dirs and sanitize
            raw_name = filename.replace('\\', '/').lstrip('/')
            # Reject upward traversal; if present, fall back to basename
            norm = os.path.normpath(raw_name)
            if norm.startswith('..') or os.path.isabs(norm):
                rel_name = os.path.basename(raw_name)
            else:
                rel_name = norm

            safe_name = f"{vendor.vendorid}_{rel_name.replace(' ', '_')}"
            dest_path = os.path.join(tender_folder, safe_name)

            # Ensure parent directories exist (handles nested webkitRelativePath)
            parent_dir = os.path.dirname(dest_path)
            if parent_dir:
                os.makedirs(parent_dir, exist_ok=True)

            with open(dest_path, "wb") as buffer:
                shutil.copyfileobj(upload.file, buffer)

            vendor.filename = filename
            vendor.filepath = dest_path

            # Create attachment record in vendorattachments table
            vendor_attachment = VendorAttachment(
                vendorid=vendor.vendorid,
                filename=filename,
                filepath=dest_path,
                uploadedby=uploader_str,
                status="Active"
            )
            db.add(vendor_attachment)

            # Extract data from document
            try:
                logger.info(f"Extracting data from vendor file: {filename}")
                raw_form_data = extraction_service.extract_from_file(dest_path)
                sanitized_form_data = jsonable_encoder(raw_form_data)
                # Save extracted data to the attachment record, not the vendor record
                vendor_attachment.form_data = sanitized_form_data
                vendor.form_data = sanitized_form_data
                logger.info(f"Successfully extracted data from {filename}")
            except Exception as extract_err:
                logger.warning(f"Error extracting data from {filename}: {extract_err}")
                fallback_form_data = {
                    "status": "extraction_failed",
                    "error": str(extract_err),
                    "filename": filename
                }
                sanitized_form_data = jsonable_encoder(fallback_form_data)
                vendor_attachment.form_data = sanitized_form_data
                vendor.form_data = sanitized_form_data

            db.flush()
            
            saved.append({
                "vendorid": vendor.vendorid,
                "filename": vendor.filename,
                "filepath": vendor.filepath,
                "form_data_status": vendor.form_data.get("status", "unknown"),
            })

        db.commit()
        return {
            "success": True,
            "saved": saved,
            "message": f"Uploaded {len(saved)} vendor file(s) with data extraction"
        }
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error in upload_vendors: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error in upload_vendors: {e}")
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")



@router.get("/upload/vendors/list/{tenderid}")
def list_vendor_files(tenderid: int):
    """List all vendor files for a tender"""
    tender_folder = os.path.join(VENDORS_UPLOAD_DIR, str(tenderid))
    if not os.path.exists(tender_folder):
        return {"files": []}
    files = os.listdir(tender_folder)
    return {"files": files}


@router.get("/tender/{tenderid}")
def get_tender_details(tenderid: int, db: Session = Depends(get_db)):
    """Get tender details including extracted form_data"""
    tender = db.query(Tender).filter(Tender.tenderid == tenderid).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    
    return {
        "success": True,
        "tender": {
            "tenderid": tender.tenderid,
            "title": tender.title,
            "tenderform": tender.tenderform,
            "filename": tender.filename,
            "filepath": tender.filepath,
            "form_data": tender.form_data,
            "status": tender.status,
            "uploadedby": tender.uploadedby,
            "createddate": tender.createddate.isoformat() if tender.createddate else None,
        }
    }


@router.get("/vendor/{vendorid}")
def get_vendor_details(vendorid: int, db: Session = Depends(get_db)):
    """Get vendor details including extracted form_data"""
    vendor = db.query(Vendor).filter(Vendor.vendorid == vendorid).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    return {
        "success": True,
        "vendor": {
            "vendorid": vendor.vendorid,
            "tenderid": vendor.tenderid,
            "vendorform": vendor.vendorform,
            "filename": vendor.filename,
            "filepath": vendor.filepath,
            "form_data": vendor.form_data,
            "status": vendor.status,
            "uploadedby": vendor.uploadedby,
            "createddate": vendor.createddate.isoformat() if vendor.createddate else None,
        }
    }


# ======================= UPLOAD MANAGEMENT ENDPOINTS =======================

@router.get("/uploads/tenders/list")
def get_tenders_list(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get list of all tenders from tenders table for dropdown"""
    try:
        total = db.query(Tender).count()
        tenders = db.query(Tender).offset(skip).limit(limit).all()
        
        return {
            "success": True,
            "total": total,
            "skip": skip,
            "limit": limit,
            "data": [
                {
                    "tenderid": t.tenderid,
                    "title": t.title,
                    "status": t.status,
                    "createddate": t.createddate.isoformat() if t.createddate else None,
                }
                for t in tenders
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching tenders: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching tenders: {str(e)}")


@router.get("/uploads/tenders")
def get_all_tenders(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    tenderid: int = Query(None),
    db: Session = Depends(get_db)
):
    """Get list of tender attachments with optional filtering by tenderid"""
    try:
        from app.models.upload_models import TenderAttachment
        
        query = db.query(TenderAttachment)
        
        if tenderid:
            query = query.filter(TenderAttachment.tenderid == tenderid)
        
        total = query.count()
        attachments = query.offset(skip).limit(limit).all()
        
        return {
            "success": True,
            "total": total,
            "skip": skip,
            "limit": limit,
            "tenders": [
                {
                    "tenderid": a.tenderattachmentsid,
                    "tenderid_fk": a.tenderid,
                    "title": a.filename,
                    "filename": a.filename,
                    "filepath": a.filepath,
                    "status": a.status,
                    "uploadedby": a.uploadedby,
                    "createddate": a.createddate.isoformat() if a.createddate else None,
                    "form_data": a.form_data or {},
                }
                for a in attachments
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching tenders: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching tenders: {str(e)}")


@router.get("/uploads/vendors")
def get_all_vendors(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    tenderid: int = Query(None),
    db: Session = Depends(get_db)
):
    """Get list of all vendor attachments or attachments for a specific tender"""
    try:
        from app.models.upload_models import VendorAttachment
        
        query = db.query(VendorAttachment)
        
        if tenderid:
            # Join with vendors table to filter by tenderid
            from app.models.upload_models import Vendor
            query = query.join(Vendor).filter(Vendor.tenderid == tenderid)
        
        total = query.count()
        attachments = query.offset(skip).limit(limit).all()
        
        return {
            "success": True,
            "total": total,
            "skip": skip,
            "limit": limit,
            "vendors": [
                {
                    "vendorid": a.vendorattachmentid,
                    "tenderid": a.vendor.tenderid,
                    "filename": a.filename,
                    "filepath": a.filepath,
                    "status": a.status,
                    "uploadedby": a.uploadedby,
                    "createddate": a.createddate.isoformat() if a.createddate else None,
                    "form_data": a.form_data or {},
                }
                for a in attachments
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching vendors: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching vendors: {str(e)}")


@router.put("/uploads/tender/{tenderid}")
def update_tender(
    tenderid: int,
    title: str = Form(...),
    status: str = Form(...),
    db: Session = Depends(get_db)
):
    """Update tender details (title and status)"""
    try:
        tender = db.query(Tender).filter(Tender.tenderid == tenderid).first()
        if not tender:
            raise HTTPException(status_code=404, detail="Tender not found")
        
        tender.title = title
        tender.status = status
        db.commit()
        db.refresh(tender)
        
        logger.info(f"Updated tender {tenderid}")
        
        return {
            "success": True,
            "message": "Tender updated successfully",
            "tender": {
                "tenderid": tender.tenderid,
                "title": tender.title,
                "filename": tender.filename,
                "filepath": tender.filepath,
                "status": tender.status,
                "uploadedby": tender.uploadedby,
                "createddate": tender.createddate.isoformat() if tender.createddate else None,
                "form_data": tender.form_data,
            }
        }
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error updating tender {tenderid}: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating tender {tenderid}: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating tender: {str(e)}")


@router.put("/uploads/vendor/{vendorid}")
def update_vendor(
    vendorid: int,
    status: str = Form(...),
    db: Session = Depends(get_db)
):
    """Update vendor status"""
    try:
        vendor = db.query(Vendor).filter(Vendor.vendorid == vendorid).first()
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
        
        vendor.status = status
        db.commit()
        db.refresh(vendor)
        
        logger.info(f"Updated vendor {vendorid}")
        
        return {
            "success": True,
            "message": "Vendor updated successfully",
            "vendor": {
                "vendorid": vendor.vendorid,
                "tenderid": vendor.tenderid,
                "filename": vendor.filename,
                "filepath": vendor.filepath,
                "status": vendor.status,
                "uploadedby": vendor.uploadedby,
                "createddate": vendor.createddate.isoformat() if vendor.createddate else None,
                "form_data": vendor.form_data,
            }
        }
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error updating vendor {vendorid}: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating vendor {vendorid}: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating vendor: {str(e)}")


@router.get("/downloads/tender/{attachment_id}")
def download_tender_attachment(
    attachment_id: int,
    db: Session = Depends(get_db)
):
    """Download a tender attachment file"""
    try:
        from app.models.upload_models import TenderAttachment
        
        attachment = db.query(TenderAttachment).filter(
            TenderAttachment.tenderattachmentsid == attachment_id
        ).first()
        
        if not attachment:
            raise HTTPException(status_code=404, detail="Tender attachment not found")
        
        if not attachment.filepath or not os.path.exists(attachment.filepath):
            logger.warning(f"File not found: {attachment.filepath}")
            raise HTTPException(status_code=404, detail="File not found on server")
        
        return FileResponse(
            path=attachment.filepath,
            media_type="application/octet-stream",
            filename=attachment.filename
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading tender attachment {attachment_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Download error: {str(e)}")


@router.get("/downloads/vendor/{attachment_id}")
def download_vendor_attachment(
    attachment_id: int,
    db: Session = Depends(get_db)
):
    """Download a vendor attachment file"""
    try:
        from app.models.upload_models import VendorAttachment
        
        attachment = db.query(VendorAttachment).filter(
            VendorAttachment.vendorattachmentid == attachment_id
        ).first()
        
        if not attachment:
            raise HTTPException(status_code=404, detail="Vendor attachment not found")
        
        if not attachment.filepath or not os.path.exists(attachment.filepath):
            logger.warning(f"File not found: {attachment.filepath}")
            raise HTTPException(status_code=404, detail="File not found on server")
        
        return FileResponse(
            path=attachment.filepath,
            media_type="application/octet-stream",
            filename=attachment.filename
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading vendor attachment {attachment_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Download error: {str(e)}")


@router.delete("/uploads/tender/{attachment_id}")
def delete_tender_attachment(
    attachment_id: int,
    db: Session = Depends(get_db)
):
    """Delete a specific tender attachment file only (not the tender itself)"""
    try:
        from app.models.upload_models import TenderAttachment
        
        attachment = db.query(TenderAttachment).filter(TenderAttachment.tenderattachmentsid == attachment_id).first()
        if not attachment:
            raise HTTPException(status_code=404, detail="Tender attachment not found")
        
        # Delete file from disk if it exists
        if attachment.filepath and os.path.exists(attachment.filepath):
            try:
                os.remove(attachment.filepath)
                logger.info(f"Deleted file: {attachment.filepath}")
            except Exception as e:
                logger.warning(f"Could not delete file {attachment.filepath}: {e}")
        
        # Database delete - only the attachment record
        db.delete(attachment)
        db.commit()
        
        logger.info(f"Deleted tender attachment {attachment_id}")
        
        return {
            "success": True,
            "message": f"Tender attachment {attachment_id} deleted successfully"
        }
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error deleting tender attachment {attachment_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting tender attachment {attachment_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting tender attachment: {str(e)}")


@router.delete("/uploads/vendor/{attachment_id}")
def delete_vendor_attachment(
    attachment_id: int,
    db: Session = Depends(get_db)
):
    """Delete a specific vendor attachment file only (not the vendor or tender itself)"""
    try:
        from app.models.upload_models import VendorAttachment
        
        attachment = db.query(VendorAttachment).filter(VendorAttachment.vendorattachmentid == attachment_id).first()
        if not attachment:
            raise HTTPException(status_code=404, detail="Vendor attachment not found")
        
        # Delete file from disk if it exists
        if attachment.filepath and os.path.exists(attachment.filepath):
            try:
                os.remove(attachment.filepath)
                logger.info(f"Deleted file: {attachment.filepath}")
            except Exception as e:
                logger.warning(f"Could not delete file {attachment.filepath}: {e}")
        
        # Database delete - only the attachment record
        db.delete(attachment)
        db.commit()
        
        logger.info(f"Deleted vendor attachment {attachment_id}")
        
        return {
            "success": True,
            "message": f"Vendor attachment {attachment_id} deleted successfully"
        }
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error deleting vendor attachment {attachment_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting vendor attachment {attachment_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting vendor attachment: {str(e)}")


# ======================= DASHBOARD ENDPOINTS =======================

@router.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Get dashboard statistics"""
    try:
        # Count tenders
        total_tenders = db.query(Tender).count()
        
        # Count vendors
        total_vendors = db.query(Vendor).count()
        
        # Count users
        total_users = db.query(User).count()
        
        # Static evaluations count until real implementation
        total_evaluations = 0  # Static value as requested
        
        return {
            "success": True,
            "stats": {
                "tenders": total_tenders,
                "vendors": total_vendors,
                "users": total_users,
                "evaluations": total_evaluations  # This will now always be 6
            }
        }
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard stats: {str(e)}")

@router.get("/dashboard/tender-status")
def get_tender_status_distribution(db: Session = Depends(get_db)):
    """Get tender status distribution"""
    try:
        # Group tenders by status
        status_counts = db.query(
            Tender.status, 
            func.count(Tender.tenderid).label('count')
        ).group_by(Tender.status).all()
        
        distribution = [
            {"name": status or "Unknown", "value": count}
            for status, count in status_counts
        ]
        
        return {
            "success": True,
            "distribution": distribution
        }
    except Exception as e:
        logger.error(f"Error fetching tender status distribution: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching tender status distribution: {str(e)}")

@router.get("/dashboard/monthly-evaluations")
def get_monthly_evaluations(db: Session = Depends(get_db)):
    """Get monthly evaluations and tenders data"""
    try:
        # Get current year
        current_year = datetime.now().year
        
        # Monthly tender counts
        monthly_tenders = db.query(
            func.date_trunc('month', Tender.createddate).label('month'),
            func.count(Tender.tenderid).label('tender_count')
        ).filter(
            func.extract('year', Tender.createddate) == current_year
        ).group_by('month').order_by('month').all()
        
        # Monthly evaluation counts (using attachments as proxy)
        monthly_evaluations = db.query(
            func.date_trunc('month', TenderAttachment.createddate).label('month'),
            func.count(TenderAttachment.tenderattachmentsid).label('evaluation_count')
        ).filter(
            func.extract('year', TenderAttachment.createddate) == current_year
        ).group_by('month').order_by('month').all()
        
        # Combine data
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        result = []
        
        for i, month_name in enumerate(months):
            month_num = i + 1
            tender_count = 0
            evaluation_count = 0
            
            # Find matching tender count
            for tender_month in monthly_tenders:
                if tender_month.month.month == month_num:
                    tender_count = tender_month.tender_count
                    break
            
            # Find matching evaluation count
            for eval_month in monthly_evaluations:
                if eval_month.month.month == month_num:
                    evaluation_count = eval_month.evaluation_count
                    break
            
            result.append({
                "month": month_name,
                "tenders": tender_count,
                "evaluations": evaluation_count
            })
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        logger.error(f"Error fetching monthly evaluations: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching monthly evaluations: {str(e)}")

@router.get("/dashboard/vendor-performance")
def get_vendor_performance(db: Session = Depends(get_db)):
    """Get top vendor performance data using actual vendor names"""
    try:
        # Simple approach - get top 5 vendors by ID and count their tenders
        # This avoids complex joins and grouping issues
        all_vendors = db.query(Vendor).all()
        
        # Count tenders per vendor
        vendor_counts = {}
        for vendor in all_vendors:
            if vendor.vendorid not in vendor_counts:
                vendor_counts[vendor.vendorid] = 0
            vendor_counts[vendor.vendorid] += 1
        
        # Get top 5 vendors by tender count
        top_vendor_ids = sorted(vendor_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        performance_data = []
        
        for vendor_id, tender_count in top_vendor_ids:
            vendor = db.query(Vendor).filter(Vendor.vendorid == vendor_id).first()
            if vendor:
                vendor_name = get_vendor_display_name(vendor)
                
                # Generate performance score
                base_score = min(100, 70 + (tender_count * 3))
                performance_score = base_score + random.randint(-5, 5)
                
                performance_data.append({
                    "name": vendor_name,
                    "score": performance_score,
                    "tenders": tender_count
                })
        
        return {
            "success": True,
            "data": performance_data
        }
    except Exception as e:
        logger.error(f"Error fetching vendor performance: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching vendor performance: {str(e)}")

def get_vendor_display_name(vendor):
    """Get display name for vendor with multiple fallback options"""
    # Try to get name from form_data
    if vendor.form_data and isinstance(vendor.form_data, dict):
        for field in ['vendor_name', 'company_name', 'name', 'bidder_name']:
            if field in vendor.form_data and vendor.form_data[field]:
                name = str(vendor.form_data[field]).strip()
                if name and name != "None":
                    return name
    
    # Try to get from filename
    if vendor.filename:
        name = os.path.splitext(vendor.filename)[0]
        # Clean up filename
        name = name.replace('_', ' ').replace('-', ' ').title()
        # Remove vendor_ prefix if present
        if name.lower().startswith('vendor '):
            name = name[7:]
        return name.strip()
    
    # Final fallback
    return f"Vendor {vendor.vendorid}"

# You can add additional helper endpoints such as GET /tenders or GET /vendors/<id> if needed.
# End of routes_auth.py
