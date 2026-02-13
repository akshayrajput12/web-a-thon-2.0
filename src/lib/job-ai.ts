// AI-powered resume-to-job matching using Gemini

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";
const CACHE_KEY = "hiresense_job_criteria";

function getApiKey(): string {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) throw new Error("VITE_GEMINI_API_KEY is not configured.");
    return key;
}

function getModel(): string {
    return import.meta.env.VITE_GEMINI_MODEL || "gemini-1.5-flash-latest";
}

interface GeminiResponse {
    candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
}

function extractJSON(text: string): string {
    // First, try to extract from markdown code blocks
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
        const extracted = fenced[1].trim();
        if (extracted.startsWith('{') || extracted.startsWith('[')) {
            return extracted;
        }
    }

    // Determine if we should look for an array or object first
    const firstOpenBrace = text.indexOf('{');
    const firstOpenBracket = text.indexOf('[');

    if (firstOpenBrace === -1 && firstOpenBracket === -1) {
        return text.trim();
    }

    // If array bracket appears before object brace, extract array
    if (firstOpenBracket !== -1 && (firstOpenBrace === -1 || firstOpenBracket < firstOpenBrace)) {
        const jsonArrayMatch = text.match(/\[[\s\S]*\]/);
        if (jsonArrayMatch) return jsonArrayMatch[0].trim();
    }

    // Fallback to object extraction
    const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) return jsonObjectMatch[0].trim();

    return text.trim();
}

export interface JobSearchCriteria {
    keywords: string[];
    roles: string[];
    skills: string[];
    categories: string[];
    experience_level: string;
    preferred_locations: string[];
    salary_expectation: string;
    industry_preferences: string[];
}

// Standardized list for better matching
const STANDARD_CATEGORIES = [
    "Frontend Developer", "Backend Developer", "Full Stack Developer", "Mobile Developer",
    "DevOps Engineer", "Data Scientist", "Machine Learning Engineer", "Product Manager",
    "UI/UX Designer", "QA Engineer", "Cloud Architect", "Cybersecurity Analyst",
    "System Administrator", "Project Manager", "Business Analyst", "Marketing Specialist",
    "Sales Representative", "HR Specialist", "Customer Support", "Finance Analyst"
];

// Helper to sanitize keywords based on standard roles/categories
function sanitizeKeywords(keywords: string[], knownCategories: string[]): string[] {
    const refined = new Set<string>();

    // Common noisy words in job descriptions to filter out
    const stopWords = new Set([
        'and', 'the', 'for', 'with', 'knowledge', 'experience', 'working', 'skills',
        'strong', 'good', 'ability', 'proficient', 'understanding', 'familiarity',
        'preferred', 'plus', 'years', 'environment', 'team', 'work', 'communication'
    ]);

    keywords.forEach(k => {
        const lower = k.toLowerCase().trim();

        // Filter out short words and stop words
        if (lower.length <= 2 || stopWords.has(lower)) {
            return;
        }

        // Add valid keywords
        refined.add(k.trim());
    });

    // If we have very few keywords, we might want to inject category-specific defaults
    // This is a simple heuristic enhancement
    if (refined.size < 5) {
        knownCategories.forEach(cat => {
            if (cat.includes("Frontend")) { refined.add("React"); refined.add("JavaScript"); refined.add("CSS"); }
            if (cat.includes("Backend")) { refined.add("Node.js"); refined.add("API"); refined.add("Database"); }
            if (cat.includes("Data")) { refined.add("Python"); refined.add("SQL"); refined.add("Analytics"); }
        });
    }

    return Array.from(refined).slice(0, 20); // Limit to top 20
}

function mapToStandardCategories(rawCategories: string[]): string[] {
    // Simple fuzzy match or just return raw if close
    // For now, we ask the AI to map to these, but we can also filter valid ones
    return rawCategories.map(cat => {
        const match = STANDARD_CATEGORIES.find(sc => sc.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(sc.toLowerCase()));
        return match || cat; // Fallback to raw if no match
    });
}

