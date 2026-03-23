-- Allow caregivers to read all comments on linked parent memories, including comments authored by the loved one.
CREATE POLICY "Children can read all comments on linked parent memories"
ON public.memory_comments
FOR SELECT
TO public
USING (
  memory_id IN (
    SELECT memories.id
    FROM public.memories
    WHERE memories.user_id = public.get_linked_user_id(auth.uid())
  )
);