from sqlalchemy.orm import Session
from app.models.user import Vendor
from app.schemas.vendor import VendorCreate


def register_vendor(db: Session, vendor: VendorCreate):
    try:
        # Handle date conversion if incorp_date is provided as string
        incorp_date = vendor.incorp_date
        
        if isinstance(incorp_date, str) and incorp_date.strip():
            from datetime import datetime
            try:
                incorp_date = datetime.strptime(incorp_date, "%Y-%m-%d").date()
            except ValueError:
                incorp_date = None
        elif isinstance(incorp_date, str) and not incorp_date.strip():
            incorp_date = None
        # If incorp_date is already None, keep it as None
        
        db_vendor = Vendor(
            vendor_name=vendor.vendor_name,
            org_type=vendor.org_type,
            incorp_date=incorp_date,
            nature_of_business=vendor.nature_of_business,

        # Registered Address
        reg_address_line1=vendor.reg_address_line1,
        reg_address_line2=vendor.reg_address_line2,
        reg_address_city=vendor.reg_address_city,
        reg_address_state=vendor.reg_address_state,
        reg_address_pincode=vendor.reg_address_pincode,

        # Correspondence Address
        corr_address_line1=vendor.corr_address_line1,
        corr_address_line2=vendor.corr_address_line2,
        corr_address_city=vendor.corr_address_city,
        corr_address_state=vendor.corr_address_state,
        corr_address_pincode=vendor.corr_address_pincode,

        same_as_registered=vendor.same_as_registered,

        # Contact Person
        contact_person_name=vendor.contact_person_name,
        contact_person_designation=vendor.contact_person_designation,
        contact_person_mobile=vendor.contact_person_mobile,
        contact_person_email=vendor.contact_person_email,

        # Company Details
        telephone_number=vendor.telephone_number,
        fax_number=vendor.fax_number,
        email_address=vendor.email_address,
        website=vendor.website,
        company_representative_name=vendor.company_representative_name,
        company_representative_title=vendor.company_representative_title,
        rep_direct_email=vendor.rep_direct_email,
        rep_direct_number=vendor.rep_direct_number,
        rep_mobile_number=vendor.rep_mobile_number,

        # Financial Info
        gross_annual_sales_y1=vendor.gross_annual_sales_y1,
        gross_annual_sales_y2=vendor.gross_annual_sales_y2,
        gross_annual_sales_y3=vendor.gross_annual_sales_y3,

        # Business Info
        legal_structure=vendor.legal_structure,
        type_of_business=vendor.type_of_business,
        services_or_goods_details=vendor.services_or_goods_details,
        geographic_service_area=vendor.geographic_service_area,
        geographic_service_specify=vendor.geographic_service_specify,

        # Previous Business
        previous_business_with_wto=vendor.previous_business_with_wto,
        wto_business_years=vendor.wto_business_years,
        previous_business_with_others=vendor.previous_business_with_others,
        other_organization_names_years=vendor.other_organization_names_years,

        # Bank Info
        bank_name=vendor.bank_name,
        bank_address=vendor.bank_address,
        beneficiary_name=vendor.beneficiary_name,
        iban=vendor.iban,
        swift_code=vendor.swift_code,
        account_currency=vendor.account_currency,
        bank_account_number=vendor.bank_account_number,

        # Declaration & Signature
        declaration=vendor.declaration,
        final_signatory_name=vendor.final_signatory_name,
        final_signatory_designation=vendor.final_signatory_designation,
        signature_name=vendor.signature_name,
        signature_title=vendor.signature_title,
        signature_date=vendor.signature_date,
    )

        db.add(db_vendor)
        db.commit()
        db.refresh(db_vendor)

        return {
            "success": True,
            "message": "Vendor registered successfully",
            "vendor": db_vendor,
        }
    except Exception as e:
        db.rollback()
        raise e