export async function analyzeResumeForJobs(
    resumeText: string,
    userSkills: string[],
    targetRole: string | null
): Promise<JobSearchCriteria> {
    // Check localStorage cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        try {
            return JSON.parse(cached) as JobSearchCriteria;
        } catch {
            localStorage.removeItem(CACHE_KEY);
        }
    }

    const apiKey = getApiKey();
    const model = getModel();
    const url = `${GEMINI_API_URL}/models/${model}:generateContent?key=${apiKey}`;

    const systemPrompt = `You are an expert career advisor and ATS (Applicant Tracking System) specialist. Your task is to analyze a candidate's resume and profile data to extract precise job search criteria.
    
    You must deeply understand:
    1. The candidate's core technical and soft skills
    2. Their experience level and career trajectory
    3. The exact job titles they are qualified for
    4. Industries and domains they fit into
    5. Their likely market value
    
    CRITICAL: 
    - Map the candidate to one or more of these STANDARD JOB CATEGORIES: ${STANDARD_CATEGORIES.join(", ")}.
    - Extract standardized high-value ATS Keywords that relate to these categories (e.g., if "Frontend Developer", include "React", "TypeScript", "CSS", "Redux").
    
    You MUST return ONLY valid JSON wrapped in a markdown code block (result starting with \`\`\`json).`;

    const userPrompt = `Analyze this candidate profile and generate optimal job search criteria:

    Resume Text:
    ${resumeText || "No resume uploaded"}
    
    Profile Skills: ${userSkills.length > 0 ? userSkills.join(", ") : "Not specified"}
    Target Role: ${targetRole || "Not specified"}
    
    Return JSON with these fields:
    - "keywords": array of 15-20 high-impact ATS keywords (technical, tools, soft skills) that will match refined job descriptions.
    - "roles": array of 5-8 precise job titles the candidate is qualified for.
    - "skills": array of all identifiable technical and soft skills found in the text.
    - "categories": array of 3-5 standardized job categories from the provided list.
    - "experience_level": one of "Entry Level", "Junior", "Mid Level", "Senior", "Lead", "Principal", "Executive".
    - "preferred_locations": array of locations mentioned or ["Remote"] if none.
    - "salary_expectation": estimated salary range string (e.g., "$80,000 - $120,000").
    - "industry_preferences": array of 3-5 industries where their skills are most valued.
    
    Return the JSON object wrapped in a markdown code block.`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
                ],
                generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Gemini API error [${response.status}]:`, errorText);
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data: GeminiResponse = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const jsonStr = extractJSON(text);

        try {
            const rawCriteria = JSON.parse(jsonStr) as JobSearchCriteria;

            // Post-process / Sanitize
            const criteria: JobSearchCriteria = {
                ...rawCriteria,
                keywords: sanitizeKeywords(rawCriteria.keywords, rawCriteria.categories),
                categories: mapToStandardCategories(rawCriteria.categories)
            };

            // Cache in localStorage
            localStorage.setItem(CACHE_KEY, JSON.stringify(criteria));
            return criteria;
        } catch (parseError) {
            console.error("Failed to parse job criteria JSON:", jsonStr.substring(0, 500));
            console.error("Parse error:", parseError);
            throw parseError;
        }
    } catch (err) {
        console.error("Gemini job analysis failed:", err);
        // Return fallback criteria from profile data
        return {
            keywords: userSkills.length > 0 ? userSkills : ["developer"],
            roles: targetRole ? [targetRole] : [],
            skills: userSkills,
            categories: [],
            experience_level: "mid",
            preferred_locations: ["Remote"],
            salary_expectation: "",
            industry_preferences: [],
        };
    }
}

export function clearJobCriteriaCache(): void {
    localStorage.removeItem(CACHE_KEY);
}

export function getCachedCriteria(): JobSearchCriteria | null {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    try {
        return JSON.parse(cached) as JobSearchCriteria;
    } catch {
        return null;
    }
}