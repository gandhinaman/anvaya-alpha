
-- New table: memory_reactions
CREATE TABLE public.memory_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id uuid NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL DEFAULT 'heart',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(memory_id, user_id, reaction_type)
);

ALTER TABLE public.memory_reactions ENABLE ROW LEVEL SECURITY;

-- Caregivers can CRUD reactions on linked parent's memories
CREATE POLICY "Children can CRUD reactions on linked parent memories" ON public.memory_reactions
  FOR ALL USING (
    auth.uid() = user_id 
    AND memory_id IN (SELECT id FROM public.memories WHERE user_id = get_linked_user_id(auth.uid()))
  ) WITH CHECK (
    auth.uid() = user_id 
    AND memory_id IN (SELECT id FROM public.memories WHERE user_id = get_linked_user_id(auth.uid()))
  );

-- Parents can read reactions on own memories
CREATE POLICY "Parents can read reactions on own memories" ON public.memory_reactions
  FOR SELECT USING (
    memory_id IN (SELECT id FROM public.memories WHERE user_id = auth.uid())
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.memory_reactions;

-- Add last-viewed timestamp to profiles
ALTER TABLE public.profiles ADD COLUMN memories_last_viewed_at timestamptz DEFAULT NULL;
