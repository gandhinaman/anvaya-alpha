
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS age integer,
ADD COLUMN IF NOT EXISTS health_issues text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
