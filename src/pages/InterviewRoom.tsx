import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronRight, ChevronLeft, Send, CheckCircle2, Building2 } from "lucide-react";
import { evaluateInterviewAnswer, generateInterviewReport } from "@/lib/interview-ai";

interface Question {
  id: string;
  question_text: string;
  category: string | null;
  difficulty: string | null;
  question_order: number;
  expected_answer: string | null;
}

interface InterviewData {
  id: string;
  title: string;
  company_name: string | null;
  target_role: string | null;
  difficulty: string;
  type: string;
  status: string;
  resume_url: string | null;
}

interface AnswerData {
  question_id: string;
  answer_text: string;
  score: number | null;
  ai_feedback: any;
  submitted: boolean;
}

const InterviewRoom = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerData>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [resumeText, setResumeText] = useState("");

  useEffect(() => {
    if (!user || !id) return;
    loadData();
  }, [user, id]);

  const loadData = async () => {
    const [intRes, qRes, aRes] = await Promise.all([
      supabase.from("interviews").select("*").eq("id", id!).single(),
      supabase.from("interview_questions").select("*").eq("interview_id", id!).order("question_order"),
      supabase.from("interview_answers").select("*").eq("interview_id", id!),
    ]);

    if (!intRes.data) { navigate("/interviews"); return; }
    setInterview(intRes.data as InterviewData);
    setQuestions((qRes.data ?? []) as Question[]);

    // Load existing answers
    const ansMap: Record<string, AnswerData> = {};
    for (const a of (aRes.data ?? []) as any[]) {
      ansMap[a.question_id] = {
        question_id: a.question_id,
        answer_text: a.answer_text ?? "",
        score: a.score,
        ai_feedback: a.ai_feedback,
        submitted: true,
      };
    }
    setAnswers(ansMap);

    // Fetch resume text
    if (intRes.data.resume_url) {
      try {
        const res = await fetch(intRes.data.resume_url);
        const text = await res.text();
        setResumeText(text.slice(0, 5000));
      } catch { /* ignore */ }
    }

    setLoading(false);
  };

  const currentQ = questions[currentIdx];
  const currentAnswer = currentQ ? answers[currentQ.id] : undefined;
  const answeredCount = Object.values(answers).filter(a => a.submitted).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  const updateAnswer = (text: string) => {
    if (!currentQ) return;
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: { question_id: currentQ.id, answer_text: text, score: null, ai_feedback: null, submitted: false },
    }));
  };

  const submitAnswer = async () => {
    if (!currentQ || !interview || !currentAnswer?.answer_text.trim()) return;
    setSubmitting(true);
    try {
      // Evaluate with Gemini
      const evaluation = await evaluateInterviewAnswer({
        question: currentQ.question_text,
        answer: currentAnswer.answer_text,
        expectedAnswer: currentQ.expected_answer ?? "",
        resumeText,
        companyName: interview.company_name ?? "",
        targetRole: interview.target_role ?? "",
        difficulty: interview.difficulty,
      });

      // Save to DB
      const { error } = await supabase.from("interview_answers").insert({
        interview_id: interview.id,
        question_id: currentQ.id,
        answer_text: currentAnswer.answer_text,
        score: evaluation.score,
        ai_feedback: evaluation as any,
      });
      if (error) throw error;

      setAnswers(prev => ({
        ...prev,
        [currentQ.id]: { ...prev[currentQ.id], score: evaluation.score, ai_feedback: evaluation, submitted: true },
      }));

      toast({ title: `Score: ${evaluation.score}/100`, description: evaluation.feedback });
    } catch (err: any) {
      toast({ title: "Evaluation failed", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const finishInterview = async () => {
    if (!interview) return;
    setFinishing(true);
    try {
      // Gather all answers
      const questionsWithAnswers = questions.map(q => {
        const a = answers[q.id];
        return {
          question: q.question_text,
          category: q.category ?? "General",
          answer: a?.answer_text ?? "Not answered",
          score: a?.score ?? 0,
          feedback: a?.ai_feedback?.feedback ?? "",
        };
      });

      // Generate report
      const report = await generateInterviewReport({
        companyName: interview.company_name ?? "",
        targetRole: interview.target_role ?? "",
        difficulty: interview.difficulty,
        questions: questionsWithAnswers,
        resumeText,
      });

      // Save report to DB
      await supabase.from("reports").insert({
        user_id: user!.id,
        title: `${interview.title} - Interview Report`,
        report_type: "interview",
        interview_id: interview.id,
        overall_score: report.overall_score,
        strengths: report.strengths as any,
        improvements: report.improvements as any,
        recommendations: [report.recommendation] as any,
        data: report as any,
      });

      // Update interview status
      await supabase.from("interviews").update({
        status: "completed" as const,
        overall_score: report.overall_score,
        completed_at: new Date().toISOString(),
      }).eq("id", interview.id);

      toast({ title: "Interview completed!", description: "Your report is ready." });
      navigate(`/interviews/${interview.id}/report`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setFinishing(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </DashboardLayout>
    );
  }

  if (!interview || questions.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center gap-4 py-20">
          <p className="text-muted-foreground">Interview not found or has no questions.</p>
          <Button onClick={() => navigate("/interviews")}>Back to Interviews</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{interview.title}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" /> {interview.company_name}
              <span>·</span>
              <span>{interview.target_role}</span>
            </div>
          </div>
          <Button variant="hero" onClick={finishInterview} disabled={finishing || answeredCount === 0}>
            {finishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            {finishing ? "Generating Report..." : "Finish & Get Report"}
          </Button>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Question {currentIdx + 1} of {questions.length}</span>
            <span>{answeredCount}/{questions.length} answered</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Navigation Pills */}
        <div className="flex flex-wrap gap-2">
          {questions.map((q, i) => {
            const a = answers[q.id];
            const isActive = i === currentIdx;
            const isAnswered = a?.submitted;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(i)}
                className={`h-8 w-8 rounded-full text-xs font-medium transition-all ${
                  isActive ? "bg-primary text-primary-foreground ring-2 ring-primary/30" :
                  isAnswered ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Question Card */}
        {currentQ && (
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <Badge variant="outline">{currentQ.category ?? "General"}</Badge>
                  <Badge variant="outline" className="ml-2">{currentQ.difficulty ?? "medium"}</Badge>
                </div>
                <span className="text-sm text-muted-foreground">Q{currentQ.question_order}</span>
              </div>
              <CardTitle className="text-lg text-foreground mt-3">{currentQ.question_text}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentAnswer?.submitted ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted/30 p-4">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Your Answer</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{currentAnswer.answer_text}</p>
                  </div>
                  {currentAnswer.ai_feedback && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-primary">{currentAnswer.score}/100</span>
                        <span className="text-sm text-muted-foreground">{currentAnswer.ai_feedback.feedback}</span>
                      </div>
                      {currentAnswer.ai_feedback.strengths?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Strengths</p>
                          <ul className="list-disc pl-4 text-sm text-foreground space-y-0.5">
                            {currentAnswer.ai_feedback.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                      {currentAnswer.ai_feedback.improvements?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Improvements</p>
                          <ul className="list-disc pl-4 text-sm text-foreground space-y-0.5">
                            {currentAnswer.ai_feedback.improvements.map((s: string, i: number) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                      {currentAnswer.ai_feedback.proper_answer && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Ideal Answer</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap bg-accent/5 p-3 rounded-lg">{currentAnswer.ai_feedback.proper_answer}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Type your answer here... Be detailed and specific."
                    value={currentAnswer?.answer_text ?? ""}
                    onChange={(e) => updateAnswer(e.target.value)}
                    rows={8}
                    className="resize-none"
                  />
                  <Button variant="hero" onClick={submitAnswer} disabled={submitting || !currentAnswer?.answer_text?.trim()}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {submitting ? "Evaluating..." : "Submit Answer"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
          </Button>
          <Button variant="outline" onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))} disabled={currentIdx === questions.length - 1}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InterviewRoom;
