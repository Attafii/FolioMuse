-- Rollback: init_gallery_curation
-- Drop tables in reverse FK dependency order

DROP TABLE IF EXISTS "PatternSignal";
DROP TABLE IF EXISTS "ReviewDecision";
DROP TABLE IF EXISTS "AuditEntry";
DROP TABLE IF EXISTS "GalleryItem";
DROP TABLE IF EXISTS "ConsentRecord";
DROP TABLE IF EXISTS "Attribution";
