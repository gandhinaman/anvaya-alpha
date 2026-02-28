-- Add prompt_question column to memories table
ALTER TABLE public.memories ADD COLUMN prompt_question text;

-- Add category column to memories table for filtering
ALTER TABLE public.memories ADD COLUMN category text DEFAULT 'general';

-- Allow both senior (owner) and linked caregiver to delete memories
CREATE POLICY "Users can delete their own memories"
ON public.memories FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Linked caregivers can delete memories"
ON public.memories FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.linked_user_id = memories.user_id
  )
);