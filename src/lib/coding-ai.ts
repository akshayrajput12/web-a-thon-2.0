import { callGemini, extractJSON } from "@/lib/ai";

// ─── Types ───

export interface CodingQuestion {
  title: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  description: string;
  input_format: string;
  output_format: string;
  constraints: string;
  examples: Array<{ input: string; output: string; explanation: string }>;
  test_cases: Array<{ input: string; expected_output: string; is_hidden: boolean }>;
  starter_code: Record<string, string>;
  solution: Record<string, string>;
  time_limit_ms: number;
  memory_limit_kb: number;
  hints: string[];
}

export interface CodeReviewResult {
  score: number;
  passed_tests: number;
  total_tests: number;
  time_complexity: string;
  space_complexity: string;
  is_optimal: boolean;
  feedback: string;
  bugs: string[];
  suggestions: string[];
  edge_cases: string[];
}

// ─── Question Generation ───

export async function generateCodingRound(params: {
  targetRole: string;
  companyName: string;
  difficulty: string;
  language: string;
  resumeText: string;
  questionCount?: number;
  topics?: string;
}): Promise<CodingQuestion[]> {
  const count = params.questionCount || 4;

  const systemPrompt = `You are a CTO-level technical assessment architect at ${params.companyName || "a top-tier tech company"} with 20+ years of experience designing coding assessments for ${params.targetRole} positions.

Your assessment design philosophy:
1. PROGRESSIVE DIFFICULTY: Start with a warm-up problem, escalate to complex multi-step problems
2. REAL-WORLD RELEVANCE: Problems should test skills actually used in ${params.targetRole} work
3. COMPREHENSIVE TEST CASES: Include edge cases (empty input, single element, max constraints, negative numbers, duplicates)
4. PRECISE SPECIFICATIONS: Every input/output format must be exact — no ambiguity
5. OPTIMAL SOLUTIONS: Provide solutions in ${params.language} that demonstrate best practices

Test case guidelines:
- At least 6-8 test cases per problem (3-4 visible, 3-4 hidden)
- Visible examples should explain the logic step-by-step
- Hidden test cases should cover: edge cases, large inputs, boundary conditions
- Input/output must be string-serialized (e.g., "5\\n1 2 3 4 5" for array input)

Starter code guidelines:
- Include proper I/O boilerplate for the language
- Add comments indicating where the candidate should write their solution
- For ${params.language}: use standard input/output

You MUST return ONLY a valid JSON array — no markdown, no commentary.`;

  const userPrompt = `CODING ASSESSMENT CONTEXT:
Company: ${params.companyName || "Top Tech Company"}
Role: ${params.targetRole}
Difficulty: ${params.difficulty}
Language: ${params.language}
Topics: ${params.topics || "Data Structures, Algorithms, Problem Solving"}

CANDIDATE RESUME:
${params.resumeText || "Not provided — generate standard DSA questions"}

Generate exactly ${count} coding problems as a JSON array.

Each problem object:
- "title": Concise problem name (e.g., "Two Sum", "LRU Cache")
- "difficulty": "${params.difficulty}"
- "category": e.g., "Arrays", "Dynamic Programming", "Trees", "Graphs", "Strings"
- "description": Detailed problem statement (200-400 words) with clear context, constraints, and what to return
- "input_format": Exact input format description (e.g., "First line: integer N. Second line: N space-separated integers")
- "output_format": Exact output format description
- "constraints": Constraint details (e.g., "1 ≤ N ≤ 10^5, -10^9 ≤ arr[i] ≤ 10^9")
- "examples": array of 3 objects with {input, output, explanation} — explanation should walk through the logic
- "test_cases": array of 6-8 objects with {input, expected_output, is_hidden} — mix visible and hidden
- "starter_code": object with key "${params.language}" containing boilerplate code with I/O setup
- "solution": object with key "${params.language}" containing the complete optimal solution
- "time_limit_ms": integer (typically 1000-3000)
- "memory_limit_kb": integer (typically 262144)
- "hints": array of 2-3 progressive hints (don't give away the solution)

IMPORTANT: All input/output in test_cases must be strings. Multi-line input uses "\\n".

Return ONLY the JSON array.`;

  const raw = await callGemini(systemPrompt, userPrompt, {
    temperature: 0.5,
    maxOutputTokens: 16384,
  });
  const jsonStr = extractJSON(raw);
  try {
    const questions = JSON.parse(jsonStr) as CodingQuestion[];
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Invalid question format");
    }
    return questions;
  } catch (error) {
    console.error("Failed to parse coding questions:", jsonStr.substring(0, 500));
    console.error("Parse error:", error);
    throw new Error("AI failed to generate coding problems. Please try again.");
  }
}

// ─── Code Review via AI ───

export async function reviewCodeSolution(params: {
  code: string;
  language: string;
  problemTitle: string;
  problemDescription: string;
  testResults?: Array<{ passed: boolean; input: string; expected: string; actual: string }>;
}): Promise<CodeReviewResult> {
  const systemPrompt = `You are a principal engineer conducting code review for ${params.language}.

Scoring: 90-100=Optimal, 70-89=Good, 50-69=Suboptimal, 30-49=Buggy, 0-29=Incorrect

CRITICAL: Be concise. Max 2-3 sentences for feedback. Max 3 items per array.

Return ONLY valid JSON with NO markdown code blocks.`;

  const userPrompt = `Review this ${params.language} solution for "${params.problemTitle}":

Problem: ${params.problemDescription}

Code:
\`\`\`${params.language}
${params.code}
\`\`\`

${params.testResults ? `Test Results: ${JSON.stringify(params.testResults)}` : ""}

Return this exact JSON structure (no markdown):
{"score":0-100,"passed_tests":number,"total_tests":number,"time_complexity":"string","space_complexity":"string","is_optimal":boolean,"feedback":"2-3 sentences","bugs":["max 3"],"suggestions":["max 3"],"edge_cases":["max 3"]}`;

  const raw = await callGemini(systemPrompt, userPrompt, { 
    temperature: 0.2,
    maxOutputTokens: 4096 // Increased to ensure complete response
  });
  const jsonStr = extractJSON(raw);
  try {
    const result = JSON.parse(jsonStr) as CodeReviewResult;
    // Validate required fields
    if (typeof result.score !== 'number') {
      throw new Error('Invalid response format: missing score');
    }
    return result;
  } catch (error) {
    console.error("Failed to parse code review:", jsonStr.substring(0, 500));
    console.error("Parse error:", error);
    
    // Return a fallback response instead of throwing
    return {
      score: 50,
      passed_tests: params.testResults?.filter(t => t.passed).length || 0,
      total_tests: params.testResults?.length || 0,
      time_complexity: "Unable to analyze",
      space_complexity: "Unable to analyze",
      is_optimal: false,
      feedback: "The code review could not be completed due to a parsing error. Please try again.",
      bugs: ["Unable to analyze - please retry"],
      suggestions: ["Please submit the code again for review"],
      edge_cases: []
    };
  }
}
