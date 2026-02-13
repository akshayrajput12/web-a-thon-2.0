import { callGemini, extractJSON } from "@/lib/ai";

// ─── Types ───

export interface GeneratedQuestion {
  question_text: string;
  category: string;
  difficulty: string;
  expected_answer: string;
}

export interface AnswerEvaluation {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  proper_answer: string;
}

export interface InterviewReport {
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

// ─── Question Generation ───

export async function generateInterviewQuestionsFromContext(params: {
  companyName: string;
  companyDescription: string;
  jobDescription: string;
  requirements: string;
  targetRole: string;
  difficulty: string;
  experienceRequired: string;
  salaryRange: string;
  resumeText: string;
  interviewType: string;
  questionCount?: number;
}): Promise<GeneratedQuestion[]> {
  const count = params.questionCount || 8;

  const systemPrompt = `You are an elite technical interviewer at ${params.companyName} with deep expertise in ${params.interviewType} interviews. You have personally conducted 1000+ interviews for ${params.targetRole} positions.

Your question generation philosophy:
1. COMPANY-SPECIFIC: Reference the company's domain, tech stack, and challenges
2. RESUME-TARGETED: Design questions that probe the candidate's claimed expertise and find gaps
3. DIFFICULTY-CALIBRATED: ${params.difficulty === "hard" ? "Push boundaries with complex, multi-part scenarios" : params.difficulty === "easy" ? "Test fundamentals with clear, focused questions" : "Balance depth with breadth, test practical application"}
4. REAL-WORLD: Frame questions around actual workplace scenarios, not academic exercises
5. PROGRESSIVE: Questions should build in complexity within each category

Question distribution for ${params.interviewType}:
- behavioral: 40% STAR-method scenarios, 30% situational, 30% competency-based
- technical: 40% coding/algorithms, 30% system concepts, 30% domain-specific
- system_design: 40% architecture, 30% scalability, 30% trade-off analysis
- mixed: even distribution across all types

Expected answers must be comprehensive enough to serve as study material.

You MUST return the JSON array wrapped in a markdown code block (result starting with \`\`\`json).`;

  const userPrompt = `INTERVIEW CONTEXT:
Company: ${params.companyName}
About: ${params.companyDescription || "Not specified"}
Job Description: ${params.jobDescription || "Not specified"}
Requirements: ${params.requirements || "Not specified"}
Role: ${params.targetRole}
Experience: ${params.experienceRequired || "Not specified"}
Salary: ${params.salaryRange || "Not specified"}
Type: ${params.interviewType}
Difficulty: ${params.difficulty}

CANDIDATE'S RESUME:
${params.resumeText || "No resume provided — generate general questions for the role"}

TASK: Generate exactly ${count} interview questions as a JSON array.

Each element must have:
- "question_text": Detailed question with context (if behavioral, set a specific scenario; if technical, state constraints clearly)
- "category": "Technical" | "Behavioral" | "System Design" | "Problem Solving" | "Domain Knowledge" | "Leadership" | "Communication"
- "difficulty": "${params.difficulty}"
- "expected_answer": Comprehensive ideal answer (250-400 words) that would impress any interviewer — include specific examples, frameworks, and technical depth

Return the JSON array wrapped in a markdown code block.`;

  const raw = await callGemini(systemPrompt, userPrompt, {
    temperature: 0.6,
    maxOutputTokens: 8192
  });
  const jsonStr = extractJSON(raw);
  try {
    const questions = JSON.parse(jsonStr) as GeneratedQuestion[];
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Invalid question format");
    }
    return questions;
  } catch (error) {
    console.error("Failed to parse questions JSON:", jsonStr.substring(0, 500));
    console.error("Parse error:", error);
    throw new Error("Failed to generate questions. The AI returned an invalid format. Please try again.");
  }
}

// ─── Answer Evaluation ───

