from sqlalchemy import Column, Float, Integer, String, Boolean, DateTime, ForeignKey, Date, LargeBinary, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

    # Relationship back to users
    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    mobile_number = Column(String(15), nullable=True)  # optional for viewers
    email = Column(String(120), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    # Link to roles table (can be null for viewers)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
    role_name = Column(String(50), nullable=False, default="Viewer")

    # Account status + timestamps
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # ORM relationship
    role = relationship("Role", back_populates="users")


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)

    # --- Basic Info ---
    vendor_name = Column(String(255), nullable=False)
    org_type = Column(String(100), nullable=False)
    incorp_date = Column(Date, nullable=True)
    nature_of_business = Column(String(255))

    # --- Registered Address ---
    reg_address_line1 = Column(String(255), nullable=False)
    reg_address_line2 = Column(String(255))
    reg_address_city = Column(String(100), nullable=False)
    reg_address_state = Column(String(100), nullable=False)
    reg_address_pincode = Column(String(20), nullable=False)

    # --- Correspondence Address ---
    corr_address_line1 = Column(String(255), nullable=False)
    corr_address_line2 = Column(String(255))
    corr_address_city = Column(String(100), nullable=False)
    corr_address_state = Column(String(100), nullable=False)
    corr_address_pincode = Column(String(20), nullable=False)

    same_as_registered = Column(Boolean, default=False)

    # --- Contact Person ---
    contact_person_name = Column(String(255), nullable=False)
    contact_person_designation = Column(String(100), nullable=False)
    contact_person_mobile = Column(String(20), nullable=False)
    contact_person_email = Column(String(100), nullable=False)

    # --- Company Details ---
    telephone_number = Column(String(50))
    fax_number = Column(String(50))
    email_address = Column(String(100))
    website = Column(String(150))
    company_representative_name = Column(String(255))
    company_representative_title = Column(String(100))
    rep_direct_email = Column(String(100))
    rep_direct_number = Column(String(50))
    rep_mobile_number = Column(String(50))

    # --- Financial Info ---
    gross_annual_sales_y1 = Column(String(50))
    gross_annual_sales_y2 = Column(String(50))
    gross_annual_sales_y3 = Column(String(50))

    # --- Business Type ---
    legal_structure = Column(String(100))
    type_of_business = Column(String(255))
    services_or_goods_details = Column(String(500))
    geographic_service_area = Column(String(100))
    geographic_service_specify = Column(String(100))

    # --- Previous Business Info ---
    previous_business_with_wto = Column(Boolean, default=False)
    wto_business_years = Column(String(50))
    previous_business_with_others = Column(Boolean, default=False)
    other_organization_names_years = Column(String(255))

    # --- Bank Info ---
    bank_name = Column(String(255))
    bank_address = Column(String(255))
    beneficiary_name = Column(String(255))
    iban = Column(String(100))
    swift_code = Column(String(100))
    account_currency = Column(String(50))
    bank_account_number = Column(String(100))

    # --- Declaration & Signature ---
    declaration = Column(Boolean, default=False)
    final_signatory_name = Column(String(255))
    final_signatory_designation = Column(String(100))
    signature_name = Column(String(255))
    signature_title = Column(String(100))
    signature_date = Column(Date)

    # Relationships
    tender_mappings = relationship("TenderVendorMapping", back_populates="vendor")
    evaluations = relationship("TenderEvaluation", back_populates="vendor")

    __table_args__ = {"extend_existing": True}


class VendorDocument(Base):
    __tablename__ = "vendor_documents"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=True)  # Made optional since we're storing in DB
    file_content = Column(LargeBinary, nullable=False)  # Store actual file content
    file_size = Column(Integer)
    content_type = Column(String(100))
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = {"extend_existing": True}


class TenderType(Base):
    __tablename__ = "tender_types"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    icon = Column(String(100))
    config_file_name = Column(String(255))
    form_configs = Column(JSON)  # Store form configurations as JSON
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = {"extend_existing": True}


class Tender(Base):
    __tablename__ = "tenders"

    id = Column(Integer, primary_key=True, index=True)
    tender_type_code = Column(String(50), ForeignKey("tender_types.code"), nullable=False, index=True)
    tender_type_id = Column(Integer, ForeignKey("tender_types.id"), nullable=True, index=True)
    tender = Column(String(255))
    description = Column(Text)
    form_data = Column(JSON, nullable=False)  # Store submitted form fields as JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    status = Column(String)

    # Relationships
    vendor_mappings = relationship("TenderVendorMapping", back_populates="tender")
    evaluations = relationship("TenderEvaluation", back_populates="tender")
    __table_args__ = {"extend_existing": True}


class TenderAttachment(Base):
    __tablename__ = "tender_attachments"

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"), nullable=False, index=True)
    field_key = Column(String(255), nullable=True)  # which field this file belongs to
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    content_type = Column(String(100))
    file_size = Column(Integer)
    file_content = Column(LargeBinary, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = {"extend_existing": True}


class TenderVendorMapping(Base):
    __tablename__ = "tender_vendor_mappings"

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"), nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False, index=True)
    mapped_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(20), default="active")  # active, inactive, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    tender = relationship("Tender", back_populates="vendor_mappings")
    vendor = relationship("Vendor", back_populates="tender_mappings")

    __table_args__ = {"extend_existing": True}



class EvaluationCriterion(Base):
    __tablename__ = "evaluation_criteria"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    weightage = Column(Float, nullable=False)  # Percentage weight
    max_score = Column(Float, nullable=False)  # Maximum score possible
    category = Column(String(100), nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    is_custom = Column(Boolean, default=True)  # Whether it's custom or default
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    tender_evaluations = relationship("TenderEvaluation", back_populates="criterion")
    
    __table_args__ = {"extend_existing": True}


class TenderEvaluation(Base):
    __tablename__ = "tender_evaluations"
    
    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"), nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False, index=True)
    criterion_id = Column(Integer, ForeignKey("evaluation_criteria.id"), nullable=False, index=True)
    score = Column(Float, nullable=False)
    comments = Column(Text)
    evaluated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    evaluated_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    tender = relationship("Tender", back_populates="evaluations")
    vendor = relationship("Vendor", back_populates="evaluations")
    criterion = relationship("EvaluationCriterion", back_populates="tender_evaluations")
    evaluator = relationship("User")
    
    __table_args__ = {"extend_existing": True}


class OCRResult(Base):
    __tablename__ = "ocr_results"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("vendor_documents.id"), nullable=False, index=True)
    status = Column(String(50), default='pending')  # pending, processing, completed, failed, corrected
    ocr_text = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    corrected_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    document = relationship("VendorDocument", backref="ocr_results")
    
    __table_args__ = {"extend_existing": True}