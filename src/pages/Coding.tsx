import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { supabaseUntyped } from "@/lib/supabase-helpers";
import { useToast } from "@/hooks/use-toast";
import { Code, Plus, Loader2, Clock, Target, FileText, Trash2, ArrowRight, Sparkles, Trophy, Hourglass } from "lucide-react";
import { generateCodingRound, type CodingQuestion } from "@/lib/coding-ai";
import CodingRoom from "@/pages/CodingRoom";

interface ResumeData {
  id: string;
  file_name: string;
  file_url: string;
}

interface CodingRoundRow {
  id: string;
  title: string;
  target_role: string;
  company_name: string | null;
  difficulty: string;
  language: string;
  questions: CodingQuestion[];
  status: string;
  time_remaining_seconds: number | null;
  created_at: string;
}

const Coding = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rounds, setRounds] = useState<CodingRoundRow[]>([]);

  const [activeRound, setActiveRound] = useState<{
    roundId: string;
    questions: CodingQuestion[];
    language: string;
    timeRemaining: number;
  } | null>(null);

  const [form, setForm] = useState({
    targetRole: "",
    companyName: "",
    difficulty: "medium",
    language: "cpp",
    questionCount: "4",
    topics: "",
  });

  const fetchRounds = async () => {
    if (!user) return;
    const { data, error } = await supabaseUntyped
      .from("coding_rounds")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRounds(data as CodingRoundRow[]);
    }
  };

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from("resumes")
        .select("id, file_name, file_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),
      fetchRounds(),
    ]).then(([resumeRes]) => {
      if (resumeRes.data && resumeRes.data.length > 0) {
        setResume(resumeRes.data[0] as ResumeData);
      }
      setLoading(false);
    });
  }, [user]);

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

  const handleGenerate = async () => {
    if (!form.targetRole || !user) {
      toast({ title: "Missing field", description: "Target role is required.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      toast({ title: "Generating problems...", description: "AI is crafting your coding round." });
      const resumeText = await fetchResumeText();
      const questions = await generateCodingRound({
        targetRole: form.targetRole,
        companyName: form.companyName,
        difficulty: form.difficulty,
        language: form.language,
        resumeText,
        questionCount: parseInt(form.questionCount) || 4,
        topics: form.topics,
      });

      const roundTitle = form.companyName
        ? `${form.companyName} - ${form.targetRole}`
        : `${form.targetRole} Round`;

      const { data: insertedRound, error } = await supabaseUntyped
        .from("coding_rounds")
        .insert({
          user_id: user.id,
          title: roundTitle,
          target_role: form.targetRole,
          company_name: form.companyName || null,
          difficulty: form.difficulty,
          language: form.language,
          questions,
          status: "created",
          time_remaining_seconds: 120 * 60,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      await fetchRounds();

      setActiveRound({
        roundId: insertedRound.id,
        questions,
        language: form.language,
        timeRemaining: 120 * 60,
      });
      setDialogOpen(false);
      toast({ title: "Coding round ready!", description: `${questions.length} problems generated.` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Generation failed";
      toast({ title: "Generation failed", description: message, variant: "destructive" });
    }
    setCreating(false);
  };

  const handleDeleteRound = async (roundId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabaseUntyped.from("coding_rounds").delete().eq("id", roundId);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      setRounds((prev) => prev.filter((r) => r.id !== roundId));
      toast({ title: "Round deleted" });
    }
  };

  const handleResumeRound = (round: CodingRoundRow) => {
    setActiveRound({
      roundId: round.id,
      questions: round.questions,
      language: round.language,
      timeRemaining: round.time_remaining_seconds ?? 120 * 60,
    });
  };

  const handleExitRoom = async (roundId: string, timeRemaining: number) => {
    await supabaseUntyped
      .from("coding_rounds")
      .update({ time_remaining_seconds: timeRemaining, status: "in_progress" })
      .eq("id", roundId);
    setActiveRound(null);
    fetchRounds();
  };

  if (activeRound) {
    return (
      <CodingRoom
        questions={activeRound.questions}
        language={activeRound.language}
        onExit={(timeRemaining) => handleExitRoom(activeRound.roundId, timeRemaining)}
        user={user ?? null}
        roundId={activeRound.roundId}
        initialTimeRemaining={activeRound.timeRemaining}
      />
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Coding Challenges</h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              Solve AI-curated problems tailored to your target roles with real-time judging usage.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg hover:shadow-primary/25 transition-all duration-300">
                <Plus className="mr-2 h-5 w-5" /> New Assessment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Generate Coding Round</DialogTitle>
                <DialogDescription className="text-base text-muted-foreground">
                  Configure your assessment. Our AI will curate {form.questionCount} problems matching your skill level and target.
                </DialogDescription>
              </DialogHeader>

              <div className={`rounded-xl border p-4 flex items-center gap-4 transition-colors ${resume ? "border-primary/20 bg-primary/5" : "border-destructive/20 bg-destructive/5"}`}>
                <div className={`p-2 rounded-full ${resume ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                  <FileText className="h-5 w-5" />
                </div>
                {resume ? (
                  <div>
                    <p className="text-sm font-semibold text-foreground">Using Resume: {resume.file_name}</p>
                    <p className="text-xs text-muted-foreground">Problems tailored to your experience.</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-destructive">No Resume Found</p>
                    <p className="text-xs text-destructive-foreground/80">Upload in Profile for better personalization.</p>
                  </div>
                )}
              </div>

              <div className="grid gap-6 py-4">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2.5">
                    <Label className="text-sm font-medium text-foreground/80">Target Role</Label>
                    <Input
                      placeholder="e.g. SDE-2, Full Stack"
                      value={form.targetRole}
                      onChange={(e) => setForm({ ...form, targetRole: e.target.value })}
                      className="bg-background/50 focus:bg-background transition-colors"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-sm font-medium text-foreground/80">Company Name</Label>
                    <Input
                      placeholder="e.g. Uber, Adobe"
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      className="bg-background/50 focus:bg-background transition-colors"
                    />
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-3">
                  <div className="space-y-2.5">
                    <Label className="text-sm font-medium text-foreground/80">Language</Label>
                    <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                      <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpp">C++</SelectItem>
                        <SelectItem value="c">C</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-sm font-medium text-foreground/80">Difficulty</Label>
                    <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                      <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-sm font-medium text-foreground/80">Questions</Label>
                    <Select value={form.questionCount} onValueChange={(v) => setForm({ ...form, questionCount: v })}>
                      <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label className="text-sm font-medium text-foreground/80">Topics <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                  <Textarea
                    placeholder="e.g. Arrays, DP, Graphs (leave empty for random mix)"
                    value={form.topics}
                    onChange={(e) => setForm({ ...form, topics: e.target.value })}
                    rows={2}
                    className="bg-background/50 focus:bg-background transition-colors resize-none"
                  />
                </div>

                <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-3 flex items-center gap-3 text-sm text-orange-700 dark:text-orange-400">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>Time Limit: <strong>120 minutes</strong>. Timer pauses if you leave.</span>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={creating || !form.targetRole}
                  className="w-full mt-2 shadow-md hover:shadow-primary/25 transition-all"
                  size="lg"
                >
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {creating ? "Generating Challenge..." : "Start Coding Round"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-32"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
        ) : rounds.length === 0 ? (
          <Card className="border-dashed border-2 border-border/60 bg-muted/10">
            <CardContent className="flex flex-col items-center gap-6 py-24 text-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Code className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">No Assessments Yet</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Challenge yourself! Create your first AI-powered coding round to test your algorithmic skills.
                </p>
              </div>
              <Button size="lg" onClick={() => setDialogOpen(true)} variant="outline" className="mt-4">
                Create First Round
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rounds.map((round) => (
              <Card
                key={round.id}
                className="group relative overflow-hidden border-border/50 bg-card transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 cursor-pointer"
                onClick={() => handleResumeRound(round)}
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <ArrowRight className="h-5 w-5 text-primary" />
                </div>

                <CardHeader className="pb-3 pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <Badge
                        variant="secondary"
                        className={`capitalize px-2.5 py-0.5 text-xs font-semibold tracking-wide border ${round.status === 'completed' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                            round.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                              'bg-muted text-muted-foreground border-border/50'
                          }`}
                      >
                        {round.status === "in_progress" ? "In Progress" : round.status === "completed" ? "Completed" : "New"}
                      </Badge>
                      <Badge variant="outline" className={`capitalize ${round.difficulty === 'hard' ? 'text-destructive border-destructive/30' :
                          round.difficulty === 'medium' ? 'text-yellow-600 dark:text-yellow-400 border-yellow-500/30' :
                            'text-green-600 dark:text-green-400 border-green-500/30'
                        }`}>
                        {round.difficulty}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl font-bold text-foreground line-clamp-1 leading-tight group-hover:text-primary transition-colors">
                      {round.title}
                    </CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 pb-6">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Target className="h-4 w-4 shrink-0 opacity-70" />
                      <span className="font-medium text-foreground/80 line-clamp-1">{round.target_role}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Code className="h-4 w-4 shrink-0 opacity-70" />
                      <span>{round.language === "cpp" ? "C++" : round.language === "c" ? "C" : "Python"}</span>
                      <span className="text-muted-foreground/40">•</span>
                      <span>{round.questions.length} Questions</span>
                    </div>
                    {round.time_remaining_seconds !== null && round.time_remaining_seconds < 7200 && (
                      <div className="flex items-center gap-2.5 text-sm font-medium text-orange-600 dark:text-orange-400">
                        <Hourglass className="h-4 w-4 shrink-0" />
                        {Math.floor(round.time_remaining_seconds / 60)}m remaining
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/30 mt-4">
                    <Button size="sm" className={`w-full shadow-none border-0 ${round.status === 'completed' ? 'bg-secondary text-foreground hover:bg-secondary/80' : 'bg-primary/10 text-primary hover:bg-primary/20'}`} onClick={(e) => { e.stopPropagation(); handleResumeRound(round); }}>
                      {round.status === "completed" ? <Trophy className="mr-2 h-3.5 w-3.5" /> : <Code className="mr-2 h-3.5 w-3.5" />}
                      {round.status === "in_progress" ? "Continue" : round.status === "completed" ? "Review" : "Start"}
                    </Button>

                    <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={(e) => handleDeleteRound(round.id, e)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

export default Coding;
