-- =====================================================
-- Add Patient Summary Tables
-- =====================================================
-- This migration adds the tables required for the patient summary feature.

-- =====================================================
-- Step 1: Create patient_summaries table
-- =====================================================
create table patient_summaries (
  patient_id uuid primary key references patients(id) on delete cascade,
  summary jsonb,
  version bigint default 1,
  updated_at timestamptz default now()
);

-- =====================================================
-- Step 2: Create document_extractions table
-- =====================================================
create table document_extractions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  extraction_json jsonb,
  confidence real,
  processed_at timestamptz default now()
);

-- =====================================================
-- Step 3: Create diagnoses table
-- =====================================================
create table diagnoses (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  name text,
  severity text,
  status text,
  firstSeen date,
  lastSeen date,
  source_docs jsonb
);

-- =====================================================
-- Step 4: Create manual_corrections table
-- =====================================================
create table manual_corrections (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  fieldPath text,
  oldValue text,
  newValue text,
  docRefs jsonb,
  createdAt timestamptz default now()
);

-- =====================================================
-- Step 5: Create alerts table
-- =====================================================
create table alerts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  level text,
  message text,
  evidence_docs jsonb,
  created_at timestamptz default now(),
  resolved boolean default false
);

-- =====================================================
-- Migration Complete
-- =====================================================