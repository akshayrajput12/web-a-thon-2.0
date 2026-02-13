import { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft, ChevronRight, Play, Loader2, CheckCircle2,
  XCircle, Eye, EyeOff, Lightbulb, ArrowLeft, Timer, Send, Save,
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

  const timerColor = timeLeft < 300 ? "text-destructive" : timeLeft < 600 ? "text-yellow-400" : "text-primary";
  const currentResults = testResults[currentIdx];
  const passedCount = currentResults?.filter((r) => r.passed).length ?? 0;
  const totalCount = currentResults?.length ?? 0;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-80px)]">
        {/* Top bar */}
        <div className="flex items-center justify-between px-2 py-2 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleExit}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Exit
            </Button>
            <div className="flex gap-1">
              {questions.map((_, i) => {
                const hasResults = testResults[i];
                const allPassed = hasResults?.every((r) => r.passed);
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentIdx(i)}
                    className={`h-7 w-7 rounded-full text-xs font-medium transition-all ${
                      i === currentIdx
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                        : allPassed
                        ? "bg-green-500/20 text-green-400"
                        : hasResults
                        ? "bg-destructive/20 text-destructive"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {savedStatus[currentIdx] && (
              <Badge variant="outline" className="text-green-400 border-green-400/30">
                <Save className="h-3 w-3 mr-1" /> Saved
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsPaused((p) => !p)} className={timerColor}>
              <Timer className="h-4 w-4 mr-1" />
              {formatTime(timeLeft)}
              {isPaused && <span className="ml-1 text-xs">(Paused)</span>}
            </Button>
          </div>
        </div>

        {/* Main content */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={40} minSize={25}>
            <div className="h-full overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Q{currentIdx + 1}. {currentQ?.title}</h2>
                <Badge className={DIFFICULTY_COLORS[currentQ?.difficulty || "medium"]}>{currentQ?.difficulty}</Badge>
              </div>
              <Badge variant="outline">{currentQ?.category}</Badge>
              <div className="prose prose-sm text-foreground max-w-none">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentQ?.description}</p>
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-semibold text-foreground uppercase">Input Format</p>
                  <p className="text-sm text-muted-foreground">{currentQ?.input_format}</p>
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-semibold text-foreground uppercase">Output Format</p>
                  <p className="text-sm text-muted-foreground">{currentQ?.output_format}</p>
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-semibold text-foreground uppercase">Constraints</p>
                  <p className="text-sm font-mono text-muted-foreground">{currentQ?.constraints}</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-foreground uppercase">Examples</p>
                {currentQ?.examples.map((ex, i) => (
                  <div key={i} className="rounded-md bg-muted/50 p-3 space-y-1 text-sm font-mono">
                    <div><span className="text-muted-foreground">Input:</span> <span className="text-foreground whitespace-pre-wrap">{ex.input}</span></div>
                    <div><span className="text-muted-foreground">Output:</span> <span className="text-foreground">{ex.output}</span></div>
                    {ex.explanation && <div className="text-xs text-muted-foreground mt-1 font-sans italic">{ex.explanation}</div>}
                  </div>
                ))}
              </div>
              <div>
                <Button variant="ghost" size="sm" onClick={() => setShowHints((p) => ({ ...p, [currentIdx]: !p[currentIdx] }))}>
                  <Lightbulb className="h-4 w-4 mr-1" />{showHints[currentIdx] ? "Hide Hints" : "Show Hints"}
                </Button>
                {showHints[currentIdx] && (
                  <div className="mt-2 space-y-1">
                    {currentQ?.hints.map((h, i) => (
                      <p key={i} className="text-sm text-muted-foreground pl-4 border-l-2 border-primary/30">💡 {h}</p>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Button variant="ghost" size="sm" onClick={() => setShowSolution((p) => ({ ...p, [currentIdx]: !p[currentIdx] }))}>
                  {showSolution[currentIdx] ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  {showSolution[currentIdx] ? "Hide Solution" : "Show Solution"}
                </Button>
                {showSolution[currentIdx] && currentQ?.solution[language] && (
                  <div className="mt-2 rounded-md bg-muted/50 p-3">
                    <pre className="text-xs font-mono text-foreground whitespace-pre-wrap overflow-x-auto">{currentQ.solution[language]}</pre>
                  </div>
                )}
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}>
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))} disabled={currentIdx === questions.length - 1}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={60} minSize={35}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={60} minSize={30}>
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30">
                    <Badge variant="outline" className="font-mono text-xs">
                      {language === "cpp" ? "C++" : language === "c" ? "C" : "Python"}
                    </Badge>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleRun} disabled={running || timeLeft <= 0}>
                        {running ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                        Run Tests
                      </Button>
                      <Button size="sm" variant="default" onClick={handleReview} disabled={reviewing || timeLeft <= 0}>
                        {reviewing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                        AI Review
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <Editor
                      height="100%"
                      language={LANG_MONACO_MAP[language] || "plaintext"}
                      value={currentCode}
                      onChange={handleCodeChange}
                      theme="vs-dark"
                      options={{ fontSize: 14, minimap: { enabled: false }, padding: { top: 12 }, scrollBeyondLastLine: false, wordWrap: "on", automaticLayout: true }}
                    />
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={40} minSize={15}>
                <div className="h-full flex flex-col bg-background">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                    <div className="flex items-center justify-between px-3 border-b border-border/50">
                      <TabsList className="h-9 bg-transparent">
                        <TabsTrigger value="tests" className="text-xs data-[state=active]:bg-muted">
                          Test Results
                          {currentResults && (
                            <span className={`ml-1.5 text-xs ${passedCount === totalCount && totalCount > 0 ? "text-green-400" : "text-destructive"}`}>
                              ({passedCount}/{totalCount})
                            </span>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="review" className="text-xs data-[state=active]:bg-muted">
                          AI Review
                          {reviews[currentIdx] && <span className="ml-1.5 text-xs text-primary">({reviews[currentIdx].score}/100)</span>}
                        </TabsTrigger>
                      </TabsList>
                      {currentResults && (
                        <div className="flex items-center gap-1.5">
                          {passedCount === totalCount && totalCount > 0 ? (
                            <Badge variant="outline" className="text-green-400 border-green-400/30 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" /> All Passed</Badge>
                          ) : (
                            <Badge variant="outline" className="text-destructive border-destructive/30 text-xs"><XCircle className="h-3 w-3 mr-1" /> {totalCount - passedCount} Failed</Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <TabsContent value="tests" className="flex-1 overflow-y-auto p-3 space-y-2 mt-0">
                      {!currentResults ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <Play className="h-8 w-8 mb-2 opacity-40" />
                          <p className="text-sm">Run tests to see results here</p>
                        </div>
                      ) : (
                        currentResults.map((r, i) => (
                          <div key={i} className={`rounded-lg border p-3 text-sm transition-all ${r.passed ? "bg-green-500/5 border-green-500/20" : "bg-destructive/5 border-destructive/20"}`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                {r.passed ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-destructive" />}
                                <span className="font-medium text-foreground">Test Case {i + 1}</span>
                                {r.is_hidden && <Badge variant="outline" className="text-xs py-0">Hidden</Badge>}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {r.time_ms && <span>⏱ {r.time_ms}s</span>}
                                {r.memory_kb && <span>💾 {Math.round(r.memory_kb / 1024)}MB</span>}
                                <Badge variant="outline" className={`text-xs py-0 ${r.passed ? "text-green-400 border-green-400/30" : "text-destructive border-destructive/30"}`}>
                                  {r.passed ? "PASSED" : "FAILED"}
                                </Badge>
                              </div>
                            </div>
                            {!r.is_hidden && (
                              <div className="space-y-1.5 mt-2 font-mono text-xs">
                                <div className="flex gap-2">
                                  <span className="text-muted-foreground min-w-[60px]">Input:</span>
                                  <pre className="text-foreground bg-muted/50 rounded px-2 py-1 flex-1 overflow-x-auto whitespace-pre-wrap">{r.input}</pre>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-muted-foreground min-w-[60px]">Expected:</span>
                                  <pre className="text-foreground bg-muted/50 rounded px-2 py-1 flex-1 overflow-x-auto whitespace-pre-wrap">{r.expected_output}</pre>
                                </div>
                                {!r.passed && (
                                  <div className="flex gap-2">
                                    <span className="text-destructive min-w-[60px]">Got:</span>
                                    <pre className="text-destructive bg-destructive/5 rounded px-2 py-1 flex-1 overflow-x-auto whitespace-pre-wrap">{r.actual_output || "(empty)"}</pre>
                                  </div>
                                )}
                              </div>
                            )}
                            {r.error && <div className="mt-2 text-xs text-destructive bg-destructive/5 rounded p-2 font-mono">❌ {r.error}</div>}
                          </div>
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="review" className="flex-1 overflow-y-auto p-3 mt-0">
                      {!reviews[currentIdx] ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <Send className="h-8 w-8 mb-2 opacity-40" />
                          <p className="text-sm">Submit for AI review</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                            <div className="text-3xl font-bold text-primary">{reviews[currentIdx].score}<span className="text-lg text-muted-foreground">/100</span></div>
                            <div className="space-y-0.5">
                              <p className="text-xs text-muted-foreground">Time: <span className="text-foreground font-mono">{reviews[currentIdx].time_complexity}</span></p>
                              <p className="text-xs text-muted-foreground">Space: <span className="text-foreground font-mono">{reviews[currentIdx].space_complexity}</span></p>
                              {reviews[currentIdx].is_optimal && <Badge className="bg-green-500/20 text-green-400 text-xs mt-1">✨ Optimal</Badge>}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{reviews[currentIdx].feedback}</p>
                          {reviews[currentIdx].bugs.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-destructive uppercase">Bugs Found</p>
                              {reviews[currentIdx].bugs.map((b, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-destructive bg-destructive/5 rounded p-2">
                                  <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{b}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {reviews[currentIdx].suggestions.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-foreground uppercase">Suggestions</p>
                              {reviews[currentIdx].suggestions.map((s, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 rounded p-2">
                                  <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-yellow-400" /><span>{s}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {reviews[currentIdx].edge_cases.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-foreground uppercase">Edge Cases</p>
                              {reviews[currentIdx].edge_cases.map((ec, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 rounded p-2">
                                  <Eye className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" /><span>{ec}</span>
                                </div>
                              ))}
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
