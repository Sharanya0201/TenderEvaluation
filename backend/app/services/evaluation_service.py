from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import EvaluationCriterion, TenderEvaluation, Tender, Vendor
from app.schemas.evaluation import (
    EvaluationCriterionCreate,
    EvaluationCriterionUpdate,
    TenderEvaluationCreate,
    TenderEvaluationUpdate,
    BulkEvaluationCreate
)


# Default evaluation criteria
DEFAULT_CRITERIA = [
    {
        "name": "Technical Capability",
        "description": "Assessment of technical skills and capabilities to deliver the required services",
        "weightage": 30.0,
        "max_score": 100.0,
        "category": "Technical",
        "is_active": True,
        "is_custom": False
    },
    {
        "name": "Price Competitiveness",
        "description": "Evaluation of pricing and cost effectiveness of the proposal",
        "weightage": 25.0,
        "max_score": 100.0,
        "category": "Commercial",
        "is_active": True,
        "is_custom": False
    },
    {
        "name": "Experience & Past Performance",
        "description": "Review of past projects and performance history",
        "weightage": 20.0,
        "max_score": 100.0,
        "category": "Experience",
        "is_active": True,
        "is_custom": False
    },
    {
        "name": "Delivery Timeline",
        "description": "Assessment of proposed delivery schedule and timelines",
        "weightage": 15.0,
        "max_score": 100.0,
        "category": "Operational",
        "is_active": True,
        "is_custom": False
    },
    {
        "name": "Quality Assurance",
        "description": "Evaluation of quality control processes and standards",
        "weightage": 10.0,
        "max_score": 100.0,
        "category": "Quality",
        "is_active": True,
        "is_custom": False
    }
]


def initialize_default_criteria(db: Session):
    """Initialize default evaluation criteria if they don't exist"""
    for criterion_data in DEFAULT_CRITERIA:
        existing = db.query(EvaluationCriterion).filter(
            EvaluationCriterion.name == criterion_data["name"],
            EvaluationCriterion.is_custom == False
        ).first()
        
        if not existing:
            db_criterion = EvaluationCriterion(**criterion_data)
            db.add(db_criterion)
    
    db.commit()


def get_evaluation_criteria(db: Session, skip: int = 0, limit: int = 100, active_only: bool = False):
    """Get all evaluation criteria with pagination"""
    query = db.query(EvaluationCriterion)
    
    if active_only:
        query = query.filter(EvaluationCriterion.is_active == True)
    
    total = query.count()
    criteria = query.offset(skip).limit(limit).all()
    
    total_weightage = sum(criterion.weightage for criterion in criteria)
    
    return {
        "success": True,
        "criteria": criteria,
        "total": total,
        "total_weightage": total_weightage
    }


def get_evaluation_criterion_by_id(db: Session, criterion_id: int):
    """Get a specific evaluation criterion by ID"""
    criterion = db.query(EvaluationCriterion).filter(EvaluationCriterion.id == criterion_id).first()
    if not criterion:
        raise HTTPException(status_code=404, detail="Evaluation criterion not found")
    
    return {
        "success": True,
        "criterion": criterion
    }


def create_evaluation_criterion(db: Session, criterion: EvaluationCriterionCreate):
    """Create a new evaluation criterion"""
    # Check if criterion with same name already exists
    existing = db.query(EvaluationCriterion).filter(
        EvaluationCriterion.name == criterion.name
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Criterion with this name already exists")
    
    db_criterion = EvaluationCriterion(**criterion.dict())
    db.add(db_criterion)
    db.commit()
    db.refresh(db_criterion)
    
    return {
        "success": True,
        "message": "Evaluation criterion created successfully",
        "criterion": db_criterion
    }


def update_evaluation_criterion(db: Session, criterion_id: int, criterion: EvaluationCriterionUpdate):
    """Update an existing evaluation criterion"""
    db_criterion = db.query(EvaluationCriterion).filter(EvaluationCriterion.id == criterion_id).first()
    if not db_criterion:
        raise HTTPException(status_code=404, detail="Evaluation criterion not found")
    
    if db_criterion.is_custom == False:
        raise HTTPException(status_code=400, detail="Cannot modify default criteria")
    
    update_data = criterion.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_criterion, field, value)
    
    db.commit()
    db.refresh(db_criterion)
    
    return {
        "success": True,
        "message": "Evaluation criterion updated successfully",
        "criterion": db_criterion
    }


def delete_evaluation_criterion(db: Session, criterion_id: int):
    """Delete an evaluation criterion (soft delete by setting inactive)"""
    db_criterion = db.query(EvaluationCriterion).filter(EvaluationCriterion.id == criterion_id).first()
    if not db_criterion:
        raise HTTPException(status_code=404, detail="Evaluation criterion not found")
    
    if db_criterion.is_custom == False:
        raise HTTPException(status_code=400, detail="Cannot delete default criteria")
    
    db_criterion.is_active = False
    db.commit()
    
    return {
        "success": True,
        "message": "Evaluation criterion deleted successfully"
    }


def toggle_criterion_status(db: Session, criterion_id: int, is_active: bool):
    """Activate or deactivate an evaluation criterion"""
    db_criterion = db.query(EvaluationCriterion).filter(EvaluationCriterion.id == criterion_id).first()
    if not db_criterion:
        raise HTTPException(status_code=404, detail="Evaluation criterion not found")
    
    db_criterion.is_active = is_active
    db.commit()
    db.refresh(db_criterion)
    
    return {
        "success": True,
        "message": f"Criterion {'activated' if is_active else 'deactivated'} successfully",
        "criterion": db_criterion
    }


