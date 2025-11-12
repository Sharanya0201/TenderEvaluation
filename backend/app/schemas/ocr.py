from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import datetime

# OCR Schemas
class OCRProcessRequest(BaseModel):
    document_ids: List[int]

class OCRCorrectTextRequest(BaseModel):
    corrected_text: str

class OCRStatusResponse(BaseModel):
    document_id: int
    status: str  # pending, processing, completed, failed, corrected
    ocr_text: Optional[str] = None
    confidence: Optional[float] = None
    processed_at: Optional[datetime] = None
    error_message: Optional[str] = None

class BulkOCRResponse(BaseModel):
    batch_id: str
    total_documents: int
    processed_documents: int
    status: str

# OCR Result Table Schema
class OCRResultBase(BaseModel):
    document_id: int
    status: str
    ocr_text: Optional[str] = None
    confidence: Optional[float] = None
    processed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    corrected_text: Optional[str] = None

class OCRResultCreate(OCRResultBase):
    pass

class OCRResultUpdate(BaseModel):
    status: Optional[str] = None
    ocr_text: Optional[str] = None
    confidence: Optional[float] = None
    processed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    corrected_text: Optional[str] = None

class OCRResultResponse(OCRResultBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True