export async function evaluateInterviewAnswer(params: {
  question: string;
  answer: string;
  expectedAnswer: string;
  resumeText: string;
  companyName: string;
  targetRole: string;
  difficulty: string;
}): Promise<AnswerEvaluation> {
  const systemPrompt = `You are a senior interview evaluator at ${params.companyName} hiring for ${params.targetRole}. Your evaluations are known for being:

1. CALIBRATED: Consistent scoring — same quality always gets same range
2. EVIDENCE-BASED: Reference specific parts of the candidate's answer
3. CONSTRUCTIVE: Every criticism comes with a concrete improvement strategy
4. HOLISTIC: Consider communication clarity, technical accuracy, and depth

Scoring rubric (${params.difficulty} difficulty):
- 85-100: Exceptional — exceeds expectations, demonstrates mastery, provides unique insights
- 70-84: Strong — covers all key points, good structure, minor gaps only
- 55-69: Adequate — correct fundamentals but lacks depth or misses important aspects
- 35-54: Below average — significant knowledge gaps or poor communication
- 0-34: Poor — fundamentally incorrect, irrelevant, or insufficient

The "proper_answer" field should be a model answer that the candidate can study.

You MUST return the JSON object wrapped in a markdown code block (result starting with \`\`\`json).`;

  const userPrompt = `EVALUATION REQUEST:

Question: ${params.question}

Expected/Ideal Answer: ${params.expectedAnswer}

Candidate's Actual Answer: ${params.answer}

Candidate Resume Context: ${params.resumeText || "Not provided"}

Evaluate thoroughly and return JSON:
- "score": integer 0-100 (calibrated to ${params.difficulty} difficulty)
- "feedback": 3-4 sentence detailed assessment with specific references to the answer
- "strengths": array of 2-4 specific things done well
- "improvements": array of 2-4 specific, actionable improvement areas
- "proper_answer": the ideal answer for this question (200-350 words), written as if the candidate is giving a perfect response

Return the JSON object wrapped in a markdown code block.`;

  const raw = await callGemini(systemPrompt, userPrompt, {
    temperature: 0.3,
    maxOutputTokens: 4096
  });
  const jsonStr = extractJSON(raw);
  try {
    const evaluation = JSON.parse(jsonStr) as AnswerEvaluation;
    if (typeof evaluation.score !== "number") throw new Error("Invalid evaluation format");
    return evaluation;
  } catch (error) {
    console.error("Failed to parse evaluation JSON:", jsonStr.substring(0, 500));
    console.error("Parse error:", error);
    throw new Error("Failed to evaluate answer. Please try again.");
  }
}

// ─── Interview Report ───

export async function generateInterviewReport(params: {
  companyName: string;
  targetRole: string;
  difficulty: string;
  questions: Array<{ question: string; category: string; answer: string; score: number; feedback: string }>;
  resumeText: string;
}): Promise<InterviewReport> {
  const systemPrompt = `You are a senior HR analytics expert and interview assessment specialist. You produce comprehensive, data-driven interview reports that are used for:

1. Candidate self-improvement and preparation strategy
2. Identifying specific skill gaps and knowledge areas to study
3. Realistic selection probability estimation based on industry benchmarks
4. Actionable resume improvement tied to interview performance gaps

Your reports are known for brutal honesty tempered with encouragement.

Selection probability calibration for ${params.targetRole} at ${params.companyName}:
- Score 85+: Very High (70-90% chance) — top-tier candidates
- Score 70-84: High (50-70%) — strong candidates with minor gaps
- Score 55-69: Moderate (25-50%) — competitive but needs improvement
- Score 40-54: Low (10-25%) — significant preparation needed
- Score <40: Very Low (<10%) — fundamental skill gaps to address

You MUST return the JSON object wrapped in a markdown code block (result starting with \`\`\`json).`;

  const questionsDetail = params.questions
    .map(
      (q, i) =>
        `Q${i + 1} [${q.category}]: ${q.question}\nAnswer: ${q.answer}\nScore: ${q.score}/100\nFeedback: ${q.feedback}`
    )
    .join("\n\n");

  const userPrompt = `INTERVIEW PERFORMANCE REPORT REQUEST:

Company: ${params.companyName}
Role: ${params.targetRole}
Difficulty: ${params.difficulty}
Questions Attempted: ${params.questions.length}

DETAILED PERFORMANCE:
${questionsDetail}

CANDIDATE RESUME: ${params.resumeText || "Not provided"}

Generate a comprehensive report as JSON:
- "overall_score": weighted average 0-100 (weight harder categories more)
- "selection_chance": "Very High" | "High" | "Moderate" | "Low" | "Very Low"
- "selection_percentage": integer 0-100 (realistic, calibrated to the rubric)
- "summary": 4-5 sentence executive summary covering key observations
- "category_scores": array of {category, score (0-100), feedback (2-3 sentences)}
- "strengths": array of 4-6 demonstrated strengths with specific evidence
- "improvements": array of 4-6 prioritized improvement areas with study suggestions
- "resume_tips": array of 3-5 specific resume changes based on interview gaps
- "recommendation": 3-4 sentence actionable recommendation for the candidate's next steps

Return the JSON object wrapped in a markdown code block.`;

  const raw = await callGemini(systemPrompt, userPrompt, {
    temperature: 0.4,
    maxOutputTokens: 8192
  });
  const jsonStr = extractJSON(raw);
  try {
    const report = JSON.parse(jsonStr) as InterviewReport;
    if (typeof report.overall_score !== "number") throw new Error("Invalid report format");
    return report;
  } catch (error) {
    console.error("Failed to parse report JSON:", jsonStr.substring(0, 500));
    console.error("Parse error:", error);
    throw new Error("Failed to generate report. Please try again.");
  }
}
