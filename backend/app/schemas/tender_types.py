from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


class TenderTypeBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    config_file_name: Optional[str] = None
    form_configs: Optional[List[Dict[str, Any]]] = []  # Store form configs as list of dictionaries
    is_active: bool = True


class TenderTypeCreate(TenderTypeBase):
    pass


class TenderTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    config_file_name: Optional[str] = None
    form_configs: Optional[List[Dict[str, Any]]] = None
    is_active: Optional[bool] = None


class TenderTypeResponse(TenderTypeBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TenderTypeListResponse(BaseModel):
    success: bool
    message: str
    tender_types: List[TenderTypeResponse]


class TenderTypeResponseWrapper(BaseModel):
    success: bool
    message: str
    tender_type: TenderTypeResponse
