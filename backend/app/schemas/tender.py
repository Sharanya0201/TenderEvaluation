from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from datetime import datetime


class TenderCreate(BaseModel):
    tender_type_code: str
    tender_type_id: Optional[int] = None
    tender: Optional[str] = None
    description: Optional[str] = None
    form_data: Dict[str, Any]
    status: Optional[str] = "Draft"


class TenderUpdate(BaseModel):
    tender_type_code: Optional[str] = None
    tender_type_id: Optional[int] = None
    tender: Optional[str] = None
    description: Optional[str] = None
    form_data: Optional[Dict[str, Any]] = None
    status: Optional[str] = None


class TenderResponse(BaseModel):
    id: int
    tender_type_code: str
    tender_type_id: Optional[int] = None
    tender: Optional[str] = None
    description: Optional[str] = None
    form_data: Dict[str, Any]
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    attachment_count: Optional[int] = 0
    has_attachments: Optional[bool] = False

    class Config:
        orm_mode = True

        


class TenderAttachmentResponse(BaseModel):
    id: int
    tender_id: int
    field_key: Optional[str] = None
    original_filename: str
    stored_filename: str
    content_type: Optional[str] = None
    file_size: Optional[int] = None
    uploaded_at: datetime

    class Config:
        orm_mode = True

