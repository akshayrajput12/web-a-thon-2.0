import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Code, Plus, Loader2, Clock, Target, FileText, Trash2 } from "lucide-react";
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

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-500/20 text-green-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  hard: "bg-destructive/20 text-destructive",
};

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Coding Challenges</h1>
            <p className="text-muted-foreground">AI-generated coding assessments with real-time judging.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero"><Plus className="mr-2 h-4 w-4" /> New Coding Round</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Generate Coding Round</DialogTitle>
                <DialogDescription>AI will create {form.questionCount} problems based on your profile. Timer: 120 minutes.</DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                {resume ? (
                  <div>
                    <p className="text-sm font-medium text-foreground">Resume: {resume.file_name}</p>
                    <p className="text-xs text-muted-foreground">Problems will be tailored to your skills</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-destructive">No resume uploaded</p>
                    <p className="text-xs text-muted-foreground">Upload in Profile for personalized problems</p>
                  </div>
                )}
              </div>
              <div className="grid gap-4 py-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Target Role *</Label>
                    <Input placeholder="e.g. SDE-2, Backend Engineer" value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input placeholder="e.g. Google, Amazon" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Language *</Label>
                    <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpp">C++</SelectItem>
                        <SelectItem value="c">C</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Questions</Label>
                    <Select value={form.questionCount} onValueChange={(v) => setForm({ ...form, questionCount: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Topics (optional)</Label>
                  <Textarea placeholder="e.g. Arrays, Dynamic Programming, Trees, Graphs..." value={form.topics} onChange={(e) => setForm({ ...form, topics: e.target.value })} rows={2} />
                </div>
                <div className="rounded-lg bg-muted/30 p-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" /><span>Timer: 120 minutes | Pauses when you leave the tab</span>
                </div>
                <Button variant="hero" onClick={handleGenerate} disabled={creating || !form.targetRole} className="w-full">
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {creating ? "Generating Problems..." : "Start Coding Round"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {rounds.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center gap-4 py-16">
              <Code className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No coding rounds yet. Generate your first AI-powered assessment!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rounds.map((round) => (
              <Card key={round.id} className="border-border/50 transition-all hover:border-primary/30 cursor-pointer" onClick={() => handleResumeRound(round)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg text-foreground">{round.title}</CardTitle>
                    <Badge className={DIFFICULTY_COLORS[round.difficulty]}>{round.difficulty}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="h-4 w-4" />{round.target_role}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{round.language === "cpp" ? "C++" : round.language === "c" ? "C" : "Python"}</Badge>
                    <Badge variant="outline">{round.questions.length} problems</Badge>
                    <Badge variant="outline" className={
                      round.status === "completed" ? "text-green-400 border-green-400/30" :
                      round.status === "in_progress" ? "text-yellow-400 border-yellow-400/30" : ""
                    }>
                      {round.status === "in_progress" ? "In Progress" : round.status === "completed" ? "Completed" : "New"}
                    </Badge>
                  </div>
                  {round.time_remaining_seconds !== null && round.time_remaining_seconds < 7200 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />{Math.floor(round.time_remaining_seconds / 60)}m remaining
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />{new Date(round.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleResumeRound(round); }}>
                      <Code className="h-4 w-4 mr-1" /> {round.status === "in_progress" ? "Resume" : "Practice"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={(e) => handleDeleteRound(round.id, e)}>
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
