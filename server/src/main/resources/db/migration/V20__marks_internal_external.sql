-- Support Internal + External mark structure alongside Normal marks.
-- All new columns are nullable so existing NORMAL marks records are unaffected.
ALTER TABLE marks
  ADD COLUMN IF NOT EXISTS marks_type              VARCHAR(20) NOT NULL DEFAULT 'NORMAL'
      CHECK (marks_type IN ('NORMAL','INTERNAL_EXTERNAL')),
  ADD COLUMN IF NOT EXISTS internal_max_marks      INTEGER,
  ADD COLUMN IF NOT EXISTS internal_marks_obtained INTEGER,
  ADD COLUMN IF NOT EXISTS external_max_marks      INTEGER,
  ADD COLUMN IF NOT EXISTS external_marks_obtained INTEGER;
