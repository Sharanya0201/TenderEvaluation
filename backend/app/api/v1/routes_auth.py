import traceback
from typing import Any, Dict, List
import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, logger, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserUpdate,
    UserResponse,
    UserListResponse,
    UserStatusUpdate,
    RoleListResponse,
    RoleCreate,
    RoleUpdate,
    RoleResponseWithMessage,
    RoleStatusUpdate,
)
from app.schemas.tender_types import TenderTypeCreate, TenderTypeUpdate
from app.services.auth_service import (
    register_user,
    login_user,
    get_users,
    get_user_by_id,
    create_user,
    update_user,
    delete_user,
    toggle_user_status,
    get_roles,
    get_roles_with_pagination,  # Renamed function
    get_role_by_id,
    create_role,
    update_role,
    delete_role,
    toggle_role_status,
)

from app.schemas.vendor import VendorCreate, VendorResponse
from app.services.vendor_service import register_vendor
from app.schemas.vendor import VendorFull, VendorUpdate
from app.models.user import OCRResult, Vendor, VendorDocument, TenderAttachment
from app.schemas.tender import TenderCreate, TenderResponse, TenderAttachmentResponse, TenderUpdate
from app.services.tender_service import (
    create_tender,
    save_tender_attachments,
    get_tender_by_id,
    update_tender,
    delete_tender,
    list_tenders_filtered,
)


# Add these imports at the top of routes_auth.py
from app.schemas.user import (
    TenderVendorMappingCreate,
    TenderVendorMappingUpdate,
    TenderVendorMappingListResponse,
    TenderWithVendorsResponse,
    VendorWithTendersResponse,
    BulkMappingCreate
)
from app.services.tender_vendor_mapping_service import (
    create_tender_vendor_mapping,
    bulk_create_mappings,
    get_tender_vendor_mappings,
    get_mappings_by_tender,
    get_mappings_by_vendor,
    update_tender_vendor_mapping,
    delete_tender_vendor_mapping,
    get_available_vendors_for_tender
)

from app.schemas.evaluation import (
    EvaluationCriterionCreate,
    EvaluationCriterionUpdate,
    EvaluationCriterionListResponse,
    TenderEvaluationCreate,
    TenderEvaluationUpdate,
    BulkEvaluationCreate,
    EvaluationSummaryResponse
)
from app.services.evaluation_service import (
    initialize_default_criteria,
    get_evaluation_criteria,
    get_evaluation_criterion_by_id,
    create_evaluation_criterion,
    update_evaluation_criterion,
    delete_evaluation_criterion,
    toggle_criterion_status,
    restore_default_criteria,
    create_tender_evaluation,
    create_bulk_evaluations,
    get_evaluation_summary
)

from app.schemas.ocr import BulkOCRResponse, OCRResultResponse, OCRStatusResponse, OCRProcessRequest, OCRCorrectTextRequest
from app.services.ocr_service import ocr_service

router = APIRouter()

# --------------------------- AUTHENTICATION ---------------------------

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """
    Public endpoint: Register a new Viewer user.
    """
    return register_user(db, user)


@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    """
    Universal login: Works for Admins, Evaluators, and Viewers.
    """
    return login_user(db, user)


# --------------------------- USER MANAGEMENT (Admin Only) ---------------------------

@router.get("/users", response_model=UserListResponse)
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    Admin endpoint: List all users with pagination.
    """
    return get_users(db, skip=skip, limit=limit)


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """
    Admin endpoint: Get a specific user's details.
    """
    return get_user_by_id(db, user_id)


@router.post("/users", response_model=UserResponse)
def create_new_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Admin endpoint: Create a new user (Admin/Evaluator/Viewer).
    """
    return create_user(db, user)


@router.put("/users/{user_id}", response_model=UserResponse)
def update_existing_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db)):
    """
    Admin endpoint: Update user details.
    """
    return update_user(db, user_id, user)


@router.delete("/users/{user_id}")
def delete_existing_user(user_id: int, db: Session = Depends(get_db)):
    """
    Admin endpoint: Soft delete a user (deactivate account).
    """
    return delete_user(db, user_id)


@router.put("/users/{user_id}/status")
def update_user_status(user_id: int, status_data: UserStatusUpdate, db: Session = Depends(get_db)):
    """
    Admin endpoint: Activate or deactivate a user account.
    """
    return toggle_user_status(db, user_id, status_data)


