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
import { Loader2, ChevronRight, ChevronLeft, Send, CheckCircle2, Building2, Target, Activity, Lightbulb } from "lucide-react";
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
      <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in duration-700">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{interview.title}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-secondary/30 text-secondary-foreground font-medium">
                <Building2 className="h-3.5 w-3.5" /> {interview.company_name}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span className="font-medium text-foreground/80">{interview.target_role}</span>
            </div>
          </div>
          <Button
            size="lg"
            onClick={finishInterview}
            disabled={finishing || answeredCount === 0}
            className={`transition-all duration-300 shadow-md ${answeredCount === questions.length ? 'bg-green-600 hover:bg-green-700 text-white ring-2 ring-green-600/20' : ''}`}
          >
            {finishing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
            {finishing ? "Generating Report..." : "Finish & Get Report"}
          </Button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          {/* Main Question Area */}
          <div className="space-y-6">
            {/* Progress & Navigation */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Question <span className="text-foreground">{currentIdx + 1}</span> of {questions.length}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0} className="hover:bg-primary/5 hover:text-primary">
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))} disabled={currentIdx === questions.length - 1} className="hover:bg-primary/5 hover:text-primary">
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
            <Progress value={progress} className="h-1.5 w-full bg-secondary/50 [&>div]:bg-primary/80" />

            {/* Question Card */}
            {currentQ && (
              <Card className="border-border/60 shadow-sm transition-all duration-500 overflow-hidden">
                <CardHeader className="bg-muted/5 border-b border-border/40 pb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge variant="outline" className="bg-background text-xs font-semibold uppercase tracking-wider text-muted-foreground border-border/60">
                      {currentQ.category ?? "General"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold uppercase tracking-wider bg-background border-border/60 ${currentQ.difficulty === 'hard' ? 'text-destructive border-destructive/20' :
                        currentQ.difficulty === 'medium' ? 'text-yellow-600 dark:text-yellow-400 border-yellow-500/20' :
                          'text-green-600 dark:text-green-400 border-green-500/20'
                        }`}
                    >
                      {currentQ.difficulty ?? "medium"}
                    </Badge>
                  </div>
                  <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
                    {currentQ.question_text}
                  </h2>
                </CardHeader>

                <CardContent className="p-6 md:p-8 space-y-6">
                  {currentAnswer?.submitted ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Your Answer</p>
                        <p className="text-base text-foreground/90 whitespace-pre-wrap leading-relaxed">{currentAnswer.answer_text}</p>
                      </div>

                      {currentAnswer.ai_feedback && (
                        <div className="space-y-6">
                          {/* Score Card */}
                          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-gradient-to-br from-background to-muted border border-border/50 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                              <Activity className="h-24 w-24" />
                            </div>
                            <div className="relative z-10 flex flex-col items-center justify-center text-center sm:text-left sm:items-start min-w-[120px]">
                              <span className="text-4xl font-black text-primary tracking-tight">{currentAnswer.score}</span>
                              <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Score</span>
                            </div>
                            <div className="h-px w-full sm:w-px sm:h-16 bg-border/50" />
                            <div className="flex-1 w-full relative z-10">
                              <p className="text-sm text-muted-foreground leading-relaxed italic">
                                "{currentAnswer.ai_feedback.feedback}"
                              </p>
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-6">
                            {currentAnswer.ai_feedback.strengths?.length > 0 && (
                              <div className="space-y-3">
                                <h3 className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4" /> That was great!
                                </h3>
                                <ul className="space-y-2">
                                  {currentAnswer.ai_feedback.strengths.map((s: string, i: number) => (
                                    <li key={i} className="text-sm text-foreground bg-green-500/5 rounded-lg border border-green-500/10 p-3 pl-4 relative">
                                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-green-500/40 rounded-l-lg" />
                                      {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {currentAnswer.ai_feedback.improvements?.length > 0 && (
                              <div className="space-y-3">
                                <h3 className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-2">
                                  <Target className="h-4 w-4" /> Areas to Improve
                                </h3>
                                <ul className="space-y-2">
                                  {currentAnswer.ai_feedback.improvements.map((s: string, i: number) => (
                                    <li key={i} className="text-sm text-foreground bg-orange-500/5 rounded-lg border border-orange-500/10 p-3 pl-4 relative">
                                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500/40 rounded-l-lg" />
                                      {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {currentAnswer.ai_feedback.proper_answer && (
                            <div className="space-y-3 pt-2">
                              <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                                <Lightbulb className="h-4 w-4" /> Ideal Approach
                              </h3>
                              <div className="text-sm text-muted-foreground bg-muted/20 p-5 rounded-xl border border-border/40 leading-relaxed">
                                {currentAnswer.ai_feedback.proper_answer}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative">
                        <Textarea
                          placeholder="Type your answer here... Be specific and structure your thoughts clearly."
                          value={currentAnswer?.answer_text ?? ""}
                          onChange={(e) => updateAnswer(e.target.value)}
                          rows={12}
                          className="min-h-[300px] resize-none p-4 text-base leading-relaxed bg-background/50 focus:bg-background transition-all border-border/60 focus:ring-primary/20"
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-muted-foreground pointer-events-none">
                          {currentAnswer?.answer_text?.length || 0} chars
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          size="lg"
                          onClick={submitAnswer}
                          disabled={submitting || !currentAnswer?.answer_text?.trim()}
                          className="px-8 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
                        >
                          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          {submitting ? "Evaluating..." : "Submit Answer"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar / Question Map */}
          <div className="hidden lg:block space-y-6">
            <Card className="border-border/60 sticky top-6">
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-base font-semibold">Session Overview</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-2">
                  {questions.map((q, i) => {
                    const a = answers[q.id];
                    const isActive = i === currentIdx;
                    const isAnswered = a?.submitted;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIdx(i)}
                        className={`
                              relative flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-all duration-200
                              ${isActive
                            ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background z-10 scale-105 shadow-md"
                            : isAnswered
                              ? "bg-primary/10 text-primary hover:bg-primary/20"
                              : "bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }
                            `}
                      >
                        {i + 1}
                        {isAnswered && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 space-y-3 pt-6 border-t border-border/40">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary/10" />
                      <span>Answered</span>
                    </div>
                    <span className="font-medium">{answeredCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-muted" />
                      <span>Remaining</span>
                    </div>
                    <span className="font-medium">{questions.length - answeredCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InterviewRoom;
