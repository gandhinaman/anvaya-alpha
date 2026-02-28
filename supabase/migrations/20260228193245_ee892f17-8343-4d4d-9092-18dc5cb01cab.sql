
-- Add columns to memory_comments for media and author info
ALTER TABLE public.memory_comments
  ADD COLUMN media_url text,
  ADD COLUMN media_type text,
  ADD COLUMN author_name text;

-- Parents can INSERT comments on their own memories
CREATE POLICY "Parents can comment on own memories"
  ON public.memory_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND memory_id IN (SELECT id FROM public.memories WHERE user_id = auth.uid())
  );

-- Users can DELETE their own comments
CREATE POLICY "Users can delete own comments"
  ON public.memory_comments FOR DELETE
  USING (auth.uid() = user_id);
