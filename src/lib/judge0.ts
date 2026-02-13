// Judge0 CE (Community Edition) integration for code execution
// Get your free API key at: https://judge0.com/ or use RapidAPI: https://rapidapi.com/judge0-official/api/judge0-ce

const JUDGE0_API_URL = "https://judge029.p.rapidapi.com";
const JUDGE0_API_KEY = import.meta.env.VITE_JUDGE0_API_KEY || "611a646ea9msh052affb0d888dd5p173bf2jsnbe9763eb46ac";

// Language IDs for Judge0
export const LANGUAGE_IDS: Record<string, number> = {
  "c": 50,       // C (GCC 9.2.0)
  "cpp": 54,     // C++ (GCC 9.2.0)
  "python": 71,  // Python (3.8.1)
  "javascript": 63, // JavaScript (Node.js 12.14.0)
  "java": 62,      // Java (OpenJDK 13.0.1)
};

export interface SubmissionResult {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
}

export interface TestCaseResult {
  input: string;
  expected_output: string;
  actual_output: string;
  passed: boolean;
  time_ms: string | null;
  memory_kb: number | null;
  error: string | null;
  is_hidden: boolean;
}

function getHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-rapidapi-key": JUDGE0_API_KEY,
    "x-rapidapi-host": "judge029.p.rapidapi.com",
    "useQueryString": "true",
  };
}

async function createSubmission(
  code: string,
  language: string,
  stdin: string
): Promise<string> {
  const langId = LANGUAGE_IDS[language];
  if (!langId) throw new Error(`Unsupported language: ${language}`);

  const res = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=true&wait=false`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      source_code: btoa(unescape(encodeURIComponent(code))),
      language_id: langId,
      stdin: btoa(unescape(encodeURIComponent(stdin))),
      cpu_time_limit: 5,
      memory_limit: 262144,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Judge0 submission failed: ${res.status} - ${text}`);
  }

  const data = await res.json();
  return data.token;
}

async function getSubmission(token: string): Promise<SubmissionResult> {
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, 1500));

    const res = await fetch(
      `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=true&fields=*`,
      { headers: getHeaders() }
    );

    if (!res.ok) throw new Error(`Judge0 polling failed: ${res.status}`);

    const data = await res.json();

    // Status 1 = In Queue, 2 = Processing
    if (data.status?.id <= 2) {
      attempts++;
      continue;
    }

    return {
      stdout: data.stdout ? decodeURIComponent(escape(atob(data.stdout))).trim() : null,
      stderr: data.stderr ? decodeURIComponent(escape(atob(data.stderr))).trim() : null,
      compile_output: data.compile_output
        ? decodeURIComponent(escape(atob(data.compile_output))).trim()
        : null,
      status: data.status,
      time: data.time,
      memory: data.memory,
    };
  }

  throw new Error("Judge0 timed out waiting for result.");
}

export async function runTestCases(
  code: string,
  language: string,
  testCases: Array<{ input: string; expected_output: string; is_hidden: boolean }>
): Promise<TestCaseResult[]> {
  const results: TestCaseResult[] = [];

  // Run test cases sequentially to avoid rate limits
  for (const tc of testCases) {
    try {
      const token = await createSubmission(code, language, tc.input);
      const submission = await getSubmission(token);

      const actual = submission.stdout ?? "";
      const expected = tc.expected_output.trim();
      const passed =
        actual.replace(/\s+$/gm, "") === expected.replace(/\s+$/gm, "");

      results.push({
        input: tc.input,
        expected_output: expected,
        actual_output: actual,
        passed,
        time_ms: submission.time,
        memory_kb: submission.memory,
        error:
          submission.compile_output ||
          submission.stderr ||
          (submission.status.id > 3 ? submission.status.description : null),
        is_hidden: tc.is_hidden,
      });
    } catch (err: any) {
      results.push({
        input: tc.input,
        expected_output: tc.expected_output,
        actual_output: "",
        passed: false,
        time_ms: null,
        memory_kb: null,
        error: err.message,
        is_hidden: tc.is_hidden,
      });
    }
  }

  return results;
}
