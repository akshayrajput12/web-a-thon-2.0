
-- =============================================
-- ENUM TYPES
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.interview_type AS ENUM ('behavioral', 'technical', 'system_design', 'mixed');
CREATE TYPE public.interview_mode AS ENUM ('text', 'voice', 'avatar');
CREATE TYPE public.interview_status AS ENUM ('setup', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE public.job_status AS ENUM ('active', 'saved', 'applied', 'interviewing', 'rejected', 'offered');
CREATE TYPE public.submission_status AS ENUM ('pending', 'running', 'accepted', 'wrong_answer', 'time_limit', 'runtime_error', 'compilation_error');

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  headline TEXT,
  bio TEXT,
  experience_years INTEGER DEFAULT 0,
  target_role TEXT,
  skills TEXT[] DEFAULT '{}',
  location TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- USER ROLES TABLE (separate from profiles)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- =============================================
-- TRIGGER: Auto-create profile and default role on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- RESUMES TABLE
-- =============================================
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  ats_score INTEGER,
  parsed_data JSONB DEFAULT '{}',
  suggestions JSONB DEFAULT '[]',
  skill_gaps JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resumes_user_id ON public.resumes(user_id);
CREATE INDEX idx_resumes_created_at ON public.resumes(created_at DESC);

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own resumes" ON public.resumes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own resumes" ON public.resumes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own resumes" ON public.resumes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own resumes" ON public.resumes FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON public.resumes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- INTERVIEWS TABLE
-- =============================================
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type interview_type NOT NULL DEFAULT 'behavioral',
  mode interview_mode NOT NULL DEFAULT 'text',
  difficulty difficulty_level NOT NULL DEFAULT 'medium',
  target_role TEXT,
  status interview_status NOT NULL DEFAULT 'setup',
  duration_minutes INTEGER DEFAULT 30,
  overall_score INTEGER,
  feedback JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interviews_user_id ON public.interviews(user_id);
CREATE INDEX idx_interviews_status ON public.interviews(status);
CREATE INDEX idx_interviews_created_at ON public.interviews(created_at DESC);

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own interviews" ON public.interviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own interviews" ON public.interviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own interviews" ON public.interviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own interviews" ON public.interviews FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- INTERVIEW QUESTIONS TABLE
-- =============================================
CREATE TABLE public.interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_order INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  difficulty difficulty_level DEFAULT 'medium',
  expected_answer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interview_questions_interview_id ON public.interview_questions(interview_id);

ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own interview questions" ON public.interview_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.interviews WHERE interviews.id = interview_questions.interview_id AND interviews.user_id = auth.uid()));
CREATE POLICY "Users can insert own interview questions" ON public.interview_questions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.interviews WHERE interviews.id = interview_questions.interview_id AND interviews.user_id = auth.uid()));

-- =============================================
-- INTERVIEW ANSWERS TABLE
-- =============================================
CREATE TABLE public.interview_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.interview_questions(id) ON DELETE CASCADE NOT NULL,
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE NOT NULL,
  answer_text TEXT,
  audio_url TEXT,
  score INTEGER,
  ai_feedback JSONB DEFAULT '{}',
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interview_answers_interview_id ON public.interview_answers(interview_id);
CREATE INDEX idx_interview_answers_question_id ON public.interview_answers(question_id);

ALTER TABLE public.interview_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own answers" ON public.interview_answers FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.interviews WHERE interviews.id = interview_answers.interview_id AND interviews.user_id = auth.uid()));
CREATE POLICY "Users can insert own answers" ON public.interview_answers FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.interviews WHERE interviews.id = interview_answers.interview_id AND interviews.user_id = auth.uid()));

-- =============================================
-- CODING PROBLEMS TABLE
-- =============================================
CREATE TABLE public.coding_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty difficulty_level NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL,
  constraints TEXT,
  examples JSONB DEFAULT '[]',
  test_cases JSONB DEFAULT '[]',
  starter_code JSONB DEFAULT '{}',
  solution TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coding_problems_difficulty ON public.coding_problems(difficulty);
CREATE INDEX idx_coding_problems_category ON public.coding_problems(category);

ALTER TABLE public.coding_problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public problems" ON public.coding_problems FOR SELECT USING (is_public = true);

-- =============================================
-- CODING SUBMISSIONS TABLE
-- =============================================
CREATE TABLE public.coding_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  problem_id UUID REFERENCES public.coding_problems(id) ON DELETE CASCADE NOT NULL,
  language TEXT NOT NULL,
  code TEXT NOT NULL,
  status submission_status NOT NULL DEFAULT 'pending',
  runtime_ms INTEGER,
  memory_kb INTEGER,
  test_results JSONB DEFAULT '[]',
  ai_review JSONB DEFAULT '{}',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coding_submissions_user_id ON public.coding_submissions(user_id);
CREATE INDEX idx_coding_submissions_problem_id ON public.coding_submissions(problem_id);
CREATE INDEX idx_coding_submissions_submitted_at ON public.coding_submissions(submitted_at DESC);

