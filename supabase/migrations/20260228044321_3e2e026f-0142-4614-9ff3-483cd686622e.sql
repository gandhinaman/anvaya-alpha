
-- Create memory_comments table for children to leave comments on parent memories
CREATE TABLE public.memory_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.memory_comments ENABLE ROW LEVEL SECURITY;

-- Parents can read comments on their own memories
CREATE POLICY "Parents can read comments on own memories"
  ON public.memory_comments FOR SELECT
  USING (
    memory_id IN (SELECT id FROM public.memories WHERE user_id = auth.uid())
  );

-- Children can read/write comments on linked parent's memories
CREATE POLICY "Children can CRUD comments on linked parent memories"
  ON public.memory_comments FOR ALL
  USING (
    auth.uid() = user_id
    AND memory_id IN (
      SELECT id FROM public.memories WHERE user_id = get_linked_user_id(auth.uid())
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND memory_id IN (
      SELECT id FROM public.memories WHERE user_id = get_linked_user_id(auth.uid())
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.memory_comments;
