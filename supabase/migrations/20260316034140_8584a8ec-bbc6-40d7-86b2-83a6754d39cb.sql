
-- Telemetry sessions table
CREATE TABLE public.telemetry_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  user_agent text,
  role text
);
ALTER TABLE public.telemetry_sessions ENABLE ROW LEVEL SECURITY;

-- Users can insert own sessions
CREATE POLICY "Users can insert own sessions" ON public.telemetry_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update own sessions (for ending)
CREATE POLICY "Users can update own sessions" ON public.telemetry_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all sessions
CREATE POLICY "Admins can read all sessions" ON public.telemetry_sessions
  FOR SELECT TO authenticated
  USING (get_profile_role(auth.uid()) = 'admin');

-- Telemetry events table
CREATE TABLE public.telemetry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.telemetry_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  event_name text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

-- Users can insert own events
CREATE POLICY "Users can insert own events" ON public.telemetry_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all events
CREATE POLICY "Admins can read all events" ON public.telemetry_events
  FOR SELECT TO authenticated
  USING (get_profile_role(auth.uid()) = 'admin');

-- Index for efficient admin queries
CREATE INDEX idx_telemetry_events_created_at ON public.telemetry_events(created_at);
CREATE INDEX idx_telemetry_events_user_id ON public.telemetry_events(user_id);
CREATE INDEX idx_telemetry_sessions_user_id ON public.telemetry_sessions(user_id);
CREATE INDEX idx_telemetry_sessions_started_at ON public.telemetry_sessions(started_at);
