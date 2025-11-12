from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import Base, engine
from app.api.v1 import routes_auth
# create_tables.py
from app.models.user import TenderType, Tender, TenderAttachment  # Import models to trigger table creation
from sqlalchemy import text

# Create tables
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
    # Add tender_type_id column to tenders if missing
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
                -- Add foreign key constraint
                ALTER TABLE tenders ADD CONSTRAINT fk_tenders_tender_type_id 
                    FOREIGN KEY (tender_type_id) REFERENCES tender_types(id);
                -- Backfill existing records with tender_type_id from tender_types table
                UPDATE tenders t
                SET tender_type_id = tt.id
                FROM tender_types tt
                WHERE t.tender_type_code = tt.code AND t.tender_type_id IS NULL;
            END IF;
        END;
        $$;
        """
    ))


app = FastAPI(title="AI Based Tender Evaluation")

# Allowed origins (frontend URLs)
origins = [
    "http://localhost:5173",  # if using Vite
    "http://127.0.0.1:5173",
    "http://localhost:3000",  # if you used CRA
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # allow your frontend domains
    allow_credentials=True,      # allow cookies, headers
    allow_methods=["*"],         # allow all HTTP methods (GET, POST, etc)
    allow_headers=["*"],         # allow all headers
)

# Register routes
app.include_router(routes_auth.router, prefix="/api/v1/auth", tags=["Auth"])

@app.get("/")
def root():
    return {"message": "Backend running 🚀"}
