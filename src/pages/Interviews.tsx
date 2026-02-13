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
import { Mic, Plus, Clock, Target, Loader2, Building2, IndianRupee, FileText, Play, BarChart3, Trash2, ArrowRight } from "lucide-react";
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
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Mock Interviews</h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              Master your interview skills with AI-powered simulations tailored to your target roles.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg hover:shadow-primary/25 transition-all duration-300">
                <Plus className="mr-2 h-5 w-5" /> New Interview
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-foreground">Create New Interview</DialogTitle>
                <DialogDescription className="text-base text-muted-foreground">
                  Configure your session details. Our AI will generate custom questions based on your profile.
                </DialogDescription>
              </DialogHeader>

              {/* Resume status */}
              <div className={`rounded-xl border p-4 flex items-center gap-4 transition-colors ${resume ? "border-primary/20 bg-primary/5" : "border-destructive/20 bg-destructive/5"}`}>
                <div className={`p-2 rounded-full ${resume ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                  <FileText className="h-5 w-5" />
                </div>
                {resume ? (
                  <div>
                    <p className="text-sm font-semibold text-foreground">Using Resume: {resume.file_name}</p>
                    <p className="text-xs text-muted-foreground">Tailored questions will be generated from this file.</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-destructive">No Resume Found</p>
                    <p className="text-xs text-destructive-foreground/80">Upload a resume in your Profile for the best experience.</p>
                  </div>
                )}
              </div>

              <div className="grid gap-6 py-4">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2.5">
                    <Label className="text-sm font-medium text-foreground/80">Interview Title</Label>
                    <Input
                      placeholder="e.g. Google Frontend Loop"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="bg-background/50 focus:bg-background transition-colors"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-sm font-medium text-foreground/80">Target Role</Label>
                    <Input
                      placeholder="e.g. Senior React Developer"
                      value={form.target_role}
                      onChange={(e) => setForm({ ...form, target_role: e.target.value })}
                      className="bg-background/50 focus:bg-background transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label className="text-sm font-medium text-foreground/80">Company Name</Label>
                  <Input
                    placeholder="e.g. Acme Corp"
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    className="bg-background/50 focus:bg-background transition-colors"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-sm font-medium text-foreground/80">Company Description <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                  <Textarea
                    placeholder="Briefly describe the company culture or product..."
                    value={form.company_description}
                    onChange={(e) => setForm({ ...form, company_description: e.target.value })}
                    rows={2}
                    className="bg-background/50 focus:bg-background transition-colors resize-none"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-sm font-medium text-foreground/80">Job Description <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                  <Textarea
                    placeholder="Paste the JD here for precise targeting..."
                    value={form.job_description}
                    onChange={(e) => setForm({ ...form, job_description: e.target.value })}
                    rows={3}
                    className="bg-background/50 focus:bg-background transition-colors resize-none"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-sm font-medium text-foreground/80">Key Requirements <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                  <Textarea
                    placeholder="Specific skills or certifications needed..."
                    value={form.requirements}
                    onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                    rows={2}
                    className="bg-background/50 focus:bg-background transition-colors resize-none"
                  />
                </div>

                <div className="grid gap-6 sm:grid-cols-3">
                  <div className="space-y-2.5">
                    <Label className="text-sm font-medium text-foreground/80">Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as InterviewType })}>
                      <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="behavioral">Behavioral</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="system_design">System Design</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-sm font-medium text-foreground/80">Difficulty</Label>
                    <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v as DifficultyLevel })}>
                      <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-sm font-medium text-foreground/80">Experience</Label>
                    <Input
                      placeholder="e.g. 3-5 years"
                      value={form.experience_required}
                      onChange={(e) => setForm({ ...form, experience_required: e.target.value })}
                      className="bg-background/50 focus:bg-background transition-colors"
                    />
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2.5">
                    <Label className="flex items-center gap-1.5 text-sm font-medium text-foreground/80"><IndianRupee className="h-3.5 w-3.5" /> Salary Min (LPA)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 15"
                      value={form.salary_min}
                      onChange={(e) => setForm({ ...form, salary_min: e.target.value })}
                      className="bg-background/50 focus:bg-background transition-colors"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="flex items-center gap-1.5 text-sm font-medium text-foreground/80"><IndianRupee className="h-3.5 w-3.5" /> Salary Max (LPA)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 25"
                      value={form.salary_max}
                      onChange={(e) => setForm({ ...form, salary_max: e.target.value })}
                      className="bg-background/50 focus:bg-background transition-colors"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleCreate}
                  disabled={creating || !form.title || !form.company_name || !form.target_role}
                  className="w-full mt-2 shadow-md hover:shadow-primary/25 transition-all"
                  size="lg"
                >
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {creating ? "Generating Customized Questions..." : "Generate Interview Session"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-32"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
        ) : interviews.length === 0 ? (
          <Card className="border-dashed border-2 border-border/60 bg-muted/10">
            <CardContent className="flex flex-col items-center gap-6 py-24 text-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Mic className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">No Interviews Yet</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Ready to test your skills? Create your first AI-driven interview specifically designed for your dream job.
                </p>
              </div>
              <Button size="lg" onClick={() => setDialogOpen(true)} variant="outline" className="mt-4">
                Start Your First Session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {interviews.map((interview) => (
              <Card
                key={interview.id}
                className="group relative overflow-hidden border-border/50 bg-card transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 cursor-pointer"
                onClick={() => {
                  if (interview.status === "completed") navigate(`/interviews/${interview.id}/report`);
                  else navigate(`/interviews/${interview.id}`);
                }}
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <ArrowRight className="h-5 w-5 text-primary" />
                </div>

                <CardHeader className="pb-3 pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <Badge
                        variant="secondary"
                        className={`capitalize px-2.5 py-0.5 text-xs font-semibold tracking-wide ${interview.status === 'completed' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                          interview.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                            'bg-muted text-muted-foreground'
                          }`}
                      >
                        {interview.status.replace("_", " ")}
                      </Badge>
                      {interview.overall_score !== null && (
                        <div className="flex items-center gap-1.5 text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          <Target className="h-3.5 w-3.5" /> {interview.overall_score}%
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-xl font-bold text-foreground line-clamp-1 leading-tight group-hover:text-primary transition-colors">
                      {interview.title}
                    </CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 pb-6">
                  <div className="space-y-2.5">
                    {interview.company_name && (
                      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4 shrink-0 opacity-70" />
                        <span className="font-medium text-foreground/80 line-clamp-1">{interview.company_name}</span>
                      </div>
                    )}
                    {interview.target_role && (
                      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <Target className="h-4 w-4 shrink-0 opacity-70" />
                        <span className="line-clamp-1">{interview.target_role}</span>
                      </div>
                    )}
                    {(interview.salary_min || interview.salary_max) && (
                      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <IndianRupee className="h-4 w-4 shrink-0 opacity-70" />
                        <span>
                          {interview.salary_min && `₹${interview.salary_min}L`}{interview.salary_min && interview.salary_max && " - "}{interview.salary_max && `₹${interview.salary_max}L`}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge variant="outline" className="bg-background/50 text-xs font-medium border-border/60 capitalize">
                      {interview.type.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline" className={`bg-background/50 text-xs font-medium border-border/60 capitalize ${interview.difficulty === 'hard' ? 'text-destructive' :
                      interview.difficulty === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                      {interview.difficulty}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/30 mt-4">
                    {interview.status === "in_progress" ? (
                      <Button size="sm" className="w-full bg-primary/10 hover:bg-primary/20 text-primary shadow-none border-0" onClick={(e) => { e.stopPropagation(); navigate(`/interviews/${interview.id}`); }}>
                        <Play className="mr-2 h-3.5 w-3.5 fill-current" /> Resume
                      </Button>
                    ) : interview.status === "completed" ? (
                      <Button size="sm" variant="outline" className="w-full hover:bg-muted" onClick={(e) => { e.stopPropagation(); navigate(`/interviews/${interview.id}/report`); }}>
                        <BarChart3 className="mr-2 h-3.5 w-3.5" /> Analysis
                      </Button>
                    ) : null}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Interview Session?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. All questions, answers, and generated reports for <span className="font-medium text-foreground">{interview.title}</span> will be permanently removed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={(e) => handleDelete(interview.id, e)}>Delete Permanently</AlertDialogAction>
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
