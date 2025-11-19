# app/main.py
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import Base, engine
from app.api.v1 import routes_auth
# create_tables.py
from app.models.user import TenderType  # Import models to trigger table creation (keeps metadata available)
from app.models.upload_models import Tender, Vendor, TenderAttachment, VendorAttachment  # Import attachment models
from sqlalchemy import text





app = FastAPI(title="AI Based Tender Evaluation")



# Create tables (ensure SQLAlchemy models are imported before this runs)
Base.metadata.create_all(bind=engine)

# Minimal startup migration: ensure new columns exist
with engine.begin() as conn:
    # Add form_data column to tenders if missing (PostgreSQL JSON)
    conn.execute(text(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='tenders' AND column_name='form_data'
            ) THEN
                ALTER TABLE tenders ADD COLUMN form_data JSON NOT NULL DEFAULT '{}'::json;
            END IF;
        END;
        $$;
        """
    ))

    # Ensure tenderattachments has form_data column
    conn.execute(text(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name='tenderattachments'
            ) THEN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='tenderattachments' AND column_name='form_data'
                ) THEN
                    ALTER TABLE tenderattachments ADD COLUMN form_data JSON DEFAULT '{}'::json;
                    UPDATE tenderattachments SET form_data='{}'::json WHERE form_data IS NULL;
                END IF;
            END IF;
        END;
        $$;
        """
    ))

    # Ensure vendorattachments has form_data column
    conn.execute(text(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name='vendorattachments'
            ) THEN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='vendorattachments' AND column_name='form_data'
                ) THEN
                    ALTER TABLE vendorattachments ADD COLUMN form_data JSON DEFAULT '{}'::json;
                    UPDATE vendorattachments SET form_data='{}'::json WHERE form_data IS NULL;
                END IF;
            END IF;
        END;
        $$;
        """
    ))

    # Add form_data column to vendors if missing (PostgreSQL JSON)
    conn.execute(text(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='vendors' AND column_name='form_data'
            ) THEN
                ALTER TABLE vendors ADD COLUMN form_data JSON NOT NULL DEFAULT '{}'::json;
            END IF;
        END;
        $$;
        """
    ))

    # If legacy 'data' column exists, make it safe for inserts that omit it
    conn.execute(text(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='tenders' AND column_name='data'
            ) THEN
                -- Ensure default exists and nulls are populated, then relax NOT NULL
                ALTER TABLE tenders ALTER COLUMN data SET DEFAULT '{}'::json;
                UPDATE tenders SET data='{}'::json WHERE data IS NULL;
                ALTER TABLE tenders ALTER COLUMN data DROP NOT NULL;
            END IF;
        END;
        $$;
        """
    ))

    # Rename title column to tender if it exists
    conn.execute(text(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='tenders' AND column_name='title'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='tenders' AND column_name='tender'
            ) THEN
                ALTER TABLE tenders RENAME COLUMN title TO tender;
            END IF;
        END;
        $$;
        """
    ))

    # Add status column to tenders if missing
    conn.execute(text(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='tenders' AND column_name='status'
            ) THEN
                ALTER TABLE tenders ADD COLUMN status VARCHAR(50) DEFAULT 'Draft';
                CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status);
                -- Update existing tenders without status to 'Draft'
                UPDATE tenders SET status='Draft' WHERE status IS NULL;
            END IF;
        END;
        $$;
        """
    ))

    # Add tender_type_id column to tenders if missing (safe: only backfill if legacy column exists)
    conn.execute(text(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='tenders' AND column_name='tender_type_id'
            ) THEN
                ALTER TABLE tenders ADD COLUMN tender_type_id INTEGER;
                CREATE INDEX IF NOT EXISTS idx_tenders_tender_type_id ON tenders(tender_type_id);
                -- Try to add foreign key constraint, ignore duplicate-object if present
                BEGIN
                    ALTER TABLE tenders ADD CONSTRAINT fk_tenders_tender_type_id 
                        FOREIGN KEY (tender_type_id) REFERENCES tender_types(id);
                EXCEPTION WHEN duplicate_object THEN
                    PERFORM 1;
                END;

                -- Only attempt to backfill from tender_type_code if that legacy column exists
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='tenders' AND column_name='tender_type_code'
                ) THEN
                    UPDATE tenders t
                    SET tender_type_id = tt.id
                    FROM tender_types tt
                    WHERE t.tender_type_code = tt.code AND t.tender_type_id IS NULL;
                END IF;
            END IF;
        END;
        $$;
        """
    ))


# Create attachment tables if they don't exist
with engine.begin() as conn:
    # Create tenderattachments table
    conn.execute(text(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name='tenderattachments'
            ) THEN
                CREATE TABLE tenderattachments (
                    tenderattachmentsid SERIAL PRIMARY KEY,
                    tenderid INT NOT NULL,
                    filename VARCHAR(255) NOT NULL,
                    filepath TEXT NOT NULL,
                    uploadedby VARCHAR(150) NOT NULL,
                    createddate TIMESTAMP DEFAULT NOW(),
                    status VARCHAR(50) DEFAULT 'Active',
                    form_data JSON DEFAULT '{}'::json,
                    CONSTRAINT fk_tender_attachments
                        FOREIGN KEY (tenderid)
                        REFERENCES tenders (tenderid)
                        ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_tenderattachments_tenderid ON tenderattachments(tenderid);
            END IF;
        END;
        $$;
        """
    ))

    # Create vendorattachments table
    conn.execute(text(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name='vendorattachments'
            ) THEN
                CREATE TABLE vendorattachments (
                    vendorattachmentid SERIAL PRIMARY KEY,
                    vendorid INT NOT NULL,
                    filename VARCHAR(255) NOT NULL,
                    filepath TEXT NOT NULL,
                    uploadedby VARCHAR(150) NOT NULL,
                    createddate TIMESTAMP DEFAULT NOW(),
                    status VARCHAR(50) DEFAULT 'Active',
                    form_data JSON DEFAULT '{}'::json,
                    CONSTRAINT fk_vendor_attachments
                        FOREIGN KEY (vendorid)
                        REFERENCES vendors (vendorid)
                        ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_vendorattachments_vendorid ON vendorattachments(vendorid);
            END IF;
        END;
        $$;
        """
    ))




# Allowed origins (frontend URLs)
origins = [
    "http://localhost:5173",  # if using Vite
    "http://127.0.0.1:5173",
    "http://localhost:3000",  # if you used CRA
    "http://127.0.0.1:3000",
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # allow your frontend domains
    allow_credentials=True,      # allow cookies, headers
    allow_methods=["*"],         # allow all HTTP methods (GET, POST, etc)
    allow_headers=["*"],         # allow all headers.
)

# Register routes
# Auth routes at /api/v1/auth
app.include_router(routes_auth.router, prefix="/api/v1/auth", tags=["Auth"])

# Also register same router at /api/v1 for upload endpoints (upload/tender, upload/vendors)
app.include_router(routes_auth.router, prefix="/api/v1", tags=["API"])

@app.get("/")
def root():
    return {"message": "Backend running 🚀"}



