
-- Allow caregivers (children) to read ALL reactions on linked parent's memories (not just their own)
CREATE POLICY "Children can read all reactions on linked parent memories"
ON public.memory_reactions
FOR SELECT
TO public
USING (
  memory_id IN (
    SELECT id FROM public.memories
    WHERE user_id = get_linked_user_id(auth.uid())
  )
);
