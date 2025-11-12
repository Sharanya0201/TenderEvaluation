from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Dict, Any  # Add Dict and Any here
from datetime import date, datetime


# ==========================================
# 🔹 Base Schemas (Common Fields)
# ==========================================
class UserBase(BaseModel):
    username: str
    email: EmailStr
    mobile_number: Optional[str] = None
    role_id: Optional[int] = None
    role_name: Optional[str] = "Viewer"  # Default for public users


# ==========================================
# 🔹 Creation Schemas
# ==========================================
class UserCreate(UserBase):
    password: str
    confirm_password: Optional[str] = None

    # 🔸 Validators
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

    @validator('password')
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v

    @validator('mobile_number')
    def mobile_number_format(cls, v):
        if v and (not v.isdigit() or len(v) != 10):
            raise ValueError('Mobile number must be 10 digits')
        return v


# ==========================================
# 🔹 Login Schema (common for all users)
# ==========================================
class UserLogin(BaseModel):
    username: str
    password: str


# ==========================================
# 🔹 Update Schema
# ==========================================
class UserUpdate(BaseModel):
    username: Optional[str] = None
    mobile_number: Optional[str] = None
    email: Optional[EmailStr] = None
    role_id: Optional[int] = None
    password: Optional[str] = None
    role_name: Optional[str] = None

    @validator('mobile_number')
    def mobile_number_format(cls, v):
        if v and (not v.isdigit() or len(v) != 10):
            raise ValueError('Mobile number must be 10 digits')
        return v

    @validator('password')
    def password_strength(cls, v):
        if v and len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v


# ==========================================
# 🔹 Response Schemas
# ==========================================
class UserData(BaseModel):
    id: int
    username: str
    email: EmailStr
    mobile_number: Optional[str] = None
    role_id: Optional[int] = None
    role_name: Optional[str] = "Viewer"
    is_active: bool
    created_at: datetime

    class Config:
        orm_mode = True


class UserResponse(BaseModel):
    success: bool
    message: str
    user: UserData


class UserListResponse(BaseModel):
    success: bool
    users: List[UserData]
    total: int


# ==========================================
# 🔹 Role Schemas
# ==========================================
class RoleBase(BaseModel):
    role_name: str
    description: Optional[str] = None
    is_active: Optional[bool] = True  # Add this to base


class RoleCreate(RoleBase):
    pass


class RoleUpdate(RoleBase):
    role_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class RoleResponse(RoleBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True


class RoleListResponse(BaseModel):
    success: bool
    roles: List[RoleResponse]


class RoleResponseWithMessage(BaseModel):
    success: bool
    message: str
    role: RoleResponse


# ==========================================
# 🔹 Status Update Schema
# ==========================================
class UserStatusUpdate(BaseModel):
    is_active: bool

class RoleStatusUpdate(BaseModel):
    is_active: bool    


# Schema for creating a Vendor
class VendorCreate(BaseModel):
    vendor_name: str
    org_type: str
    incorp_date: date
    reg_address_line1: str
    reg_address_line2: Optional[str] = None
    reg_address_city: str
    reg_address_state: str
    reg_address_pincode: str
    corr_address_line1: str
    corr_address_line2: Optional[str] = None
    corr_address_city: str
    corr_address_state: str
    corr_address_pincode: str
    same_as_registered: bool = False
    nature_of_business: str
    contact_person_name: str
    contact_person_designation: str
    contact_person_mobile: str
    contact_person_email: EmailStr
    country_of_origin: str
    company_reg_no: str
    pan: str
    gst: str
    msme: Optional[str] = None
    iec: Optional[str] = None
    dsc_details: Optional[str] = None
    auth_signatory_name: str
    auth_signatory_designation: str
    bank_name: str
    bank_branch: str
    bank_account_no: str
    bank_ifsc: str
    bank_swift: Optional[str] = None
    category: str
    clients_projects: Optional[str] = None
    years_experience: int
    certifications: Optional[str] = None
    turnover_y1: Optional[str] = None
    turnover_y2: Optional[str] = None
    turnover_y3: Optional[str] = None
    declaration: bool
    final_signatory_name: str
    final_signatory_designation: str
    place: str
    date: date
    digital_signature: Optional[str] = None

    class Config:
        orm_mode = True


# Schema for querying and displaying Vendor data (without sensitive information)
class VendorData(BaseModel):
    id: int
    vendor_name: str
    org_type: str
    incorp_date: date
    country_of_origin: str
    company_reg_no: str
    pan: str
    gst: str
    msme: Optional[str]
    iec: Optional[str]
    category: str
    years_experience: int
    final_signatory_name: str
    final_signatory_designation: str
    place: str
    date: date

    class Config:
        orm_mode = True

# VendorResponse moved to vendor.py to avoid conflicts




# Add these schemas to your existing user.py file

# ==========================================
# 🔹 Tender-Vendor Mapping Schemas
# ==========================================

class TenderVendorMappingBase(BaseModel):
    tender_id: int
    vendor_id: int
    status: Optional[str] = "active"

class TenderVendorMappingCreate(TenderVendorMappingBase):
    pass

class TenderVendorMappingUpdate(BaseModel):
    status: Optional[str] = None

class TenderVendorMappingResponse(TenderVendorMappingBase):
    id: int
    mapped_date: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Include related objects
    tender: Optional[Dict] = None
    vendor: Optional[Dict] = None

    class Config:
        orm_mode = True

class TenderVendorMappingListResponse(BaseModel):
    success: bool
    mappings: List[TenderVendorMappingResponse]
    total: int

class TenderWithVendorsResponse(BaseModel):
    id: int
    tender_type_code: str
    tender: Optional[str] = None
    description: Optional[str] = None
    form_data: Dict[str, Any]
    created_at: datetime
    vendors: List[Dict] = []

    class Config:
        orm_mode = True

class VendorWithTendersResponse(BaseModel):
    id: int
    vendor_name: str
    org_type: str
    contact_person_name: str
    contact_person_email: str
    tenders: List[Dict] = []

    class Config:
        orm_mode = True

class BulkMappingCreate(BaseModel):
    tender_id: int
    vendor_ids: List[int]