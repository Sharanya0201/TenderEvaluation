from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Dict, Any
from app.models.user import TenderVendorMapping, Tender, Vendor
from app.schemas.user import TenderVendorMappingCreate, BulkMappingCreate, TenderVendorMappingUpdate


def create_tender_vendor_mapping(db: Session, mapping: TenderVendorMappingCreate):
    """
    Create a new tender-vendor mapping
    """
    tender_id = mapping.tender_id
    vendor_id = mapping.vendor_id
    status = mapping.status or "active"

    # Check if tender exists
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    # Check if vendor exists
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Check if mapping already exists
    existing_mapping = db.query(TenderVendorMapping).filter(
        TenderVendorMapping.tender_id == tender_id,
        TenderVendorMapping.vendor_id == vendor_id
    ).first()
    
    if existing_mapping:
        raise HTTPException(status_code=400, detail="Mapping already exists")

    # Create new mapping
    db_mapping = TenderVendorMapping(
        tender_id=tender_id,
        vendor_id=vendor_id,
        status=status
    )

    db.add(db_mapping)
    db.commit()
    db.refresh(db_mapping)
    
    # Convert to dict for serialization
    mapping_dict = {
        "id": db_mapping.id,
        "tender_id": db_mapping.tender_id,
        "vendor_id": db_mapping.vendor_id,
        "status": db_mapping.status,
        "mapped_date": db_mapping.mapped_date,
        "created_at": db_mapping.created_at,
        "updated_at": db_mapping.updated_at
    }
    
    return {
        "success": True,
        "message": "Tender-Vendor mapping created successfully",
        "mapping": mapping_dict
    }


def bulk_create_mappings(db: Session, bulk_data: BulkMappingCreate):
    """
    Create multiple vendor mappings for a tender
    """
    tender_id = bulk_data.tender_id
    vendor_ids = bulk_data.vendor_ids

    # Check if tender exists
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    created_count = 0
    existing_count = 0
    error_vendors = []

    for vendor_id in vendor_ids:
        # Check if vendor exists
        vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if not vendor:
            error_vendors.append(vendor_id)
            continue

        # Check if mapping already exists
        existing_mapping = db.query(TenderVendorMapping).filter(
            TenderVendorMapping.tender_id == tender_id,
            TenderVendorMapping.vendor_id == vendor_id
        ).first()
        
        if existing_mapping:
            existing_count += 1
            continue

        # Create new mapping
        db_mapping = TenderVendorMapping(
            tender_id=tender_id,
            vendor_id=vendor_id,
            status="active"
        )
        db.add(db_mapping)
        created_count += 1

    db.commit()

    return {
        "success": True,
        "message": f"Created {created_count} mappings, {existing_count} already existed, {len(error_vendors)} vendors not found",
        "created_count": created_count,
        "existing_count": existing_count,
        "error_vendors": error_vendors
    }


def get_tender_vendor_mappings(db: Session, skip: int = 0, limit: int = 100):
    """
    Get all tender-vendor mappings with pagination
    """
    mappings = db.query(TenderVendorMapping).offset(skip).limit(limit).all()
    total = db.query(TenderVendorMapping).count()

    # Enrich with tender and vendor details as dictionaries
    enriched_mappings = []
    for mapping in mappings:
        mapping_dict = {
            "id": mapping.id,
            "tender_id": mapping.tender_id,
            "vendor_id": mapping.vendor_id,
            "status": mapping.status,
            "mapped_date": mapping.mapped_date,
            "created_at": mapping.created_at,
            "updated_at": mapping.updated_at,
            "tender": {
                "id": mapping.tender.id,
                "tender_type_code": mapping.tender.tender_type_code,
                "tender": mapping.tender.tender,
                "description": mapping.tender.description,
                "created_at": mapping.tender.created_at
            } if mapping.tender else None,
            "vendor": {
                "id": mapping.vendor.id,
                "vendor_name": mapping.vendor.vendor_name,
                "org_type": mapping.vendor.org_type,
                "contact_person_name": mapping.vendor.contact_person_name,
                "contact_person_email": mapping.vendor.contact_person_email,
                "contact_person_mobile": mapping.vendor.contact_person_mobile
            } if mapping.vendor else None
        }
        enriched_mappings.append(mapping_dict)

    return {
        "success": True,
        "mappings": enriched_mappings,
        "total": total
    }


