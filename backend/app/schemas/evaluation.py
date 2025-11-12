from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class EvaluationCriterionBase(BaseModel):
    name: str
    description: str
    weightage: float
    max_score: float
    category: str
    is_active: bool = True
    is_custom: bool = True


class EvaluationCriterionCreate(EvaluationCriterionBase):
    pass


class EvaluationCriterionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    weightage: Optional[float] = None
    max_score: Optional[float] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class EvaluationCriterionResponse(EvaluationCriterionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class EvaluationCriterionListResponse(BaseModel):
    success: bool
    criteria: List[EvaluationCriterionResponse]
    total: int
    total_weightage: float


class TenderEvaluationBase(BaseModel):
    tender_id: int
    vendor_id: int
    criterion_id: int
    score: float
    comments: Optional[str] = None
    evaluated_by: Optional[int] = None


class TenderEvaluationCreate(TenderEvaluationBase):
    pass


class TenderEvaluationUpdate(BaseModel):
    score: Optional[float] = None
    comments: Optional[str] = None


class TenderEvaluationResponse(TenderEvaluationBase):
    id: int
    evaluated_at: datetime
    criterion: Optional[EvaluationCriterionResponse] = None
    vendor: Optional[Dict] = None
    tender: Optional[Dict] = None

    class Config:
        orm_mode = True


class BulkEvaluationCreate(BaseModel):
    tender_id: int
    vendor_id: int
    evaluations: List[Dict[str, Any]]  # List of {criterion_id: int, score: float, comments: str}


class EvaluationSummaryResponse(BaseModel):
    success: bool
    tender_id: int
    vendor_id: int
    total_score: float
    weighted_score: float
    max_possible_score: float
    percentage: float
    evaluations: List[TenderEvaluationResponse]


class AIEvaluationRequest(BaseModel):
    tender_id: int
    vendor_id: int
    criteria: List[Dict[str, Any]]