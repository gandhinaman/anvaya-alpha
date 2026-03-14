
-- Collections/curations of memories
CREATE TABLE public.memory_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  emoji text DEFAULT '📚',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.memory_collections ENABLE ROW LEVEL SECURITY;

-- Caregivers can CRUD their own collections
CREATE POLICY "Users can CRUD own collections" ON public.memory_collections
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Parents can read collections made by their linked caregiver
CREATE POLICY "Parents can read linked caregiver collections" ON public.memory_collections
  FOR SELECT USING (
    user_id = get_linked_user_id(auth.uid())
  );

-- Junction table linking memories to collections
CREATE TABLE public.memory_collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.memory_collections(id) ON DELETE CASCADE,
  memory_id uuid NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(collection_id, memory_id)
);

ALTER TABLE public.memory_collection_items ENABLE ROW LEVEL SECURITY;

-- Users can manage items in their own collections
CREATE POLICY "Users can CRUD items in own collections" ON public.memory_collection_items
  FOR ALL USING (
    collection_id IN (SELECT id FROM public.memory_collections WHERE user_id = auth.uid())
  )
  WITH CHECK (
    collection_id IN (SELECT id FROM public.memory_collections WHERE user_id = auth.uid())
  );

-- Parents can read items in collections by linked caregiver
CREATE POLICY "Parents can read linked collection items" ON public.memory_collection_items
  FOR SELECT USING (
    collection_id IN (
      SELECT id FROM public.memory_collections WHERE user_id = get_linked_user_id(auth.uid())
    )
  );
