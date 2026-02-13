
-- Allow users to delete their own interview answers
CREATE POLICY "Users can delete own answers"
ON public.interview_answers
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM interviews
  WHERE interviews.id = interview_answers.interview_id
  AND interviews.user_id = auth.uid()
));

-- Allow users to delete their own interview questions
CREATE POLICY "Users can delete own interview questions"
ON public.interview_questions
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM interviews
  WHERE interviews.id = interview_questions.interview_id
  AND interviews.user_id = auth.uid()
));

-- Allow users to delete their own reports
CREATE POLICY "Users can delete own reports"
ON public.reports
FOR DELETE
USING (auth.uid() = user_id);
