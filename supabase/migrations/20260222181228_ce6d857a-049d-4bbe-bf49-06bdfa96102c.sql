
-- 1. Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text NOT NULL CHECK (role IN ('parent', 'child')),
  language text DEFAULT 'en',
  linked_user_id uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to get linked_user_id without recursion
CREATE OR REPLACE FUNCTION public.get_linked_user_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT linked_user_id FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.get_profile_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id
$$;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Children can read their linked parent's profile
CREATE POLICY "Children can read linked parent profile"
  ON public.profiles FOR SELECT
  USING (
    public.get_profile_role(auth.uid()) = 'child'
    AND id = public.get_linked_user_id(auth.uid())
  );

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 2. Memories
CREATE TABLE public.memories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text,
  transcript text,
  ai_summary text,
  duration_seconds int,
  audio_url text,
  emotional_tone text,
  vocal_energy text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own memories"
  ON public.memories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Children can read linked parent memories"
  ON public.memories FOR SELECT
  USING (
    public.get_profile_role(auth.uid()) = 'child'
    AND user_id = public.get_linked_user_id(auth.uid())
  );

-- 3. Health Events
CREATE TABLE public.health_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  value jsonb,
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE public.health_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own health_events"
  ON public.health_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Children can read linked parent health_events"
  ON public.health_events FOR SELECT
  USING (
    public.get_profile_role(auth.uid()) = 'child'
    AND user_id = public.get_linked_user_id(auth.uid())
  );

-- 4. Medications
CREATE TABLE public.medications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  dose text,
  scheduled_time time,
  taken_today boolean DEFAULT false,
  last_taken timestamptz
);

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own medications"
  ON public.medications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Children can read linked parent medications"
  ON public.medications FOR SELECT
  USING (
    public.get_profile_role(auth.uid()) = 'child'
    AND user_id = public.get_linked_user_id(auth.uid())
  );

-- 5. Conversations
CREATE TABLE public.conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  messages jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own conversations"
  ON public.conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
