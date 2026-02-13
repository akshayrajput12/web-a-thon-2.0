import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mic, Plus, Clock, Target, Loader2, Building2, IndianRupee, FileText, Play, BarChart3, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { generateInterviewQuestionsFromContext } from "@/lib/interview-ai";

type InterviewType = "behavioral" | "technical" | "system_design" | "mixed";
type DifficultyLevel = "easy" | "medium" | "hard";
type InterviewStatus = "setup" | "in_progress" | "completed" | "cancelled";

interface Interview {
  id: string;
  title: string;
  type: InterviewType;
  difficulty: DifficultyLevel;
  status: InterviewStatus;
  overall_score: number | null;
  target_role: string | null;
  duration_minutes: number | null;
  company_name: string | null;
  company_description: string | null;
  job_description: string | null;
  requirements: string | null;
  salary_min: number | null;
  salary_max: number | null;
  experience_required: string | null;
  created_at: string;
}

interface ResumeData {
  id: string;
  file_name: string;
  file_url: string;
}

const STATUS_COLORS: Record<InterviewStatus, string> = {
  setup: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/20 text-primary",
  completed: "bg-accent/20 text-accent",
  cancelled: "bg-destructive/20 text-destructive",
};

const Interviews = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resume, setResume] = useState<ResumeData | null>(null);

  const [form, setForm] = useState({
    title: "",
    company_name: "",
    company_description: "",
    job_description: "",
    requirements: "",
    target_role: "",
    type: "technical" as InterviewType,
    difficulty: "medium" as DifficultyLevel,
    salary_min: "",
    salary_max: "",
    experience_required: "",
    duration_minutes: 30,
  });

  const fetchData = async () => {
    if (!user) return;
    const [interviewsRes, resumeRes] = await Promise.all([
      supabase.from("interviews").select("*").order("created_at", { ascending: false }),
      supabase.from("resumes").select("id, file_name, file_url").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
    ]);
    setInterviews((interviewsRes.data as Interview[]) ?? []);
    if (resumeRes.data && resumeRes.data.length > 0) setResume(resumeRes.data[0] as ResumeData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const fetchResumeText = async (): Promise<string> => {
    if (!resume) return "";
    try {
      const res = await fetch(resume.file_url);
      const text = await res.text();
      return text.slice(0, 5000);
    } catch {
      return "";
    }
  };

  const handleDelete = async (interviewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Delete answers, questions, reports, then interview
      await supabase.from("interview_answers").delete().eq("interview_id", interviewId);
      await supabase.from("interview_questions").delete().eq("interview_id", interviewId);
      await supabase.from("reports").delete().eq("interview_id", interviewId);
      const { error } = await supabase.from("interviews").delete().eq("id", interviewId);
      if (error) throw error;
      setInterviews(prev => prev.filter(i => i.id !== interviewId));
      toast({ title: "Interview deleted", description: "The interview has been removed." });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const handleCreate = async () => {
    if (!user || !form.title || !form.company_name || !form.target_role) {
      toast({ title: "Missing fields", description: "Fill in title, company name and target role.", variant: "destructive" });
      return;
    }
    setCreating(true);
    let createdInterviewId: string | null = null;
    try {
      // 1. Fetch resume text first
      const resumeText = await fetchResumeText();

      // 2. Generate questions via Gemini BEFORE creating interview
      toast({ title: "Generating questions...", description: "AI is preparing your interview questions." });

      const questions = await generateInterviewQuestionsFromContext({
        companyName: form.company_name,
        companyDescription: form.company_description,
        jobDescription: form.job_description,
        requirements: form.requirements,
        targetRole: form.target_role,
        difficulty: form.difficulty,
        experienceRequired: form.experience_required,
        salaryRange: form.salary_min && form.salary_max ? `₹${form.salary_min} - ₹${form.salary_max} LPA` : "Not specified",
        resumeText,
        interviewType: form.type,
      });

      if (!questions || questions.length === 0) throw new Error("AI failed to generate questions. Please try again.");

      // 3. Create interview record only after questions succeed
      const { data: interview, error } = await supabase.from("interviews").insert({
        user_id: user.id,
        title: form.title,
        type: form.type,
        difficulty: form.difficulty,
        target_role: form.target_role,
        duration_minutes: form.duration_minutes,
        company_name: form.company_name,
        company_description: form.company_description,
        job_description: form.job_description,
        requirements: form.requirements,
        salary_min: form.salary_min ? parseInt(form.salary_min) : null,
        salary_max: form.salary_max ? parseInt(form.salary_max) : null,
        experience_required: form.experience_required,
        resume_url: resume?.file_url ?? null,
        status: "in_progress" as const,
      }).select().single();

      if (error || !interview) throw error || new Error("Failed to create interview");
      createdInterviewId = interview.id;

      // 4. Store questions in DB
      const questionRows = questions.map((q, i) => ({
        interview_id: interview.id,
        question_text: q.question_text,
        category: q.category,
        difficulty: q.difficulty.toLowerCase() as DifficultyLevel,
        question_order: i + 1,
        expected_answer: q.expected_answer,
      }));

      const { error: qError } = await supabase.from("interview_questions").insert(questionRows);
      if (qError) throw qError;

      toast({ title: "Interview created!", description: "Your interview room is ready." });
      setDialogOpen(false);
      setForm({ title: "", company_name: "", company_description: "", job_description: "", requirements: "", target_role: "", type: "technical", difficulty: "medium", salary_min: "", salary_max: "", experience_required: "", duration_minutes: 30 });
      navigate(`/interviews/${interview.id}`);
    } catch (err: any) {
      // Rollback: delete interview if it was created but questions failed to store
      if (createdInterviewId) {
        await supabase.from("interview_questions").delete().eq("interview_id", createdInterviewId);
        await supabase.from("interviews").delete().eq("id", createdInterviewId);
      }
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mock Interviews</h1>
            <p className="text-muted-foreground">AI-powered interview simulations tailored to your target company.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero"><Plus className="mr-2 h-4 w-4" /> New Interview</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Interview</DialogTitle>
                <DialogDescription>Fill in the company and role details. AI will generate tailored questions using your resume.</DialogDescription>
              </DialogHeader>

              {/* Resume status */}
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                {resume ? (
                  <div>
                    <p className="text-sm font-medium text-foreground">Resume: {resume.file_name}</p>
                    <p className="text-xs text-muted-foreground">Your resume will be used for personalized questions</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-destructive">No resume uploaded</p>
                    <p className="text-xs text-muted-foreground">Upload a resume in your Profile for better results</p>
                  </div>
                )}
              </div>

              <div className="grid gap-4 py-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Interview Title *</Label>
                    <Input placeholder="e.g. Google SDE-2 Prep" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Role *</Label>
                    <Input placeholder="e.g. Senior Software Engineer" value={form.target_role} onChange={(e) => setForm({ ...form, target_role: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input placeholder="e.g. Google, Flipkart, Infosys" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>Company Description</Label>
                  <Textarea placeholder="Brief about the company, domain, products..." value={form.company_description} onChange={(e) => setForm({ ...form, company_description: e.target.value })} rows={2} />
                </div>

                <div className="space-y-2">
                  <Label>Job Description</Label>
                  <Textarea placeholder="Paste the full job description here..." value={form.job_description} onChange={(e) => setForm({ ...form, job_description: e.target.value })} rows={3} />
                </div>

                <div className="space-y-2">
                  <Label>Requirements</Label>
                  <Textarea placeholder="Key skills, qualifications, certifications..." value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} rows={2} />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Interview Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as InterviewType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="behavioral">Behavioral</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="system_design">System Design</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v as DifficultyLevel })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Experience Required</Label>
                    <Input placeholder="e.g. 3-5 years" value={form.experience_required} onChange={(e) => setForm({ ...form, experience_required: e.target.value })} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> Salary Min (LPA)</Label>
                    <Input type="number" placeholder="e.g. 15" value={form.salary_min} onChange={(e) => setForm({ ...form, salary_min: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> Salary Max (LPA)</Label>
                    <Input type="number" placeholder="e.g. 25" value={form.salary_max} onChange={(e) => setForm({ ...form, salary_max: e.target.value })} />
                  </div>
                </div>

                <Button variant="hero" onClick={handleCreate} disabled={creating || !form.title || !form.company_name || !form.target_role} className="w-full">
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {creating ? "Generating Questions..." : "Create Interview"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : interviews.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center gap-4 py-16">
              <Mic className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No interviews yet. Create your first mock interview!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {interviews.map((interview) => (
              <Card key={interview.id} className="border-border/50 transition-all hover:border-primary/30 cursor-pointer" onClick={() => {
                if (interview.status === "completed") navigate(`/interviews/${interview.id}/report`);
                else navigate(`/interviews/${interview.id}`);
              }}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg text-foreground">{interview.title}</CardTitle>
                    <Badge className={STATUS_COLORS[interview.status]}>{interview.status.replace("_", " ")}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {interview.company_name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      {interview.company_name}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{interview.type.replace("_", " ")}</Badge>
                    <Badge variant="outline">{interview.difficulty}</Badge>
                  </div>
                  {interview.target_role && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Target className="h-4 w-4" />{interview.target_role}
                    </div>
                  )}
                  {(interview.salary_min || interview.salary_max) && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <IndianRupee className="h-4 w-4" />
                      {interview.salary_min && `₹${interview.salary_min}`}{interview.salary_min && interview.salary_max && " - "}{interview.salary_max && `₹${interview.salary_max}`} LPA
                    </div>
                  )}
                  {interview.overall_score !== null && (
                    <p className="text-sm font-medium text-primary">Score: {interview.overall_score}%</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    {interview.status === "in_progress" && (
                      <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); navigate(`/interviews/${interview.id}`); }}>
                        <Play className="mr-1 h-3 w-3" /> Continue
                      </Button>
                    )}
                    {interview.status === "completed" && (
                      <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); navigate(`/interviews/${interview.id}/report`); }}>
                        <BarChart3 className="mr-1 h-3 w-3" /> View Report
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Interview?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently delete this interview, all questions, answers, and reports associated with it.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={(e) => handleDelete(interview.id, e)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Interviews;
