
-- 1. Add category column to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Add UNIQUE constraint to apply_url to prevent duplicate job entries
-- We use a unique index to handle potential NULLs correctly (if multiple jobs have NULL apply_url)
-- Actually, apply_url is usually present for these remote jobs.
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_apply_url_unique ON public.jobs (apply_url) WHERE apply_url IS NOT NULL;

-- 3. Add INSERT policy for jobs table
-- Authenticated users should be able to insert jobs they find in the feed
CREATE POLICY "Authenticated users can insert jobs" 
ON public.jobs FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 4. Add index for category for searching
CREATE INDEX IF NOT EXISTS idx_jobs_category ON public.jobs (category);

-- 5. Add UPDATE policy for profiles to allow users to update their own profiles (missing in some migrations)
-- Wait, migration 1 already has it. 
-- CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