def restore_default_criteria(db: Session):
    """Restore all default criteria and remove custom ones"""
    # Delete all custom criteria
    db.query(EvaluationCriterion).filter(EvaluationCriterion.is_custom == True).delete()
    
    # Reinitialize default criteria
    initialize_default_criteria(db)
    
    return {
        "success": True,
        "message": "Default criteria restored successfully"
    }


def create_tender_evaluation(db: Session, evaluation: TenderEvaluationCreate):
    """Create a new tender evaluation"""
    # Check if tender exists
    tender = db.query(Tender).filter(Tender.id == evaluation.tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    
    # Check if vendor exists
    vendor = db.query(Vendor).filter(Vendor.id == evaluation.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Check if criterion exists and is active
    criterion = db.query(EvaluationCriterion).filter(
        EvaluationCriterion.id == evaluation.criterion_id,
        EvaluationCriterion.is_active == True
    ).first()
    if not criterion:
        raise HTTPException(status_code=404, detail="Evaluation criterion not found or inactive")
    
    # Check if score is within valid range
    if evaluation.score < 0 or evaluation.score > criterion.max_score:
        raise HTTPException(
            status_code=400, 
            detail=f"Score must be between 0 and {criterion.max_score}"
        )
    
    # Check if evaluation already exists for this combination
    existing = db.query(TenderEvaluation).filter(
        TenderEvaluation.tender_id == evaluation.tender_id,
        TenderEvaluation.vendor_id == evaluation.vendor_id,
        TenderEvaluation.criterion_id == evaluation.criterion_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Evaluation already exists for this criterion")
    
    db_evaluation = TenderEvaluation(**evaluation.dict())
    db.add(db_evaluation)
    db.commit()
    db.refresh(db_evaluation)
    
    return {
        "success": True,
        "message": "Evaluation created successfully",
        "evaluation": db_evaluation
    }


def create_bulk_evaluations(db: Session, bulk_data: BulkEvaluationCreate):
    """Create multiple evaluations for a tender-vendor combination"""
    # Check if tender exists
    tender = db.query(Tender).filter(Tender.id == bulk_data.tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    
    # Check if vendor exists
    vendor = db.query(Vendor).filter(Vendor.id == bulk_data.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    results = []
    for eval_data in bulk_data.evaluations:
        criterion_id = eval_data.get("criterion_id")
        score = eval_data.get("score")
        comments = eval_data.get("comments", "")
        
        # Check if criterion exists and is active
        criterion = db.query(EvaluationCriterion).filter(
            EvaluationCriterion.id == criterion_id,
            EvaluationCriterion.is_active == True
        ).first()
        
        if not criterion:
            results.append({
                "criterion_id": criterion_id,
                "success": False,
                "error": "Criterion not found or inactive"
            })
            continue
        
        # Check if score is within valid range
        if score < 0 or score > criterion.max_score:
            results.append({
                "criterion_id": criterion_id,
                "success": False,
                "error": f"Score must be between 0 and {criterion.max_score}"
            })
            continue
        
        # Check if evaluation already exists
        existing = db.query(TenderEvaluation).filter(
            TenderEvaluation.tender_id == bulk_data.tender_id,
            TenderEvaluation.vendor_id == bulk_data.vendor_id,
            TenderEvaluation.criterion_id == criterion_id
        ).first()
        
        if existing:
            # Update existing evaluation
            existing.score = score
            existing.comments = comments
            results.append({
                "criterion_id": criterion_id,
                "success": True,
                "action": "updated"
            })
        else:
            # Create new evaluation
            db_evaluation = TenderEvaluation(
                tender_id=bulk_data.tender_id,
                vendor_id=bulk_data.vendor_id,
                criterion_id=criterion_id,
                score=score,
                comments=comments,
                evaluated_by=bulk_data.vendor_id  # This should be the actual user ID in real scenario
            )
            db.add(db_evaluation)
            results.append({
                "criterion_id": criterion_id,
                "success": True,
                "action": "created"
            })
    
    db.commit()
    
    return {
        "success": True,
        "message": "Bulk evaluations processed successfully",
        "results": results
    }


def get_evaluation_summary(db: Session, tender_id: int, vendor_id: int):
    """Get evaluation summary for a tender-vendor combination"""
    evaluations = db.query(TenderEvaluation).filter(
        TenderEvaluation.tender_id == tender_id,
        TenderEvaluation.vendor_id == vendor_id
    ).all()
    
    if not evaluations:
        raise HTTPException(status_code=404, detail="No evaluations found for this tender-vendor combination")
    
    total_score = 0
    weighted_score = 0
    max_possible_score = 0
    
    for evaluation in evaluations:
        criterion = evaluation.criterion
        total_score += evaluation.score
        weighted_score += (evaluation.score / criterion.max_score) * criterion.weightage
        max_possible_score += criterion.weightage
    
    percentage = (weighted_score / max_possible_score) * 100 if max_possible_score > 0 else 0
    
    return {
        "success": True,
        "tender_id": tender_id,
        "vendor_id": vendor_id,
        "total_score": total_score,
        "weighted_score": weighted_score,
        "max_possible_score": max_possible_score,
        "percentage": percentage,
        "evaluations": evaluations
    }