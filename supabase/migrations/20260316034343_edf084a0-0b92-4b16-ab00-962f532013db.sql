
-- Admin needs to read all profiles for the dashboard
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (get_profile_role(auth.uid()) = 'admin');
