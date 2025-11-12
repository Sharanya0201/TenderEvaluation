import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.user import Tender, TenderAttachment, TenderType


def create_tender(db: Session, payload: Dict[str, Any]) -> Tender:
    # Get tender_type_id if not provided, derive it from tender_type_code
    tender_type_id = payload.get("tender_type_id")
    if not tender_type_id:
        tender_type = db.query(TenderType).filter(TenderType.code == payload["tender_type_code"]).first()
        if tender_type:
            tender_type_id = tender_type.id
    
    tender = Tender(
        tender_type_code=payload["tender_type_code"],
        tender_type_id=tender_type_id,
        tender=payload.get("tender"),
        description=payload.get("description"),
        form_data=payload["form_data"],
        status=payload.get("status", "Draft"),
    )
    db.add(tender)
    db.commit()
    db.refresh(tender)
    return tender


def save_tender_attachments(
    db: Session,
    tender_id: int,
    files: List[Dict[str, Any]],
) -> List[TenderAttachment]:
    saved: List[TenderAttachment] = []
    for f in files:
        # f: {"filename", "content_type", "content", "field_key"}
        ext = Path(f["filename"]).suffix.lower()
        safe_name = f"{uuid.uuid4().hex}{ext}"
        file_content: bytes = f["content"]
        att = TenderAttachment(
            tender_id=tender_id,
            field_key=f.get("field_key"),
            original_filename=f["filename"],
            stored_filename=safe_name,
            content_type=f.get("content_type"),
            file_size=len(file_content) if file_content else None,
            file_content=file_content,
        )
        db.add(att)
        db.commit()
        db.refresh(att)
        saved.append(att)
    return saved


def get_tender_by_id(db: Session, tender_id: int) -> Optional[Tender]:
    """Get a tender by ID"""
    return db.query(Tender).filter(Tender.id == tender_id).first()


def update_tender(db: Session, tender_id: int, update_data: Dict[str, Any]) -> Optional[Tender]:
    """Update a tender"""
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        return None
    
    # If tender_type_code is updated, also update tender_type_id
    if "tender_type_code" in update_data and update_data["tender_type_code"]:
        tender_type = db.query(TenderType).filter(TenderType.code == update_data["tender_type_code"]).first()
        if tender_type:
            update_data["tender_type_id"] = tender_type.id
    
    for key, value in update_data.items():
        if value is not None:
            setattr(tender, key, value)
    
    db.commit()
    db.refresh(tender)
    return tender


def delete_tender(db: Session, tender_id: int) -> bool:
    """Delete a tender and all its associated records"""
    from app.models.user import TenderVendorMapping, TenderEvaluation
    
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        return False
    
    try:
        # Delete associated evaluations first (using bulk delete for efficiency)
        db.query(TenderEvaluation).filter(TenderEvaluation.tender_id == tender_id).delete(synchronize_session=False)
        db.flush()
        
        # Delete associated vendor mappings
        db.query(TenderVendorMapping).filter(TenderVendorMapping.tender_id == tender_id).delete(synchronize_session=False)
        db.flush()
        
        # Delete associated attachments (must be done before deleting tender)
        db.query(TenderAttachment).filter(TenderAttachment.tender_id == tender_id).delete(synchronize_session=False)
        db.flush()
        
        # Finally, delete the tender itself
        db.delete(tender)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Error deleting tender {tender_id}: {str(e)}")
        raise e


def list_tenders_filtered(
    db: Session,
    tender_type_code: Optional[str] = None,
    status: Optional[str] = None,
) -> List[Tender]:
    """List tenders with optional filtering"""
    query = db.query(Tender)
    
    if tender_type_code:
        query = query.filter(Tender.tender_type_code == tender_type_code)
    
    if status:
        query = query.filter(Tender.status == status)
    
    return query.order_by(Tender.id.desc()).all()

