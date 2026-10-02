-- Runs once when the postgres container's data volume is first created.
-- PostgreSQL + pgvector is isolated to vector-search workloads only
-- (Workmate_production_scalable_fix_plan_v2.md §1) — normal interview/candidate/drive
-- operational data stays in MongoDB, never here.
CREATE EXTENSION IF NOT EXISTS vector;
