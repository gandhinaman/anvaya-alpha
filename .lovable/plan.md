

# Plan: Heart Reactions, Notification Badges, and Read-State for Memories

## What we're building
1. **Heart reaction on memories** (caregiver can heart a memory)
2. **Notification badge on Memories nav tab** showing unread hearts + comments count
3. **Clear notifications** once the caregiver views the Memories tab

## Database Changes

### New table: `memory_reactions`
```sql
CREATE TABLE memory_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id uuid NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL DEFAULT 'heart',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(memory_id, user_id, reaction_type)
);
ALTER TABLE memory_reactions ENABLE ROW LEVEL SECURITY;

-- Caregivers can heart linked parent's memories
CREATE POLICY "Children can CRUD reactions on linked parent memories" ON memory_reactions
  FOR ALL USING (
    auth.uid() = user_id 
    AND memory_id IN (SELECT id FROM memories WHERE user_id = get_linked_user_id(auth.uid()))
  ) WITH CHECK (
    auth.uid() = user_id 
    AND memory_id IN (SELECT id FROM memories WHERE user_id = get_linked_user_id(auth.uid()))
  );

-- Parents can read reactions on own memories
CREATE POLICY "Parents can read reactions on own memories" ON memory_reactions
  FOR SELECT USING (
    memory_id IN (SELECT id FROM memories WHERE user_id = auth.uid())
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE memory_reactions;
```

### New column on `profiles`: `memories_last_viewed_at`
```sql
ALTER TABLE profiles ADD COLUMN memories_last_viewed_at timestamptz DEFAULT NULL;
```

## Code Changes

### 1. `src/hooks/useParentData.ts` — Fetch reactions + last-viewed timestamp
- Fetch `memory_reactions` for all loaded memory IDs (grouped by memory)
- Fetch `memories_last_viewed_at` from the caregiver's own profile
- Compute `unreadCount`: count of comments + hearts with `created_at > memories_last_viewed_at`
- Subscribe to realtime on `memory_reactions` table
- Add `markMemoriesViewed()` function that updates `profiles.memories_last_viewed_at = now()`
- Return `memoryReactions`, `unreadCount`, `markMemoriesViewed`

### 2. `src/components/guardian/GuardianDashboard.jsx`

**Nav badge**: Add unread count badge next to the "Memories" nav item (similar to Bell badge pattern already used)

**Heart button on MemoryCard**: Add a heart toggle button next to the existing comment button. Clicking inserts/deletes from `memory_reactions`. Show filled heart if already hearted, outline if not. Show heart count.

**Mark viewed**: When `nav === "memories"` is selected, call `markMemoriesViewed()` to clear the badge count.

### 3. `src/components/sathi/MemoryLog.jsx` — Show hearts on senior side
- Fetch `memory_reactions` alongside comments
- Display heart count on each memory card (read-only for senior)

### 4. `src/components/AnvayaApp.jsx` — Badge on Memory Log button (senior side)
- Show unread comment/heart count badge on the "Memory Log" action card, clear when opened

## UI Behavior
- **Memories nav tab**: Shows a small badge (e.g., "3") for unread hearts + comments since last viewed
- **Heart button**: Appears on each MemoryCard next to the comment button. Toggle on/off. Shows count.
- **Opening Memories tab**: Updates `memories_last_viewed_at`, badge resets to 0
- **Senior Memory Log**: Shows heart count per memory (read-only), badge on Memory Log button for new comments

