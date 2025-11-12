from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import date


class VendorCreate(BaseModel):
    # --- Basic Info ---
    vendor_name: Optional[str] = "Unnamed Vendor"
    org_type: Optional[str] = "Not Specified"
    incorp_date: Optional[str] = None
    nature_of_business: Optional[str] = None

    # --- Registered Address ---
    reg_address_line1: Optional[str] = "Not Provided"
    reg_address_line2: Optional[str] = None
    reg_address_city: Optional[str] = "Not Provided"
    reg_address_state: Optional[str] = "Not Provided"
    reg_address_pincode: Optional[str] = "000000"

    # --- Correspondence Address ---
    corr_address_line1: Optional[str] = "Not Provided"
    corr_address_line2: Optional[str] = None
    corr_address_city: Optional[str] = "Not Provided"
    corr_address_state: Optional[str] = "Not Provided"
    corr_address_pincode: Optional[str] = "000000"

    same_as_registered: bool = False

    # --- Contact Person ---
    contact_person_name: Optional[str] = "Not Provided"
    contact_person_designation: Optional[str] = "Not Provided"
    contact_person_mobile: Optional[str] = "0000000000"
    contact_person_email: Optional[str] = "notprovided@example.com"

    # --- Company Details ---
    telephone_number: Optional[str] = None
    fax_number: Optional[str] = None
    email_address: Optional[str] = None
    website: Optional[str] = None
    company_representative_name: Optional[str] = None
    company_representative_title: Optional[str] = None
    rep_direct_email: Optional[str] = None
    rep_direct_number: Optional[str] = None
    rep_mobile_number: Optional[str] = None

    # --- Financial Info ---
    gross_annual_sales_y1: Optional[str] = None
    gross_annual_sales_y2: Optional[str] = None
    gross_annual_sales_y3: Optional[str] = None

    # --- Business Type ---
    legal_structure: Optional[str] = None
    type_of_business: Optional[str] = None
    services_or_goods_details: Optional[str] = None
    geographic_service_area: Optional[str] = None
    geographic_service_specify: Optional[str] = None

    # --- Previous Business Info ---
    previous_business_with_wto: Optional[bool] = False
    wto_business_years: Optional[str] = None
    previous_business_with_others: Optional[bool] = False
    other_organization_names_years: Optional[str] = None

    # --- Bank Info ---
    bank_name: Optional[str] = None
    bank_address: Optional[str] = None
    beneficiary_name: Optional[str] = None
    iban: Optional[str] = None
    swift_code: Optional[str] = None
    account_currency: Optional[str] = None
    bank_account_number: Optional[str] = None

    # --- Declaration & Signature ---
    declaration: Optional[bool] = False
    final_signatory_name: Optional[str] = None
    final_signatory_designation: Optional[str] = None
    signature_name: Optional[str] = None
    signature_title: Optional[str] = None
    signature_date: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)


class VendorData(BaseModel):
    id: int
    vendor_name: str
    org_type: str
    incorp_date: date
    contact_person_name: str
    final_signatory_name: Optional[str]
    final_signatory_designation: Optional[str]
    declaration: bool

    model_config = ConfigDict(from_attributes=True)


class VendorResponse(BaseModel):
    success: bool
    message: str
    vendor: VendorData

    model_config = ConfigDict(from_attributes=True)


