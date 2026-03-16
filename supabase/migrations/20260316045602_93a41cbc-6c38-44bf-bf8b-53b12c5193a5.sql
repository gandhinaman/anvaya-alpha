-- Allow users to SELECT their own telemetry sessions (needed for insert...select pattern)
CREATE POLICY "Users can read own sessions"
ON public.telemetry_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to SELECT their own telemetry events
CREATE POLICY "Users can read own events"
ON public.telemetry_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);