
CREATE OR REPLACE FUNCTION public.compute_session_duration()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::integer;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compute_session_duration
  BEFORE UPDATE ON public.telemetry_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_session_duration();
