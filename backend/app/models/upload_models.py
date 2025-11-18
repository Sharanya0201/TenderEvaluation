# app/models/upload_models.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Tender(Base):
    __tablename__ = "tenders"

    tenderid = Column(Integer, primary_key=True, index=True, autoincrement=True)
    # DB column name is `tender` in the database (migration may have renamed it).
    # Keep the attribute name `title` in the model but map it to the DB column named `tender`.
    title = Column('tender', String(255), nullable=False)
    tenderform = Column(Text, nullable=True)
    uploadedby = Column(String(150), nullable=False)   # keep as string; can be changed to FK if you prefer
    createddate = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(50), default="Pending")
    filepath = Column(Text, nullable=True)
    filename = Column(String(255), nullable=True)
    form_data = Column(JSON, nullable=True, default={})  # Extracted document data as JSON

    # relationships
    vendors = relationship("Vendor", back_populates="tender", cascade="all, delete-orphan")
    attachments = relationship("TenderAttachment", back_populates="tender", cascade="all, delete-orphan")

    __table_args__ = {"extend_existing": True}


class Vendor(Base):
    __tablename__ = "vendors"

    vendorid = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenderid = Column(Integer, ForeignKey("tenders.tenderid", ondelete="CASCADE"), nullable=False)
    vendorform = Column(Text, nullable=True)
    uploadedby = Column(String(150), nullable=False)
    createddate = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(50), default="Pending")
    filename = Column(String(255), nullable=True)
    filepath = Column(Text, nullable=True)
    form_data = Column(JSON, nullable=True, default={})  # Extracted document data as JSON

    tender = relationship("Tender", back_populates="vendors")
    attachments = relationship("VendorAttachment", back_populates="vendor", cascade="all, delete-orphan")

    __table_args__ = {"extend_existing": True}


class TenderAttachment(Base):
    """Table to store tender attachment file paths separately from the tender record"""
    __tablename__ = "tenderattachments"

    tenderattachmentsid = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenderid = Column(Integer, ForeignKey("tenders.tenderid", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    filepath = Column(Text, nullable=False)
    uploadedby = Column(String(150), nullable=False)
    createddate = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(50), default="Active")
    form_data = Column(JSON, nullable=True, default={})  # OCR-extracted document data as JSON

    tender = relationship("Tender", back_populates="attachments")

    __table_args__ = {"extend_existing": True}


class VendorAttachment(Base):
    """Table to store vendor attachment file paths separately from the vendor record"""
    __tablename__ = "vendorattachments"

    vendorattachmentid = Column(Integer, primary_key=True, index=True, autoincrement=True)
    vendorid = Column(Integer, ForeignKey("vendors.vendorid", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    filepath = Column(Text, nullable=False)
    uploadedby = Column(String(150), nullable=False)
    createddate = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(50), default="Active")
    form_data = Column(JSON, nullable=True, default={})  # OCR-extracted document data as JSON

    vendor = relationship("Vendor", back_populates="attachments")

    __table_args__ = {"extend_existing": True}