# --------------------------- ROLE MANAGEMENT ---------------------------

@router.get("/roles", response_model=RoleListResponse)
def list_roles(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    Admin endpoint: Get all available roles with pagination.
    """
    return get_roles_with_pagination(db, skip=skip, limit=limit)

@router.get("/roles/{role_id}", response_model=RoleResponseWithMessage)
def get_role(role_id: int, db: Session = Depends(get_db)):
    """
    Admin endpoint: Get a specific role by ID.
    """
    return get_role_by_id(db, role_id)


@router.post("/roles", response_model=RoleResponseWithMessage)
def create_new_role(role: RoleCreate, db: Session = Depends(get_db)):
    """
    Admin endpoint: Create a new role.
    """
    return create_role(db, role)


@router.put("/roles/{role_id}", response_model=RoleResponseWithMessage)
def update_existing_role(role_id: int, role: RoleUpdate, db: Session = Depends(get_db)):
    """
    Admin endpoint: Update role details.
    """
    return update_role(db, role_id, role)


@router.delete("/roles/{role_id}")
def delete_existing_role(role_id: int, db: Session = Depends(get_db)):
    """
    Admin endpoint: Delete a role.
    """
    return delete_role(db, role_id)


@router.put("/roles/{role_id}/status")
def update_role_status(role_id: int, status_data: RoleStatusUpdate, db: Session = Depends(get_db)):
    """
    Admin endpoint: Activate or deactivate a role.
    """
    return toggle_role_status(db, role_id, status_data)


# --------------------------- VENDOR REGISTRATION ---------------------------

@router.post("/register_vendor")
def register(vendor: VendorCreate, db: Session = Depends(get_db)):
    return register_vendor(db, vendor)

@router.get("/verify")
def verify_token():
    return {"success": True, "message": "Token is valid"}


@router.get("/vendors", response_model=List[VendorFull])
def list_vendors(db: Session = Depends(get_db)):
    vendors: List[Vendor] = db.query(Vendor).all()
    return vendors


@router.put("/vendors/{vendor_id}", response_model=VendorFull)
def update_vendor(vendor_id: int, payload: VendorUpdate, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vendor, field, value)

    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.delete("/vendors/{vendor_id}")
def delete_vendor(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    db.delete(vendor)
    db.commit()
    return {"success": True, "message": "Vendor deleted"}




@router.post("/vendors/{vendor_id}/documents")
def upload_vendor_documents(
    vendor_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    allowed_content_types = {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",  # Added for testing
    }

    saved_files = []
    for f in files:
        if f.content_type not in allowed_content_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {f.filename}",
            )

        try:
            # Read file content into memory
            f.file.seek(0)  # Reset file pointer to beginning
            file_content = f.file.read()
            file_size = len(file_content)
            
            # Generate unique filename
            ext = Path(f.filename).suffix.lower()
            safe_name = f"{uuid.uuid4().hex}{ext}"

            # Save document to database with file content
            doc_record = VendorDocument(
                vendor_id=vendor_id,
                original_filename=f.filename,
                stored_filename=safe_name,
                file_path=None,  # No local file path since storing in DB
                file_content=file_content,  # Store actual file content
                file_size=file_size,
                content_type=f.content_type
            )
            db.add(doc_record)
            db.commit()
            db.refresh(doc_record)
        except Exception as e:
            print(f"Error saving document: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error saving document: {str(e)}")

        saved_files.append({
            "id": doc_record.id,
            "original": f.filename,
            "stored": safe_name,
            "size": file_size,
            "content_type": f.content_type
        })

    return {"success": True, "message": "Files uploaded and saved to database", "files": saved_files}


@router.get("/vendors/{vendor_id}/documents")
def get_vendor_documents(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    documents = db.query(VendorDocument).filter(VendorDocument.vendor_id == vendor_id).all()
    
    return {
        "success": True,
        "documents": [
            {
                "id": doc.id,
                "original_filename": doc.original_filename,
                "stored_filename": doc.stored_filename,
                "file_size": doc.file_size,
                "content_type": doc.content_type,
                "uploaded_at": doc.uploaded_at
            }
            for doc in documents
        ]
    }


@router.get("/vendors/{vendor_id}/documents/{document_id}/download")
def download_vendor_document(vendor_id: int, document_id: int, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    document = db.query(VendorDocument).filter(
        VendorDocument.id == document_id,
        VendorDocument.vendor_id == vendor_id
    ).first()
    
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    from fastapi.responses import Response
    
    # Calculate actual content length from file_content
    content_length = len(document.file_content) if document.file_content else 0
    
    return Response(
        content=document.file_content,
        media_type=document.content_type or "application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename={document.original_filename}",
            "Content-Length": str(content_length)
        }
    )


@router.get("/vendors/{vendor_id}/documents/{document_id}/view")
def view_vendor_document(vendor_id: int, document_id: int, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    document = db.query(VendorDocument).filter(
        VendorDocument.id == document_id,
        VendorDocument.vendor_id == vendor_id
    ).first()
    
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    from fastapi.responses import Response
    
    # Calculate actual content length from file_content
    content_length = len(document.file_content) if document.file_content else 0
    
    return Response(
        content=document.file_content,
        media_type=document.content_type or "application/octet-stream",
        headers={
            "Content-Disposition": "inline",
            "Content-Length": str(content_length)
        }
    )


@router.delete("/vendors/{vendor_id}/documents/{document_id}")
def delete_vendor_document(vendor_id: int, document_id: int, db: Session = Depends(get_db)):
    """Delete a vendor document"""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    document = db.query(VendorDocument).filter(
        VendorDocument.id == document_id,
        VendorDocument.vendor_id == vendor_id
    ).first()
    
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    try:
        db.delete(document)
        db.commit()
        return {
            "success": True,
            "message": "Document deleted successfully"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete document: {str(e)}")


# --------------------------- TENDER TYPES MANAGEMENT ---------------------------

@router.post("/tender-types")
def create_tender_type(
    tender_type: TenderTypeCreate,
    db: Session = Depends(get_db)
):
    from app.services.tender_types_service import create_tender_type
    return create_tender_type(db, tender_type)


@router.get("/tender-types")
def get_tender_types(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    from app.services.tender_types_service import get_tender_types
    return get_tender_types(db, skip, limit)


@router.get("/tender-types/{code}")
def get_tender_type_by_code(
    code: str,
    db: Session = Depends(get_db)
):
    from app.services.tender_types_service import get_tender_type_by_code
    tender_type = get_tender_type_by_code(db, code)
    if not tender_type:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tender type not found")
    return {
        "success": True,
        "message": "Tender type retrieved successfully",
        "tender_type": tender_type
    }


@router.put("/tender-types/{code}")
def update_tender_type(
    code: str,
    tender_type_update: TenderTypeUpdate,
    db: Session = Depends(get_db)
):
    from app.services.tender_types_service import update_tender_type
    result = update_tender_type(db, code, tender_type_update)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tender type not found")
    return result


@router.delete("/tender-types/{code}")
def delete_tender_type(
    code: str,
    db: Session = Depends(get_db)
):
    from app.services.tender_types_service import delete_tender_type
    result = delete_tender_type(db, code)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tender type not found")
    return result


@router.post("/tender-types/import")
def import_tender_types(
    tender_types_data: dict,
    db: Session = Depends(get_db)
):
    from app.services.tender_types_service import bulk_import_tender_types
    return bulk_import_tender_types(db, tender_types_data)

# --------------------------- TENDERS ---------------------------

@router.post("/tenders", response_model=TenderResponse)
async def create_tender_endpoint(
    tender_type_code: str = Form(...),
    tender_type_id: int | None = Form(None),
    tender: str | None = Form(None),
    description: str | None = Form(None),
    status: str | None = Form("Draft"),
    form_data_json: str = Form(...),
    attachments: List[UploadFile] = File(default=[]),
    attachment_keys: List[str] = Form(default=[]),
    db: Session = Depends(get_db),
):
    import json
    # Validate tender type exists early for clearer error
    from app.models.user import TenderType
    existing_type = db.query(TenderType).filter(TenderType.code == tender_type_code).first()
    if not existing_type:
        raise HTTPException(status_code=400, detail=f"Unknown tender_type_code: {tender_type_code}. Create or import this tender type first.")
    
    # If tender_type_id is provided, validate it matches the code
    if tender_type_id and existing_type.id != tender_type_id:
        raise HTTPException(status_code=400, detail=f"tender_type_id {tender_type_id} does not match tender_type_code {tender_type_code}")
    
    try:
        form_data = json.loads(form_data_json)
        if not isinstance(form_data, dict):
            raise ValueError("form_data_json must be an object")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid form_data_json: {e}")

    # Create tender row
    tender_payload = {
        "tender_type_code": tender_type_code,
        "tender_type_id": tender_type_id or existing_type.id,  # Use provided ID or get from existing_type
        "tender": tender,
        "description": description,
        "form_data": form_data,
        "status": status or "Draft",
    }
    try:
        tender = create_tender(db, tender_payload)
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to create tender (DB): {str(e)}")

    # Save attachments if any
    files_payload = []
    if attachments:
        for idx, f in enumerate(attachments):
            try:
                f.file.seek(0)
                content = f.file.read()
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error reading attachment: {str(e)}")
            field_key = None
            if isinstance(attachment_keys, list) and idx < len(attachment_keys):
                field_key = attachment_keys[idx]
            files_payload.append({
                "filename": f.filename,
                "content_type": f.content_type,
                "content": content,
                "field_key": field_key,
            })
        try:
            save_tender_attachments(db, tender.id, files_payload)
        except Exception as e:
            try:
                db.rollback()
            except Exception:
                pass
            raise HTTPException(status_code=500, detail=f"Failed to save attachments (DB): {str(e)}")

    return tender


@router.get("/tenders", response_model=List[TenderResponse])
def list_tenders(
    tender_type_code: str | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db)
):
    """List tenders with optional filtering by tender_type_code and status"""
    if tender_type_code or status:
        return list_tenders_filtered(db, tender_type_code, status)
    else:
        from app.models.user import Tender
        tenders = db.query(Tender).order_by(Tender.id.desc()).all()
        return tenders


@router.get("/tenders/{tender_id}", response_model=TenderResponse)
def get_tender(tender_id: int, db: Session = Depends(get_db)):
    """Get a specific tender by ID"""
    tender = get_tender_by_id(db, tender_id)
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    return tender


@router.put("/tenders/{tender_id}", response_model=TenderResponse)
def update_tender_endpoint(
    tender_id: int,
    tender_update: TenderUpdate,
    db: Session = Depends(get_db)
):
    """Update a tender"""
    update_dict = tender_update.dict(exclude_unset=True)
    tender = update_tender(db, tender_id, update_dict)
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    return tender


@router.delete("/tenders/{tender_id}")
def delete_tender_endpoint(tender_id: int, db: Session = Depends(get_db)):
    """Delete a tender and all its associated records"""
    try:
        success = delete_tender(db, tender_id)
        if not success:
            raise HTTPException(status_code=404, detail="Tender not found")
        return {"success": True, "message": "Tender deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete tender: {str(e)}")



@router.get("/tenders/{tender_id}/attachments", response_model=List[TenderAttachmentResponse])
def get_tender_attachments(
    tender_id: int,
    db: Session = Depends(get_db),
):
    """Get all attachments for a specific tender"""
    attachments = db.query(TenderAttachment).filter(
        TenderAttachment.tender_id == tender_id
    ).order_by(TenderAttachment.uploaded_at.desc()).all()
    
    if not attachments:
        return []
    return attachments


@router.get("/tenders/{tender_id}/attachments/count")
def get_tender_attachments_count(
    tender_id: int,
    db: Session = Depends(get_db),
):
    """Get count of attachments for a tender"""
    count = db.query(TenderAttachment).filter(
        TenderAttachment.tender_id == tender_id
    ).count()
    
    return {"count": count}


@router.get("/tenders-with-attachments", response_model=List[TenderResponse])
def list_tenders_with_attachments(
    tender_type_code: str | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """List tenders with attachment counts"""
    from app.models.user import Tender
    
    # Base query
    query = db.query(Tender)
    
    # Apply filters
    if tender_type_code:
        query = query.filter(Tender.tender_type_code == tender_type_code)
    if status:
        query = query.filter(Tender.status == status)
    
    tenders = query.order_by(Tender.id.desc()).all()
    
    # Add attachment count to each tender
    for tender in tenders:
        attachment_count = db.query(TenderAttachment).filter(
            TenderAttachment.tender_id == tender.id
        ).count()
        tender.attachment_count = attachment_count
        tender.has_attachments = attachment_count > 0
    
    return tenders
# --------------------------- TENDER-VENDOR MAPPING ---------------------------

@router.post("/tender-vendor-mappings", response_model=dict)
def create_mapping(mapping: TenderVendorMappingCreate, db: Session = Depends(get_db)):
    """
    Create a new tender-vendor mapping
    """
    return create_tender_vendor_mapping(db, mapping)


@router.post("/tender-vendor-mappings/bulk", response_model=dict)
def create_bulk_mappings(bulk_data: BulkMappingCreate, db: Session = Depends(get_db)):
    """
    Create multiple vendor mappings for a tender
    """
    return bulk_create_mappings(db, bulk_data)


@router.get("/tender-vendor-mappings", response_model=TenderVendorMappingListResponse)
def list_mappings(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    Get all tender-vendor mappings with pagination
    """
    return get_tender_vendor_mappings(db, skip=skip, limit=limit)


@router.get("/tenders/{tender_id}/vendors", response_model=dict)
def get_vendors_for_tender(tender_id: int, db: Session = Depends(get_db)):
    """
    Get all vendors mapped to a specific tender
    """
    return get_mappings_by_tender(db, tender_id)


@router.get("/vendors/{vendor_id}/tenders", response_model=dict)
def get_tenders_for_vendor(vendor_id: int, db: Session = Depends(get_db)):
    """
    Get all tenders mapped to a specific vendor
    """
    return get_mappings_by_vendor(db, vendor_id)


@router.get("/tenders/{tender_id}/available-vendors", response_model=dict)
def get_available_vendors(tender_id: int, db: Session = Depends(get_db)):
    """
    Get vendors that are NOT yet mapped to a specific tender
    """
    return get_available_vendors_for_tender(db, tender_id)


@router.put("/tender-vendor-mappings/{mapping_id}", response_model=dict)
def update_mapping(mapping_id: int, mapping_update: TenderVendorMappingUpdate, db: Session = Depends(get_db)):
    """
    Update a tender-vendor mapping
    """
    return update_tender_vendor_mapping(db, mapping_id, mapping_update)


@router.delete("/tender-vendor-mappings/{mapping_id}", response_model=dict)
def delete_mapping(mapping_id: int, db: Session = Depends(get_db)):
    """
    Delete a tender-vendor mapping
    """
    return delete_tender_vendor_mapping(db, mapping_id)

# --------------------------- EVALUATION CRITERIA MANAGEMENT ---------------------------

@router.get("/evaluation-criteria", response_model=EvaluationCriterionListResponse)
def list_evaluation_criteria(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = Query(True),
    db: Session = Depends(get_db)
):
    """
    Get all evaluation criteria with pagination
    """
    return get_evaluation_criteria(db, skip=skip, limit=limit, active_only=active_only)


@router.get("/evaluation-criteria/{criterion_id}")
def get_evaluation_criterion(criterion_id: int, db: Session = Depends(get_db)):
    """
    Get a specific evaluation criterion by ID
    """
    return get_evaluation_criterion_by_id(db, criterion_id)


@router.post("/evaluation-criteria")
def create_evaluation_criterion_endpoint(
    criterion: EvaluationCriterionCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new evaluation criterion
    """
    return create_evaluation_criterion(db, criterion)


@router.put("/evaluation-criteria/{criterion_id}")
def update_evaluation_criterion_endpoint(
    criterion_id: int,
    criterion: EvaluationCriterionUpdate,
    db: Session = Depends(get_db)
):
    """
    Update an existing evaluation criterion
    """
    return update_evaluation_criterion(db, criterion_id, criterion)


@router.delete("/evaluation-criteria/{criterion_id}")
def delete_evaluation_criterion_endpoint(
    criterion_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete an evaluation criterion
    """
    return delete_evaluation_criterion(db, criterion_id)


@router.put("/evaluation-criteria/{criterion_id}/status")
def update_criterion_status(
    criterion_id: int,
    status_data: dict,  # Using dict instead of creating new schema
    db: Session = Depends(get_db)
):
    """
    Activate or deactivate an evaluation criterion
    """
    return toggle_criterion_status(db, criterion_id, status_data.get("is_active", True))


@router.post("/evaluation-criteria/restore-defaults")
def restore_default_criteria_endpoint(db: Session = Depends(get_db)):
    """
    Restore all default criteria and remove custom ones
    """
    return restore_default_criteria(db)


# --------------------------- TENDER EVALUATIONS ---------------------------

@router.post("/tender-evaluations")
def create_tender_evaluation_endpoint(
    evaluation: TenderEvaluationCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new tender evaluation
    """
    return create_tender_evaluation(db, evaluation)


@router.post("/tender-evaluations/bulk")
def create_bulk_evaluations_endpoint(
    bulk_data: BulkEvaluationCreate,
    db: Session = Depends(get_db)
):
    """
    Create multiple evaluations for a tender-vendor combination
    """
    return create_bulk_evaluations(db, bulk_data)


@router.get("/tender-evaluations/summary")
def get_evaluation_summary_endpoint(
    tender_id: int = Query(..., ge=1),
    vendor_id: int = Query(..., ge=1),
    db: Session = Depends(get_db)
):
    """
    Get evaluation summary for a tender-vendor combination
    """
    return get_evaluation_summary(db, tender_id, vendor_id)

# --------------------------- OCR  ---------------------------

@router.post("/documents/{document_id}/ocr-process", response_model=OCRStatusResponse)
async def process_document_ocr(
    document_id: int,
    db: Session = Depends(get_db),
):
    """Process OCR for a single document"""
    try:
        result = await ocr_service.process_document_ocr(db, document_id)
        return OCRStatusResponse(
            document_id=document_id,
            status=result['status']
        )

    except ValueError as e:
        print(f"[OCR ERROR - ValueError] {e}")
        traceback.print_exc()
        raise HTTPException(status_code=404, detail=str(e))

    except Exception as e:
        print(f"[OCR ERROR - Exception] {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")
    
@router.post("/documents/bulk-ocr-process", response_model=BulkOCRResponse)
async def bulk_process_ocr(
    request: OCRProcessRequest,
    db: Session = Depends(get_db),
):
    """Bulk OCR processing for multiple documents"""
    try:
        result = await ocr_service.bulk_process_ocr(db, request.document_ids)
        return BulkOCRResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk OCR processing failed: {str(e)}")

@router.get("/documents/{document_id}/ocr-status", response_model=OCRStatusResponse)
async def get_ocr_status(
    document_id: int,
    db: Session = Depends(get_db),
):
    """Get OCR status for a document"""
    status_info = ocr_service.get_ocr_status(db, document_id)
    return OCRStatusResponse(
        document_id=document_id,
        **status_info
    )

@router.put("/documents/{document_id}/correct-text")
async def correct_ocr_text(
    document_id: int,
    request: OCRCorrectTextRequest,
    db: Session = Depends(get_db),
):
    """Manual OCR text correction"""
    success = ocr_service.correct_ocr_text(db, document_id, request.corrected_text)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"success": True, "message": "OCR text corrected successfully"}

@router.get("/documents/{document_id}/ocr-result", response_model=OCRResultResponse)
async def get_ocr_result(
    document_id: int,
    db: Session = Depends(get_db),
):
    """Get full OCR result details"""
    ocr_result = db.query(OCRResult).filter(OCRResult.document_id == document_id).first()
    if not ocr_result:
        raise HTTPException(status_code=404, detail="OCR result not found")
    
    return ocr_result

@router.get("/vendors/{vendor_id}/ocr-results")
async def get_vendor_ocr_results(
    vendor_id: int,
    db: Session = Depends(get_db),
):
    """Get all OCR results for a vendor's documents"""
    try:
        # Get vendor documents
        vendor_docs = db.query(VendorDocument).filter(VendorDocument.vendor_id == vendor_id).all()
        doc_ids = [doc.id for doc in vendor_docs]
        
        # Get OCR results for these documents
        ocr_results = db.query(OCRResult).filter(OCRResult.document_id.in_(doc_ids)).all()
        
        # Convert to Pydantic models for proper serialization
        serialized_ocr_results = [OCRResultResponse.model_validate(result) for result in ocr_results]
        
        return {
            "vendor_id": vendor_id,
            "total_documents": len(vendor_docs),
            "ocr_results": serialized_ocr_results
        }
        
    except Exception as e:
        logger.logger.error(f"Error getting vendor OCR results: {e}")
        raise HTTPException(status_code=500, detail="Failed to get vendor OCR results")