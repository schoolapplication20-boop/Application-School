-- Hall No was mandatory on exam schedules, but many schools don't assign a hall until
-- closer to the exam date (or never need one for smaller classes). Make it optional.
ALTER TABLE exam_schedules ALTER COLUMN hall_number DROP NOT NULL;
