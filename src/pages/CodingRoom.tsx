import { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft, ChevronRight, Play, Loader2, CheckCircle2,
  XCircle, Eye, EyeOff, Lightbulb, ArrowLeft, Timer, Send, Save, ArrowRight, Activity
} from "lucide-react";
import Editor from "@monaco-editor/react";
import type { CodingQuestion, CodeReviewResult } from "@/lib/coding-ai";
import { reviewCodeSolution } from "@/lib/coding-ai";
import { runTestCases, type TestCaseResult } from "@/lib/judge0";
import { supabase } from "@/integrations/supabase/client";
import { supabaseUntyped } from "@/lib/supabase-helpers";
import type { User } from "@supabase/supabase-js";

interface CodingRoomProps {
  questions: CodingQuestion[];
  language: string;
  onExit: (timeRemaining: number) => void;
  user: User | null;
  roundId: string;
  initialTimeRemaining?: number;
}

const LANG_MONACO_MAP: Record<string, string> = {
  cpp: "cpp",
  c: "c",
  python: "python",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-500/20 text-green-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  hard: "bg-destructive/20 text-destructive",
};

const CodingRoom = ({ questions, language, onExit, user, roundId, initialTimeRemaining }: CodingRoomProps) => {
  const { toast } = useToast();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [codes, setCodes] = useState<Record<number, string>>({});
  const [running, setRunning] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [testResults, setTestResults] = useState<Record<number, TestCaseResult[]>>({});
  const [reviews, setReviews] = useState<Record<number, CodeReviewResult>>({});
  const [showHints, setShowHints] = useState<Record<number, boolean>>({});
  const [showSolution, setShowSolution] = useState<Record<number, boolean>>({});
  const [savedStatus, setSavedStatus] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>("tests");

  const [timeLeft, setTimeLeft] = useState(initialTimeRemaining ?? 120 * 60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef(timeLeft);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  useEffect(() => {
    const initial: Record<number, string> = {};
    questions.forEach((q, i) => {
      initial[i] = q.starter_code[language] || `// Write your solution here\n`;
    });
    setCodes(initial);
  }, [questions, language]);

  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          toast({ title: "Time's up!", description: "Your 120-minute session has ended." });
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPaused, toast]);

  useEffect(() => {
    const handleVisibility = () => setIsPaused(document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Auto-save time to DB every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (roundId && timeLeftRef.current > 0) {
        supabaseUntyped
          .from("coding_rounds")
          .update({ time_remaining_seconds: timeLeftRef.current })
          .eq("id", roundId)
          .then();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [roundId]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const currentQ = questions[currentIdx];
  const currentCode = codes[currentIdx] || "";
  const currentResults = testResults[currentIdx];
  const totalCount = currentResults?.length || 0;
  const passedCount = currentResults?.filter((r) => r.passed).length || 0;

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      setCodes((prev) => ({ ...prev, [currentIdx]: value ?? "" }));
      setSavedStatus((prev) => ({ ...prev, [currentIdx]: false }));
    },
    [currentIdx]
  );

  const saveSubmission = async (
    questionIdx: number,
    code: string,
    results: TestCaseResult[],
    review?: CodeReviewResult
  ) => {
    if (!user) return;

    const question = questions[questionIdx];
    const passed = results.filter((r) => r.passed).length;
    const allPassed = passed === results.length && results.length > 0;

    let status = "pending";
    if (results.length > 0) {
      if (allPassed) status = "accepted";
      else if (results.some(r => r.error?.includes("Compilation"))) status = "compilation_error";
      else if (results.some(r => r.error?.includes("Time"))) status = "time_limit";
      else if (results.some(r => r.error)) status = "runtime_error";
      else status = "wrong_answer";
    }

    // First ensure the problem exists in coding_problems
    let problemId: string;
    const { data: existingProblem } = await supabase
      .from("coding_problems")
      .select("id")
      .eq("title", question.title)
      .limit(1);

    if (existingProblem && existingProblem.length > 0) {
      problemId = existingProblem[0].id;
    } else {
      const { data: newProblem, error: problemError } = await supabaseUntyped
        .from("coding_problems")
        .insert({
          title: question.title,
          description: question.description,
          category: question.category,
          difficulty: question.difficulty,
          constraints: question.constraints,
          examples: question.examples,
          test_cases: question.test_cases,
          starter_code: question.starter_code,
          solution: question.solution[language] || "",
          is_public: true,
        })
        .select("id")
        .single();

      if (problemError || !newProblem) {
        console.error("Failed to save problem:", problemError);
        problemId = crypto.randomUUID();
      } else {
        problemId = newProblem.id;
      }
    }

    try {
      const { error } = await supabaseUntyped.from("coding_submissions").insert({
        user_id: user.id,
        problem_id: problemId,
        code,
        language,
        status,
        test_results: results.map(r => ({
          input: r.input,
          expected: r.expected_output,
          actual: r.actual_output,
          passed: r.passed,
          time_ms: r.time_ms,
          error: r.error,
        })),
        ai_review: review ? {
          score: review.score,
          time_complexity: review.time_complexity,
          space_complexity: review.space_complexity,
          feedback: review.feedback,
          bugs: review.bugs,
          suggestions: review.suggestions,
        } : {},
        runtime_ms: results[0]?.time_ms ? Math.round(parseFloat(results[0].time_ms) * 1000) : null,
        memory_kb: results[0]?.memory_kb || null,
      });

      if (error) {
        console.error("Save submission error:", error);
        toast({ title: "Save failed", description: error.message, variant: "destructive" });
      } else {
        setSavedStatus((prev) => ({ ...prev, [questionIdx]: true }));
        toast({ title: "Solution saved!", description: `${question.title} — ${status.replace("_", " ")}` });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Save failed";
      toast({ title: "Save failed", description: message, variant: "destructive" });
    }
  };

  const handleRun = async () => {
    if (!currentQ) return;
    setRunning(true);
    setActiveTab("tests");
    try {
      const results = await runTestCases(currentCode, language, currentQ.test_cases);
      setTestResults((prev) => ({ ...prev, [currentIdx]: results }));
      const passed = results.filter((r) => r.passed).length;
      toast({
        title: `${passed}/${results.length} test cases passed`,
        description: passed === results.length ? "All tests passed! 🎉" : "Some tests failed.",
        variant: passed === results.length ? "default" : "destructive",
      });
      await saveSubmission(currentIdx, currentCode, results);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Execution error";
      toast({ title: "Execution error", description: message, variant: "destructive" });
    }
    setRunning(false);
  };

  const handleReview = async () => {
    if (!currentQ) return;
    setReviewing(true);
    setActiveTab("review");
    try {
      const results = testResults[currentIdx] || [];
      const review = await reviewCodeSolution({
        code: currentCode,
        language,
        problemTitle: currentQ.title,
        problemDescription: currentQ.description,
        testResults: results.map((r) => ({
          passed: r.passed,
          input: r.input,
          expected: r.expected_output,
          actual: r.actual_output,
        })),
      });
      setReviews((prev) => ({ ...prev, [currentIdx]: review }));
      toast({ title: `AI Review: ${review.score}/100`, description: review.feedback });
      await saveSubmission(currentIdx, currentCode, results, review);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Review failed";
      toast({ title: "Review failed", description: message, variant: "destructive" });
    }
    setReviewing(false);
  };

  const handleExit = () => onExit(timeLeftRef.current);

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-80px)] bg-background/95 backdrop-blur-sm animate-in fade-in duration-500">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card/50 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleExit} className="hover:bg-destructive/10 hover:text-destructive transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" /> Exit Round
            </Button>
            <div className="h-6 w-px bg-border/50" />
            <div className="flex gap-2">
              {questions.map((_, i) => {
                const hasResults = testResults[i];
                const allPassed = hasResults?.every((r) => r.passed);
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentIdx(i)}
                    className={`h-8 w-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center border ${i === currentIdx
                      ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/20 shadow-md transform scale-105"
                      : allPassed
                        ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
                        : hasResults
                          ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                          : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                      }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {savedStatus[currentIdx] && (
              <div className="flex items-center gap-1.5 text-green-500 text-xs font-medium animate-in fade-in slide-in-from-right-4">
                <CheckCircle2 className="h-3.5 w-3.5" /> Saved
              </div>
            )}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${timeLeft < 300 ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-muted/30 border-border/50 text-foreground"}`}>
              <Timer className="h-4 w-4 shrink-0" />
              <span className="font-mono font-medium tabular-nums">{formatTime(timeLeft)}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsPaused((p) => !p)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              {isPaused ? <Play className="h-4 w-4" /> : <span className="h-3 w-3 rounded-sm bg-current" />}
            </Button>
          </div>
        </div>

        {/* Main content */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={40} minSize={25} className="bg-card">
            <div className="h-full overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-2xl font-bold text-foreground leading-tight">Q{currentIdx + 1}. {currentQ?.title}</h2>
                  <Badge className={`${DIFFICULTY_COLORS[currentQ?.difficulty || "medium"]} px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide border-0`}>
                    {currentQ?.difficulty}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs font-medium text-muted-foreground bg-muted/50 border-border/50">
                    {currentQ?.category}
                  </Badge>
                </div>
              </div>

              <div className="prose prose-invert prose-sm max-w-none text-muted-foreground leading-relaxed">
                <p className="whitespace-pre-wrap">{currentQ?.description}</p>

                <div className="grid gap-4 mt-6 p-4 rounded-xl bg-muted/20 border border-border/40">
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Input Format</h4>
                    <p className="text-sm font-mono text-muted-foreground bg-background/50 p-2 rounded-md border border-border/30">{currentQ?.input_format}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Output Format</h4>
                    <p className="text-sm font-mono text-muted-foreground bg-background/50 p-2 rounded-md border border-border/30">{currentQ?.output_format}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Constraints</h4>
                    <p className="text-sm font-mono text-muted-foreground bg-background/50 p-2 rounded-md border border-border/30">{currentQ?.constraints}</p>
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> Examples</h4>
                  {currentQ?.examples.map((ex, i) => (
                    <div key={i} className="rounded-xl border border-border/40 bg-muted/20 overflow-hidden">
                      <div className="p-3 grid gap-2 text-sm font-mono">
                        <div className="grid grid-cols-[60px_1fr] gap-2">
                          <span className="text-muted-foreground font-semibold">Input:</span>
                          <span className="text-foreground">{ex.input}</span>
                        </div>
                        <div className="grid grid-cols-[60px_1fr] gap-2">
                          <span className="text-muted-foreground font-semibold">Output:</span>
                          <span className="text-foreground">{ex.output}</span>
                        </div>
                      </div>
                      {ex.explanation && (
                        <div className="bg-muted/30 p-2 px-3 text-xs text-muted-foreground border-t border-border/30 italic">
                          {ex.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-border/40">
                <Button variant="ghost" size="sm" onClick={() => setShowHints((p) => ({ ...p, [currentIdx]: !p[currentIdx] }))} className="text-muted-foreground hover:text-yellow-500">
                  <Lightbulb className="h-4 w-4 mr-2" />{showHints[currentIdx] ? "Hide Hints" : "Need a Hint?"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowSolution((p) => ({ ...p, [currentIdx]: !p[currentIdx] }))} className="text-muted-foreground hover:text-primary">
                  {showSolution[currentIdx] ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showSolution[currentIdx] ? "Hide Solution" : "View Solution"}
                </Button>
              </div>

              {showHints[currentIdx] && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  {currentQ?.hints.map((h, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-sm">
                      <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>{h}</p>
                    </div>
                  ))}
                </div>
              )}

              {showSolution[currentIdx] && currentQ?.solution[language] && (
                <div className="rounded-lg border border-border/40 overflow-hidden animate-in slide-in-from-top-2">
                  <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border/40">Optimal Solution ({language})</div>
                  <div className="bg-background/50 p-3 overflow-x-auto">
                    <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">{currentQ.solution[language]}</pre>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-6 pb-20">
                <Button variant="outline" onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0} className="w-24">
                  <ChevronLeft className="h-4 w-4 mr-2" /> Prev
                </Button>
                <Button variant="outline" onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))} disabled={currentIdx === questions.length - 1} className="w-24">
                  Next <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border/60 hover:bg-primary/50 transition-colors w-1" />

          <ResizablePanel defaultSize={60} minSize={35}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={65} minSize={30}>
                <div className="flex flex-col h-full bg-[#1e1e1e]">
                  <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-[#333] text-gray-300 hover:bg-[#333] border-0 rounded-sm px-2 font-mono text-xs uppercase tracking-wider">
                        {language === "cpp" ? "C++" : language === "c" ? "C" : "Python"}
                      </Badge>
                      <span className="text-xs text-gray-500">main.{language === "cpp" ? "cpp" : language === "c" ? "c" : "py"}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-0 h-8 shadow-sm" onClick={handleRun} disabled={running || timeLeft <= 0}>
                        {running ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />}
                        Run Code
                      </Button>
                      <Button size="sm" variant="secondary" className="bg-blue-600 hover:bg-blue-700 text-white border-0 h-8 shadow-sm" onClick={handleReview} disabled={reviewing || timeLeft <= 0}>
                        {reviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                        Submit & Review
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 relative">
                    <Editor
                      height="100%"
                      language={LANG_MONACO_MAP[language] || "plaintext"}
                      value={currentCode}
                      onChange={handleCodeChange}
                      theme="vs-dark"
                      options={{
                        fontSize: 14,
                        minimap: { enabled: false },
                        padding: { top: 16, bottom: 16 },
                        scrollBeyondLastLine: false,
                        wordWrap: "on",
                        automaticLayout: true,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        fontLigatures: true,
                        cursorBlinking: "smooth",
                        smoothScrolling: true,
                      }}
                    />
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle className="bg-[#333] hover:bg-primary/50 transition-colors h-1" />

              <ResizablePanel defaultSize={35} minSize={15}>
                <div className="h-full flex flex-col bg-background border-t border-border/40">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                    <div className="flex items-center justify-between px-4 border-b border-border/50 bg-muted/20">
                      <TabsList className="h-10 bg-transparent p-0 gap-4">
                        <TabsTrigger value="tests" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground transition-all">
                          Test Cases
                          {currentResults && (
                            <Badge variant={passedCount === totalCount ? "default" : "destructive"} className="ml-2 h-5 px-1.5 text-[10px] uppercase">
                              {passedCount}/{totalCount}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="review" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground transition-all">
                          AI Feedback
                          {reviews[currentIdx] && <Badge variant="outline" className="ml-2 h-5 px-1.5 text-[10px] text-primary border-primary/30">{reviews[currentIdx].score}</Badge>}
                        </TabsTrigger>
                      </TabsList>
                      {currentResults && (
                        <div className="text-xs font-medium">
                          {passedCount === totalCount && totalCount > 0 ? (
                            <span className="text-green-500 flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> All Tests Passed</span>
                          ) : (
                            <span className="text-destructive flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5" /> {totalCount - passedCount} Failed</span>
                          )}
                        </div>
                      )}
                    </div>

                    <TabsContent value="tests" className="flex-1 overflow-y-auto p-4 space-y-3 mt-0 bg-background/50">
                      {!currentResults ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3">
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <Play className="h-6 w-6 opacity-40 ml-1" />
                          </div>
                          <p className="text-sm">Run your code to check against test cases.</p>
                        </div>
                      ) : (
                        currentResults.map((r, i) => (
                          <div key={i} className={`rounded-xl border p-4 text-sm transition-all shadow-sm ${r.passed ? "bg-green-500/5 border-green-500/20" : "bg-destructive/5 border-destructive/20"}`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {r.passed ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
                                <span className="font-semibold text-foreground">Test Case {i + 1}</span>
                                {r.is_hidden && <Badge variant="outline" className="text-[10px] py-0 h-5">Hidden</Badge>}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                                {r.time_ms && <span>{r.time_ms}s</span>}
                                {r.memory_kb && <span>{Math.round(r.memory_kb / 1024)}MB</span>}
                              </div>
                            </div>
                            {!r.is_hidden && (
                              <div className="grid gap-2 bg-background/40 rounded-lg p-3 border border-border/30 font-mono text-xs overflow-hidden">
                                <div className="grid grid-cols-[70px_1fr] gap-2">
                                  <span className="text-muted-foreground">Input:</span>
                                  <span className="text-foreground">{r.input}</span>
                                </div>
                                <div className="grid grid-cols-[70px_1fr] gap-2">
                                  <span className="text-muted-foreground">Expected:</span>
                                  <span className="text-foreground">{r.expected_output}</span>
                                </div>
                                {!r.passed && (
                                  <div className="grid grid-cols-[70px_1fr] gap-2">
                                    <span className="text-destructive font-semibold">Output:</span>
                                    <span className="text-destructive">{r.actual_output || "(empty)"}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            {r.error && <div className="mt-3 text-xs text-destructive-foreground bg-destructive/10 rounded-md p-2.5 font-mono border border-destructive/20 leading-relaxed">{r.error}</div>}
                          </div>
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="review" className="flex-1 overflow-y-auto p-6 mt-0 bg-background/50">
                      {!reviews[currentIdx] ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3">
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <Send className="h-6 w-6 opacity-40 ml-0.5 mt-0.5" />
                          </div>
                          <p className="text-sm">Submit your solution to get detailed AI feedback.</p>
                        </div>
                      ) : (
                        <div className="space-y-6 max-w-3xl mx-auto">
                          {/* Score Card */}
                          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-gradient-to-br from-background to-muted border border-border/50 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                              <Activity className="h-24 w-24" />
                            </div>
                            <div className="relative z-10 flex flex-col items-center justify-center text-center sm:text-left sm:items-start min-w-[120px]">
                              <span className="text-4xl font-black text-primary tracking-tight">{reviews[currentIdx].score}</span>
                              <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Score</span>
                            </div>
                            <div className="h-px w-full sm:w-px sm:h-16 bg-border/50" />
                            <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Time Compl.</span>
                                <p className="font-mono text-sm font-semibold">{reviews[currentIdx].time_complexity}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Space Compl.</span>
                                <p className="font-mono text-sm font-semibold">{reviews[currentIdx].space_complexity}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h3 className="text-base font-bold flex items-center gap-2"><ArrowRight className="h-4 w-4 text-primary" /> Analysis</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed bg-muted/20 p-4 rounded-xl border border-border/40">
                              {reviews[currentIdx].feedback}
                            </p>
                          </div>

                          {reviews[currentIdx].bugs.length > 0 && (
                            <div className="space-y-3">
                              <h3 className="text-sm font-bold text-destructive flex items-center gap-2"><XCircle className="h-4 w-4" /> Potential Bugs</h3>
                              <ul className="space-y-2">
                                {reviews[currentIdx].bugs.map((b, i) => (
                                  <li key={i} className="text-sm text-destructive-foreground bg-destructive/5 rounded-lg border border-destructive/10 p-3 pl-4 relative">
                                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-destructive/40 rounded-l-lg" />
                                    {b}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {reviews[currentIdx].suggestions.length > 0 && (
                            <div className="space-y-3">
                              <h3 className="text-sm font-bold text-yellow-500 flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Optimization Tips</h3>
                              <ul className="space-y-2">
                                {reviews[currentIdx].suggestions.map((s, i) => (
                                  <li key={i} className="text-sm text-foreground bg-yellow-500/5 rounded-lg border border-yellow-500/10 p-3 pl-4 relative">
                                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500/40 rounded-l-lg" />
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </DashboardLayout>
  );
};

export default CodingRoom;