ALTER TABLE public.coding_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own submissions" ON public.coding_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own submissions" ON public.coding_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- JOBS TABLE
-- =============================================
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  company_logo TEXT,
  location TEXT,
  job_type TEXT DEFAULT 'full-time',
  salary_min INTEGER,
  salary_max INTEGER,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  requirements JSONB DEFAULT '[]',
  skills_required TEXT[] DEFAULT '{}',
  experience_min INTEGER DEFAULT 0,
  experience_max INTEGER,
  apply_url TEXT,
  source TEXT,
  is_active BOOLEAN DEFAULT true,
  posted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_is_active ON public.jobs(is_active);
CREATE INDEX idx_jobs_posted_at ON public.jobs(posted_at DESC);
CREATE INDEX idx_jobs_skills ON public.jobs USING GIN(skills_required);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active jobs" ON public.jobs FOR SELECT USING (is_active = true);

-- =============================================
-- SAVED JOBS TABLE
-- =============================================
CREATE TABLE public.saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  status job_status NOT NULL DEFAULT 'saved',
  match_score INTEGER,
  notes TEXT,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

CREATE INDEX idx_saved_jobs_user_id ON public.saved_jobs(user_id);
CREATE INDEX idx_saved_jobs_status ON public.saved_jobs(status);

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own saved jobs" ON public.saved_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved jobs" ON public.saved_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved jobs" ON public.saved_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved jobs" ON public.saved_jobs FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_saved_jobs_updated_at BEFORE UPDATE ON public.saved_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- REPORTS TABLE
-- =============================================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  interview_id UUID REFERENCES public.interviews(id) ON DELETE SET NULL,
  coding_submission_id UUID REFERENCES public.coding_submissions(id) ON DELETE SET NULL,
  overall_score INTEGER,
  strengths JSONB DEFAULT '[]',
  improvements JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_user_id ON public.reports(user_id);
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX idx_reports_type ON public.reports(report_type);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- SEED: Sample coding problems
-- =============================================
INSERT INTO public.coding_problems (title, description, difficulty, category, examples, test_cases, starter_code) VALUES
('Two Sum', 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.', 'easy', 'Arrays', '[{"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]"}]', '[{"input": {"nums": [2,7,11,15], "target": 9}, "expected": [0,1]}, {"input": {"nums": [3,2,4], "target": 6}, "expected": [1,2]}]', '{"javascript": "function twoSum(nums, target) {\n  // Your code here\n}", "python": "def two_sum(nums, target):\n    # Your code here\n    pass"}'),
('Valid Parentheses', 'Given a string s containing just the characters ''('', '')'', ''{'', ''}'', ''['' and '']'', determine if the input string is valid.', 'easy', 'Stacks', '[{"input": "s = \"()\"", "output": "true"}, {"input": "s = \"()[]{}\"", "output": "true"}]', '[]', '{"javascript": "function isValid(s) {\n  // Your code here\n}", "python": "def is_valid(s):\n    # Your code here\n    pass"}'),
('Reverse Linked List', 'Given the head of a singly linked list, reverse the list, and return the reversed list.', 'easy', 'Linked Lists', '[{"input": "head = [1,2,3,4,5]", "output": "[5,4,3,2,1]"}]', '[]', '{"javascript": "function reverseList(head) {\n  // Your code here\n}", "python": "def reverse_list(head):\n    # Your code here\n    pass"}'),
('Longest Substring Without Repeating Characters', 'Given a string s, find the length of the longest substring without repeating characters.', 'medium', 'Strings', '[{"input": "s = \"abcabcbb\"", "output": "3"}]', '[]', '{"javascript": "function lengthOfLongestSubstring(s) {\n  // Your code here\n}", "python": "def length_of_longest_substring(s):\n    # Your code here\n    pass"}'),
('Merge K Sorted Lists', 'You are given an array of k linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.', 'hard', 'Linked Lists', '[{"input": "lists = [[1,4,5],[1,3,4],[2,6]]", "output": "[1,1,2,3,4,4,5,6]"}]', '[]', '{"javascript": "function mergeKLists(lists) {\n  // Your code here\n}", "python": "def merge_k_lists(lists):\n    # Your code here\n    pass"}');

-- =============================================
-- SEED: Sample jobs
-- =============================================
INSERT INTO public.jobs (title, company, location, job_type, salary_min, salary_max, description, skills_required, experience_min) VALUES
('Senior Frontend Engineer', 'TechCorp', 'San Francisco, CA', 'full-time', 150000, 200000, 'Build modern web applications using React and TypeScript.', ARRAY['React', 'TypeScript', 'Next.js', 'Tailwind CSS'], 5),
('Full Stack Developer', 'StartupXYZ', 'Remote', 'full-time', 120000, 160000, 'Work on our core platform using React and Node.js.', ARRAY['React', 'Node.js', 'PostgreSQL', 'AWS'], 3),
('ML Engineer', 'AI Labs', 'New York, NY', 'full-time', 180000, 250000, 'Design and deploy machine learning models at scale.', ARRAY['Python', 'PyTorch', 'TensorFlow', 'MLOps'], 4),
('Backend Engineer', 'CloudScale', 'Remote', 'full-time', 140000, 190000, 'Build scalable microservices and APIs.', ARRAY['Go', 'Kubernetes', 'gRPC', 'PostgreSQL'], 3),
('DevOps Engineer', 'InfraTeam', 'Austin, TX', 'full-time', 130000, 175000, 'Manage CI/CD pipelines and cloud infrastructure.', ARRAY['AWS', 'Terraform', 'Docker', 'Kubernetes'], 3);
