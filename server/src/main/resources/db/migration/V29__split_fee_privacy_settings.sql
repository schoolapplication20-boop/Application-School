-- hide_fee_info_from_students used to block the ENTIRE student "My Fees" page (total fee,
-- paid amount, due amount, installments, payment history — everything), even though its
-- own stated intent was only to hide the fee *concession* amount. That coupling was a bug:
-- a school that wanted to keep concession private ended up hiding fee visibility outright.
--
-- Split into three independent settings:
--   show_fee_details_to_students  — gates the whole "My Fees" page (default: visible)
--   hide_concession_from_students — gates the concession/condonation amount for students (default: hidden)
--   concession_super_admin_only   — gates the concession/condonation amount for ADMIN role, i.e.
--                                    only SUPER_ADMIN sees it when this is on (default: on)
--
-- hide_fee_info_from_students is left in place (unused going forward) rather than dropped,
-- to avoid touching existing data for a column no code will reference anymore.
ALTER TABLE school_privacy_config
    ADD COLUMN IF NOT EXISTS show_fee_details_to_students BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS hide_concession_from_students BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS concession_super_admin_only BOOLEAN NOT NULL DEFAULT TRUE;
