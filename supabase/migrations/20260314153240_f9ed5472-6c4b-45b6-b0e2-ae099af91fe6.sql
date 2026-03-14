
CREATE TABLE public.caregiver_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id uuid NOT NULL,
  parent_id uuid NOT NULL,
  question text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.caregiver_questions ENABLE ROW LEVEL SECURITY;

-- Caregivers can CRUD their own questions
CREATE POLICY "Caregivers can CRUD own questions" ON public.caregiver_questions
  FOR ALL USING (auth.uid() = caregiver_id)
  WITH CHECK (auth.uid() = caregiver_id);

-- Parents can read questions addressed to them
CREATE POLICY "Parents can read their questions" ON public.caregiver_questions
  FOR SELECT USING (auth.uid() = parent_id);

-- Parents can mark questions as used
CREATE POLICY "Parents can update used status" ON public.caregiver_questions
  FOR UPDATE USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);