class VendorFull(BaseModel):
    id: int

    # --- Basic Info ---
    vendor_name: str
    org_type: str
    incorp_date: Optional[date] = None
    nature_of_business: Optional[str] = None

    # --- Registered Address ---
    reg_address_line1: str
    reg_address_line2: Optional[str] = None
    reg_address_city: str
    reg_address_state: str
    reg_address_pincode: str

    # --- Correspondence Address ---
    corr_address_line1: str
    corr_address_line2: Optional[str] = None
    corr_address_city: str
    corr_address_state: str
    corr_address_pincode: str

    same_as_registered: Optional[bool] = None

    # --- Contact Person ---
    contact_person_name: str
    contact_person_designation: str
    contact_person_mobile: str
    contact_person_email: EmailStr

    # --- Company Details ---
    telephone_number: Optional[str] = None
    fax_number: Optional[str] = None
    email_address: Optional[EmailStr] = None
    website: Optional[str] = None
    company_representative_name: Optional[str] = None
    company_representative_title: Optional[str] = None
    rep_direct_email: Optional[EmailStr] = None
    rep_direct_number: Optional[str] = None
    rep_mobile_number: Optional[str] = None

    # --- Financial Info ---
    gross_annual_sales_y1: Optional[str] = None
    gross_annual_sales_y2: Optional[str] = None
    gross_annual_sales_y3: Optional[str] = None

    # --- Business Type ---
    legal_structure: Optional[str] = None
    type_of_business: Optional[str] = None
    services_or_goods_details: Optional[str] = None
    geographic_service_area: Optional[str] = None
    geographic_service_specify: Optional[str] = None

    # --- Previous Business Info ---
    previous_business_with_wto: Optional[bool] = None
    wto_business_years: Optional[str] = None
    previous_business_with_others: Optional[bool] = None
    other_organization_names_years: Optional[str] = None

    # --- Bank Info ---
    bank_name: Optional[str] = None
    bank_address: Optional[str] = None
    beneficiary_name: Optional[str] = None
    iban: Optional[str] = None
    swift_code: Optional[str] = None
    account_currency: Optional[str] = None
    bank_account_number: Optional[str] = None

    # --- Declaration & Signature ---
    declaration: Optional[bool] = None
    final_signatory_name: Optional[str] = None
    final_signatory_designation: Optional[str] = None
    signature_name: Optional[str] = None
    signature_title: Optional[str] = None
    signature_date: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)


class VendorUpdate(BaseModel):
    # All fields optional for partial updates
    vendor_name: Optional[str] = None
    org_type: Optional[str] = None
    incorp_date: Optional[date] = None
    nature_of_business: Optional[str] = None

    reg_address_line1: Optional[str] = None
    reg_address_line2: Optional[str] = None
    reg_address_city: Optional[str] = None
    reg_address_state: Optional[str] = None
    reg_address_pincode: Optional[str] = None

    corr_address_line1: Optional[str] = None
    corr_address_line2: Optional[str] = None
    corr_address_city: Optional[str] = None
    corr_address_state: Optional[str] = None
    corr_address_pincode: Optional[str] = None

    same_as_registered: Optional[bool] = None

    contact_person_name: Optional[str] = None
    contact_person_designation: Optional[str] = None
    contact_person_mobile: Optional[str] = None
    contact_person_email: Optional[EmailStr] = None

    telephone_number: Optional[str] = None
    fax_number: Optional[str] = None
    email_address: Optional[EmailStr] = None
    website: Optional[str] = None
    company_representative_name: Optional[str] = None
    company_representative_title: Optional[str] = None
    rep_direct_email: Optional[EmailStr] = None
    rep_direct_number: Optional[str] = None
    rep_mobile_number: Optional[str] = None

    gross_annual_sales_y1: Optional[str] = None
    gross_annual_sales_y2: Optional[str] = None
    gross_annual_sales_y3: Optional[str] = None

    legal_structure: Optional[str] = None
    type_of_business: Optional[str] = None
    services_or_goods_details: Optional[str] = None
    geographic_service_area: Optional[str] = None
    geographic_service_specify: Optional[str] = None

    previous_business_with_wto: Optional[bool] = None
    wto_business_years: Optional[str] = None
    previous_business_with_others: Optional[bool] = None
    other_organization_names_years: Optional[str] = None

    bank_name: Optional[str] = None
    bank_address: Optional[str] = None
    beneficiary_name: Optional[str] = None
    iban: Optional[str] = None
    swift_code: Optional[str] = None
    account_currency: Optional[str] = None
    bank_account_number: Optional[str] = None

    declaration: Optional[bool] = None
    final_signatory_name: Optional[str] = None
    final_signatory_designation: Optional[str] = None
    signature_name: Optional[str] = None
    signature_title: Optional[str] = None
    signature_date: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)
