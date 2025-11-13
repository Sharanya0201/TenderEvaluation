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
    
    
    __table_args__ = {"extend_existing": True}

