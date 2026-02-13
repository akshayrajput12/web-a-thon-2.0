
-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can upload their own resumes (folder = user_id)
CREATE POLICY "Users can upload own resumes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: Users can view their own resumes
CREATE POLICY "Users can view own resumes"
ON storage.objects FOR SELECT
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: Users can delete their own resumes
CREATE POLICY "Users can delete own resumes"
ON storage.objects FOR DELETE
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: Users can update their own resumes
CREATE POLICY "Users can update own resumes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add columns to interviews table for company details
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS company_description text;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS job_description text;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS requirements text;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS salary_min integer;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS salary_max integer;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR';
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS experience_required text;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS resume_url text;

-- Add update policy for interview_answers so we can store AI feedback
CREATE POLICY "Users can update own answers"
ON public.interview_answers FOR UPDATE
USING (EXISTS (SELECT 1 FROM interviews WHERE interviews.id = interview_answers.interview_id AND interviews.user_id = auth.uid()));

-- Add update policy for interview_questions
CREATE POLICY "Users can update own interview questions"
ON public.interview_questions FOR UPDATE
USING (EXISTS (SELECT 1 FROM interviews WHERE interviews.id = interview_questions.interview_id AND interviews.user_id = auth.uid()));
