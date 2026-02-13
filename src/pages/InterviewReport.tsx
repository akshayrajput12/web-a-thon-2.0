import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, TrendingUp, FileText, Target } from "lucide-react";

interface ReportData {
  overall_score: number;
  selection_chance: string;
  selection_percentage: number;
  summary: string;
  category_scores: Array<{ category: string; score: number; feedback: string }>;
  strengths: string[];
  improvements: string[];
  resume_tips: string[];
  recommendation: string;
}

interface QuestionAnswer {
  question_text: string;
  category: string | null;
  question_order: number;
  answer_text: string | null;
  score: number | null;
  ai_feedback: any;
  expected_answer: string | null;
}

const CHANCE_COLORS: Record<string, string> = {
  "Very High": "text-accent",
  "High": "text-primary",
  "Moderate": "text-chart-4",
  "Low": "text-destructive",
  "Very Low": "text-destructive",
};

const InterviewReport = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [interview, setInterview] = useState<any>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [questionsAnswers, setQuestionsAnswers] = useState<QuestionAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    loadReport();
  }, [user, id]);

  const loadReport = async () => {
    const [intRes, reportRes, qRes, aRes] = await Promise.all([
      supabase.from("interviews").select("*").eq("id", id!).single(),
      supabase.from("reports").select("*").eq("interview_id", id!).order("created_at", { ascending: false }).limit(1),
      supabase.from("interview_questions").select("*").eq("interview_id", id!).order("question_order"),
      supabase.from("interview_answers").select("*").eq("interview_id", id!),
    ]);

    setInterview(intRes.data);
    if (reportRes.data && reportRes.data.length > 0) {
      setReport(reportRes.data[0].data as unknown as ReportData);
    }

    // Merge questions with answers
    const answersMap: Record<string, any> = {};
    for (const a of (aRes.data ?? []) as any[]) {
      answersMap[a.question_id] = a;
    }

    const merged: QuestionAnswer[] = ((qRes.data ?? []) as any[]).map(q => ({
      question_text: q.question_text,
      category: q.category,
      question_order: q.question_order,
      expected_answer: q.expected_answer,
      answer_text: answersMap[q.id]?.answer_text ?? null,
      score: answersMap[q.id]?.score ?? null,
      ai_feedback: answersMap[q.id]?.ai_feedback ?? null,
    }));
    setQuestionsAnswers(merged);
    setLoading(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </DashboardLayout>
    );
  }

  if (!report || !interview) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center gap-4 py-20">
          <p className="text-muted-foreground">Report not found.</p>
          <Button onClick={() => navigate("/interviews")}>Back to Interviews</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate("/interviews")}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{interview.title} — Report</h1>
            <p className="text-sm text-muted-foreground">{interview.company_name} · {interview.target_role}</p>
          </div>
        </div>

        {/* Overall Score Card */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center py-6">
              <p className="text-sm text-muted-foreground mb-2">Overall Score</p>
              <p className="text-5xl font-bold text-primary">{report.overall_score}%</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center py-6">
              <p className="text-sm text-muted-foreground mb-2">Selection Chance</p>
              <p className={`text-3xl font-bold ${CHANCE_COLORS[report.selection_chance] ?? "text-foreground"}`}>
                {report.selection_chance}
              </p>
              <p className="text-lg font-medium text-muted-foreground">{report.selection_percentage}%</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center py-6">
              <p className="text-sm text-muted-foreground mb-2">Questions Answered</p>
              <p className="text-3xl font-bold text-foreground">
                {questionsAnswers.filter(q => q.answer_text).length}/{questionsAnswers.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-foreground">Executive Summary</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-foreground leading-relaxed">{report.summary}</p></CardContent>
        </Card>

        {/* Category Scores */}
        {report.category_scores?.length > 0 && (
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-foreground">Category Performance</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {report.category_scores.map((cat, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">{cat.category}</span>
                    <span className="text-muted-foreground">{cat.score}%</span>
                  </div>
                  <Progress value={cat.score} className="h-2" />
                  <p className="text-xs text-muted-foreground">{cat.feedback}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Strengths & Improvements */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><CheckCircle2 className="h-5 w-5 text-accent" /> Strengths</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {report.strengths?.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground"><span className="text-accent mt-0.5">✓</span>{s}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><TrendingUp className="h-5 w-5 text-primary" /> Areas to Improve</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {report.improvements?.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground"><span className="text-destructive mt-0.5">→</span>{s}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Resume Tips */}
        {report.resume_tips?.length > 0 && (
          <Card className="border-border/50">
            <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><FileText className="h-5 w-5 text-primary" /> Resume Enhancement Tips</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {report.resume_tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground"><Badge variant="outline" className="mt-0.5 shrink-0">{i + 1}</Badge>{tip}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Recommendation */}
        <Card className="border-border/50 bg-primary/5">
          <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><Target className="h-5 w-5 text-primary" /> Final Recommendation</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-foreground leading-relaxed">{report.recommendation}</p></CardContent>
        </Card>

        {/* Per-Question Breakdown */}
        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-foreground">Question-by-Question Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {questionsAnswers.map((qa, i) => (
              <div key={i} className="space-y-3 border-b border-border/30 pb-5 last:border-0">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Q{qa.question_order}</Badge>
                      <Badge variant="outline">{qa.category ?? "General"}</Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground">{qa.question_text}</p>
                  </div>
                  {qa.score !== null && (
                    <span className={`text-lg font-bold ${qa.score >= 70 ? "text-accent" : qa.score >= 40 ? "text-chart-4" : "text-destructive"}`}>
                      {qa.score}%
                    </span>
                  )}
                </div>
                {qa.answer_text && (
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Your Answer</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{qa.answer_text}</p>
                  </div>
                )}
                {qa.ai_feedback?.proper_answer && (
                  <div className="rounded-lg bg-accent/5 p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Ideal Answer</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{qa.ai_feedback.proper_answer}</p>
                  </div>
                )}
                {!qa.answer_text && qa.expected_answer && (
                  <div className="rounded-lg bg-accent/5 p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Expected Answer</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{qa.expected_answer}</p>
                  </div>
                )}
                {qa.ai_feedback?.feedback && (
                  <p className="text-xs text-muted-foreground">{qa.ai_feedback.feedback}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default InterviewReport;
