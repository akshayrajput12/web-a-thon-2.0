// Using v1beta for advanced features like system_instruction
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";

function getApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error("VITE_GEMINI_API_KEY is not configured. Add it as a secret.");
  return key;
}

function getModel(): string {
  // Use gemini-1.5-flash-latest for v1beta endpoint
  return import.meta.env.VITE_GEMINI_MODEL || "gemini-1.5-flash-latest";
}

interface GeminiResponse {
  candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
}

export function extractJSON(text: string): string {
  // First, try to extract from markdown code blocks
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    const extracted = fenced[1].trim();
    // Verify it's valid JSON structure
    if (extracted.startsWith('{') || extracted.startsWith('[')) {
      return extracted;
    }
  }

  // Determine if we should look for an array or object first
  const firstOpenBrace = text.indexOf('{');
  const firstOpenBracket = text.indexOf('[');

  // If neither found, just return trim
  if (firstOpenBrace === -1 && firstOpenBracket === -1) {
    return text.trim();
  }

  // If array bracket appears before object brace (or brace implies object inside array), extract array
  // logic: if [ exists, and ({ doesn't exist OR [ is before { )
  if (firstOpenBracket !== -1 && (firstOpenBrace === -1 || firstOpenBracket < firstOpenBrace)) {
    const jsonArrayMatch = text.match(/\[[\s\S]*\]/);
    if (jsonArrayMatch) {
      return jsonArrayMatch[0].trim();
    }
  }

  // Fallback to object extraction
  const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    return jsonObjectMatch[0].trim();
  }

  return text.trim();
}

export function safeParseJSON<T>(jsonStr: string, fallback: T): T {
  try {
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    console.error("JSON parse error:", error);
    console.error("Attempted to parse:", jsonStr.substring(0, 500));
    return fallback;
  }
}

interface CallGeminiOptions {
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
}

export async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  options?: CallGeminiOptions
): Promise<string> {
  const apiKey = getApiKey();
  const modelName = options?.model || getModel();

  // The API expects the path: /v1beta/models/{model}:generateContent
  const url = `${GEMINI_API_URL}/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // Combine system and user prompts in contents array for v1beta
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
        },
      ],
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxOutputTokens ?? 8192,
        topP: 0.95,
        topK: 40,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini API error [${response.status}]:`, errorText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data: GeminiResponse = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

// ─── Resume Analysis ───

export async function analyzeResume(resumeText: string): Promise<string> {
  const systemPrompt = `You are a world-class ATS (Applicant Tracking System) expert. 
  Your analysis must be precise and data-driven. 
  You MUST return ONLY valid JSON — no markdown, no commentary.`;

  const userPrompt = `Perform a comprehensive ATS analysis of this resume:
${resumeText}

Return JSON with: ats_score (int), suggestions (array), skill_gaps (array), keywords_found (array), keywords_missing (array), format_issues (array), strengths (array), overall_assessment (string).`;

  return callGemini(systemPrompt, userPrompt, { temperature: 0.3 });
}

// ─── Interview Question Generation ───

export async function generateInterviewQuestions(
  type: string,
  difficulty: string,
  targetRole: string,
  count = 5
): Promise<string> {
  const systemPrompt = `You are a senior technical interviewer. Create interview questions that test real-world problem solving.
  You MUST return ONLY a valid JSON array.`;

  const userPrompt = `Generate exactly ${count} ${difficulty}-level ${type} interview questions for a ${targetRole} position.
  Include: question_text, category, difficulty, expected_answer, evaluation_criteria (array).`;

  return callGemini(systemPrompt, userPrompt, { temperature: 0.6 });
}

// ─── Answer Evaluation ───

export async function evaluateAnswer(
  question: string,
  answer: string
): Promise<string> {
  const systemPrompt = `You are a calibrated interview evaluator. Return ONLY valid JSON.`;

  const userPrompt = `Evaluate this interview response:
QUESTION: ${question}
CANDIDATE'S ANSWER: ${answer}

Return JSON with: score (int), feedback, strengths (array), improvements (array), missing_points (array), follow_up_question.`;

  return callGemini(systemPrompt, userPrompt, { temperature: 0.3 });
}

// ─── Code Review ───

export async function reviewCode(
  code: string,
  language: string,
  problemTitle: string
): Promise<string> {
  const systemPrompt = `You are a principal software engineer. Review code for production-readiness. Return ONLY valid JSON.`;

  const userPrompt = `Review this ${language} solution for "${problemTitle}":
\`\`\`${language}
${code}
\`\`\`

Return JSON with: score (int), time_complexity, space_complexity, is_optimal (bool), feedback, bugs (array), suggestions (array), alternative_approach, edge_cases (array).`;

  return callGemini(systemPrompt, userPrompt, { temperature: 0.2 });
}