-- Nightly purge: trash older than 15 days, and outreach drafts whose link
-- expired unanswered. The deleting itself happens in the purge-expired edge
-- function, because files in Storage can only be removed through its API —
-- a SQL delete would drop the rows and strand the files.
--
-- The Authorization header carries the public anon key only to get past the
-- functions gateway. purge-expired needs no secret: it deletes nothing that
-- is not already due.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Re-running this file replaces the job rather than stacking a duplicate.
DO $$
BEGIN
  PERFORM cron.unschedule('purge-expired-clinics');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 03:00 UTC is 06:00 in Turkey: quiet, and after the day's admin work.
SELECT cron.schedule(
  'purge-expired-clinics',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lbnpnjyhmxmcurffmcom.supabase.co/functions/v1/purge-expired',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxibnBuanlobXhtY3VyZmZtY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTk5NjEsImV4cCI6MjA2OTU3NTk2MX0.ZxaOF-fdk3orrvqCCR8qdLmDEcv81FlmCM1XRQ3Odg8'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