def get_mappings_by_tender(db: Session, tender_id: int):
    """
    Get all vendors mapped to a specific tender
    """
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    mappings = db.query(TenderVendorMapping).filter(
        TenderVendorMapping.tender_id == tender_id
    ).all()

    vendors = []
    for mapping in mappings:
        vendor_dict = {
            "id": mapping.vendor.id,
            "vendor_name": mapping.vendor.vendor_name,
            "org_type": mapping.vendor.org_type,
            "contact_person_name": mapping.vendor.contact_person_name,
            "contact_person_email": mapping.vendor.contact_person_email,
            "contact_person_mobile": mapping.vendor.contact_person_mobile,
            "mapping_id": mapping.id,
            "mapping_status": mapping.status,
            "mapped_date": mapping.mapped_date
        }
        vendors.append(vendor_dict)

    tender_dict = {
        "id": tender.id,
        "tender_type_code": tender.tender_type_code,
        "tender": tender.tender,
        "description": tender.description,
        "created_at": tender.created_at
    }

    return {
        "success": True,
        "tender": tender_dict,
        "vendors": vendors,
        "total": len(vendors)
    }


def get_mappings_by_vendor(db: Session, vendor_id: int):
    """
    Get all tenders mapped to a specific vendor
    """
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    mappings = db.query(TenderVendorMapping).filter(
        TenderVendorMapping.vendor_id == vendor_id
    ).all()

    tenders = []
    for mapping in mappings:
        tender_dict = {
            "id": mapping.tender.id,
            "tender_type_code": mapping.tender.tender_type_code,
            "tender": mapping.tender.tender,
            "description": mapping.tender.description,
            "created_at": mapping.tender.created_at,
            "mapping_id": mapping.id,
            "mapping_status": mapping.status,
            "mapped_date": mapping.mapped_date
        }
        tenders.append(tender_dict)

    vendor_dict = {
        "id": vendor.id,
        "vendor_name": vendor.vendor_name,
        "org_type": vendor.org_type,
        "contact_person_name": vendor.contact_person_name
    }

    return {
        "success": True,
        "vendor": vendor_dict,
        "tenders": tenders,
        "total": len(tenders)
    }


def update_tender_vendor_mapping(db: Session, mapping_id: int, mapping_update: TenderVendorMappingUpdate):
    """
    Update a tender-vendor mapping
    """
    db_mapping = db.query(TenderVendorMapping).filter(TenderVendorMapping.id == mapping_id).first()
    if not db_mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    if mapping_update.status is not None:
        db_mapping.status = mapping_update.status

    db.commit()
    db.refresh(db_mapping)

    # Convert to dict for serialization
    mapping_dict = {
        "id": db_mapping.id,
        "tender_id": db_mapping.tender_id,
        "vendor_id": db_mapping.vendor_id,
        "status": db_mapping.status,
        "mapped_date": db_mapping.mapped_date,
        "created_at": db_mapping.created_at,
        "updated_at": db_mapping.updated_at
    }

    return {
        "success": True,
        "message": "Mapping updated successfully",
        "mapping": mapping_dict
    }


def delete_tender_vendor_mapping(db: Session, mapping_id: int):
    """
    Delete a tender-vendor mapping
    """
    db_mapping = db.query(TenderVendorMapping).filter(TenderVendorMapping.id == mapping_id).first()
    if not db_mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    db.delete(db_mapping)
    db.commit()

    return {
        "success": True,
        "message": "Mapping deleted successfully"
    }


def get_available_vendors_for_tender(db: Session, tender_id: int):
    """
    Get vendors that are NOT yet mapped to a specific tender
    """
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    # Get all vendor IDs that are already mapped to this tender
    mapped_vendor_ids = db.query(TenderVendorMapping.vendor_id).filter(
        TenderVendorMapping.tender_id == tender_id
    ).all()
    mapped_vendor_ids = [vid[0] for vid in mapped_vendor_ids]

    # Get vendors that are not mapped
    if mapped_vendor_ids:
        available_vendors = db.query(Vendor).filter(
            Vendor.id.notin_(mapped_vendor_ids)
        ).all()
    else:
        available_vendors = db.query(Vendor).all()

    # Convert vendors to dictionaries for serialization
    available_vendors_dict = []
    for vendor in available_vendors:
        vendor_dict = {
            "id": vendor.id,
            "vendor_name": vendor.vendor_name,
            "org_type": vendor.org_type,
            "incorp_date": vendor.incorp_date,
            "nature_of_business": vendor.nature_of_business,
            "contact_person_name": vendor.contact_person_name,
            "contact_person_designation": vendor.contact_person_designation,
            "contact_person_mobile": vendor.contact_person_mobile,
            "contact_person_email": vendor.contact_person_email,
            "telephone_number": vendor.telephone_number,
            "email_address": vendor.email_address,
            "website": vendor.website
        }
        available_vendors_dict.append(vendor_dict)

    return {
        "success": True,
        "available_vendors": available_vendors_dict,
        "total": len(available_vendors_dict)
    }