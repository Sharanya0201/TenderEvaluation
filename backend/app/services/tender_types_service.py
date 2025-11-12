from sqlalchemy.orm import Session
from app.models.user import TenderType
from app.schemas.tender_types import TenderTypeCreate, TenderTypeUpdate


def create_tender_type(db: Session, tender_type: TenderTypeCreate):
    """Create a new tender type with its form configurations stored as JSON"""
    db_tender_type = TenderType(
        code=tender_type.code,
        name=tender_type.name,
        description=tender_type.description,
        icon=tender_type.icon,
        config_file_name=tender_type.config_file_name,
        form_configs=tender_type.form_configs,  # Store as JSON
        is_active=tender_type.is_active
    )
    
    db.add(db_tender_type)
    db.commit()
    db.refresh(db_tender_type)
    
    return {
        "success": True,
        "message": "Tender type created successfully",
        "tender_type": db_tender_type
    }


def get_tender_types(db: Session, skip: int = 0, limit: int = 100):
    """Get all tender types with their form configurations"""
    tender_types = db.query(TenderType).offset(skip).limit(limit).all()
    return {
        "success": True,
        "message": "Tender types retrieved successfully",
        "tender_types": tender_types
    }


def get_tender_type_by_code(db: Session, code: str):
    """Get a specific tender type by code"""
    tender_type = db.query(TenderType).filter(TenderType.code == code).first()
    if not tender_type:
        return None
    return tender_type


def update_tender_type(db: Session, code: str, tender_type_update: TenderTypeUpdate):
    """Update a tender type and its form configurations"""
    db_tender_type = db.query(TenderType).filter(TenderType.code == code).first()
    if not db_tender_type:
        return None
    
    # Update tender type fields
    if tender_type_update.name is not None:
        db_tender_type.name = tender_type_update.name
    if tender_type_update.description is not None:
        db_tender_type.description = tender_type_update.description
    if tender_type_update.icon is not None:
        db_tender_type.icon = tender_type_update.icon
    if tender_type_update.config_file_name is not None:
        db_tender_type.config_file_name = tender_type_update.config_file_name
    if tender_type_update.is_active is not None:
        db_tender_type.is_active = tender_type_update.is_active
    if tender_type_update.form_configs is not None:
        db_tender_type.form_configs = tender_type_update.form_configs
    
    db.commit()
    db.refresh(db_tender_type)
    
    return {
        "success": True,
        "message": "Tender type updated successfully",
        "tender_type": db_tender_type
    }


def delete_tender_type(db: Session, code: str):
    """Delete a tender type and cascade delete associated tenders"""
    from app.models.user import Tender, TenderAttachment
    
    db_tender_type = db.query(TenderType).filter(TenderType.code == code).first()
    if not db_tender_type:
        return None
    
    try:
        # Find all tenders associated with this tender type
        associated_tenders = db.query(Tender).filter(
            (Tender.tender_type_code == code) | (Tender.tender_type_id == db_tender_type.id)
        ).all()
        
        deleted_tenders_count = len(associated_tenders)
        
        if deleted_tenders_count > 0:
            # Get all tender IDs
            tender_ids = [tender.id for tender in associated_tenders]
            
            # Delete all attachments for these tenders first (bulk delete)
            db.query(TenderAttachment).filter(TenderAttachment.tender_id.in_(tender_ids)).delete(synchronize_session=False)
            db.flush()  # Flush to ensure attachments are deleted before deleting tenders
            
            # Now delete all tenders (bulk delete)
            db.query(Tender).filter(Tender.id.in_(tender_ids)).delete(synchronize_session=False)
            db.flush()  # Flush to ensure tenders are deleted before deleting tender type
        
        # Now delete the tender type
        db.delete(db_tender_type)
        db.commit()
        
        if deleted_tenders_count > 0:
            return {
                "success": True,
                "message": f"Tender type '{code}' deleted successfully. {deleted_tenders_count} associated tender(s) were also deleted."
            }
        else:
            return {
                "success": True,
                "message": "Tender type deleted successfully"
            }
    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "message": f"Failed to delete tender type: {str(e)}",
            "error": "DELETE_FAILED"
        }


def bulk_import_tender_types(db: Session, tender_types_data: dict):
    """Import multiple tender types from JSON data"""
    imported_count = 0
    
    for code, type_data in tender_types_data.items():
        # Check if tender type already exists
        existing = db.query(TenderType).filter(TenderType.code == code).first()
        if existing:
            continue  # Skip existing types
        
        # Create new tender type
        db_tender_type = TenderType(
            code=code,
            name=type_data.get('name', ''),
            description=type_data.get('description', ''),
            icon=type_data.get('icon', ''),
            config_file_name=type_data.get('config', ''),
            form_configs=type_data.get('form_configs', []),  # Store form configs as JSON
            is_active=True
        )
        
        db.add(db_tender_type)
        imported_count += 1
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Imported {imported_count} tender types successfully",
        "imported_count": imported_count
    }
