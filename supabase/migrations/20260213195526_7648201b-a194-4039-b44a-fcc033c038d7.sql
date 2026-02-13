
-- Create coding_rounds table to store generated rounds
CREATE TABLE public.coding_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Coding Round',
  target_role TEXT NOT NULL,
  company_name TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  language TEXT NOT NULL DEFAULT 'cpp',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'created',
  time_remaining_seconds INTEGER DEFAULT 7200,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coding_rounds ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own coding rounds"
ON public.coding_rounds FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coding rounds"
ON public.coding_rounds FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own coding rounds"
ON public.coding_rounds FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own coding rounds"
ON public.coding_rounds FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_coding_rounds_updated_at
BEFORE UPDATE ON public.coding_rounds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Also add INSERT policy to coding_problems so users can save generated problems
CREATE POLICY "Authenticated users can insert problems"
ON public.coding_problems FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add UPDATE policy for coding_submissions
CREATE POLICY "Users can update own submissions"
ON public.coding_submissions FOR UPDATE
USING (auth.uid() = user_id);
