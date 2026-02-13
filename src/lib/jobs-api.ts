// Multi-source job aggregator: RemoteOK, Remotive, Arbeitnow
// All frontend-only, no edge functions

export type JobSource = "remoteok" | "remotive" | "arbeitnow";
export type JobTypeFilter = "all" | "full_time" | "contract" | "part_time" | "internship";

export interface RemoteJob {
  id: string;
  title: string;
  company: string;
  company_logo: string;
  description: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  tags: string[];
  url: string;
  date: string;
  position: string;
  source: JobSource;
  job_type: string;
  category: string;
}

// ─── RemoteOK ───

interface RemoteOKItem {
  id?: string;
  epoch?: number;
  slug?: string;
  company?: string;
  company_logo?: string;
  position?: string;
  description?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  tags?: string[];
  url?: string;
  date?: string;
  logo?: string;
}

async function fetchRemoteOK(query?: string): Promise<RemoteJob[]> {
  try {
    const base = "https://remoteok.com/api";
    const url = query ? `${base}?tag=${encodeURIComponent(query)}` : base;
    const res = await fetch(url, {
      headers: { "User-Agent": "HireSense/1.0" },
    });
    if (!res.ok) return [];
    const data: RemoteOKItem[] = await res.json();
    return data
      .slice(1)
      .filter((j) => j.id && j.position && j.company)
      .map((j): RemoteJob => ({
        id: `rok-${j.id ?? j.slug ?? Math.random()}`,
        title: j.position ?? "",
        company: j.company ?? "",
        company_logo: j.company_logo || j.logo || "",
        description: stripHtml(j.description ?? ""),
        location: j.location || "Remote",
        salary_min: j.salary_min ?? null,
        salary_max: j.salary_max ?? null,
        tags: j.tags ?? [],
        url: j.url ?? `https://remoteok.com/remote-jobs/${j.slug ?? j.id}`,
        date: j.date ?? new Date().toISOString(),
        position: j.position ?? "",
        source: "remoteok",
        job_type: "full_time",
        category: inferCategory(j.tags ?? [], j.position ?? ""),
      }));
  } catch (err) {
    console.error("RemoteOK fetch error:", err);
    return [];
  }
}

// ─── Remotive ───

interface RemotiveJob {
  id?: number;
  title?: string;
  company_name?: string;
  company_logo_url?: string;
  category?: string;
  tags?: string[];
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  url?: string;
  description?: string;
}

async function fetchRemotive(query?: string): Promise<RemoteJob[]> {
  try {
    const base = "https://remotive.com/api/remote-jobs";
    const params = new URLSearchParams({ limit: "200" });
    if (query) params.set("search", query);
    const res = await fetch(`${base}?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    const jobs: RemotiveJob[] = data.jobs ?? [];
    return jobs
      .filter((j) => j.title && j.company_name)
      .map((j): RemoteJob => ({
        id: `rmv-${j.id ?? Math.random()}`,
        title: j.title ?? "",
        company: j.company_name ?? "",
        company_logo: j.company_logo_url || "",
        description: stripHtml(j.description ?? ""),
        location: j.candidate_required_location || "Remote",
        salary_min: parseSalaryMin(j.salary),
        salary_max: parseSalaryMax(j.salary),
        tags: j.tags ?? (j.category ? [j.category] : []),
        url: j.url ?? "",
        date: j.publication_date ?? new Date().toISOString(),
        position: j.title ?? "",
        source: "remotive",
        job_type: mapJobType(j.job_type),
        category: j.category || inferCategory(j.tags ?? [], j.title ?? ""),
      }));
  } catch (err) {
    console.error("Remotive fetch error:", err);
    return [];
  }
}

// ─── Arbeitnow ───

interface ArbeitnowJob {
  slug?: string;
  title?: string;
  company_name?: string;
  description?: string;
  remote?: boolean;
  location?: string;
  tags?: string[];
  url?: string;
  created_at?: number;
}

async function fetchArbeitnow(query?: string): Promise<RemoteJob[]> {
  try {
    const base = "https://www.arbeitnow.com/api/job-board-api";
    const res = await fetch(base);
    if (!res.ok) return [];
    const data = await res.json();
    let jobs: ArbeitnowJob[] = data.data ?? [];
    if (query) {
      const q = query.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title?.toLowerCase().includes(q) ||
          j.description?.toLowerCase().includes(q) ||
          j.tags?.some((t) => t.toLowerCase().includes(q)) ||
          j.company_name?.toLowerCase().includes(q)
      );
    }
    return jobs
      .filter((j) => j.title && j.company_name)
      .map((j): RemoteJob => ({
        id: `abn-${j.slug ?? Math.random()}`,
        title: j.title ?? "",
        company: j.company_name ?? "",
        company_logo: "",
        description: stripHtml(j.description ?? ""),
        location: j.remote ? "Remote" : j.location || "Unknown",
        salary_min: null,
        salary_max: null,
        tags: j.tags ?? [],
        url: j.url ?? `https://www.arbeitnow.com/view/${j.slug}`,
        date: j.created_at
          ? new Date(j.created_at * 1000).toISOString()
          : new Date().toISOString(),
        position: j.title ?? "",
        source: "arbeitnow",
        job_type: "full_time",
        category: inferCategory(j.tags ?? [], j.title ?? ""),
      }));
  } catch (err) {
    console.error("Arbeitnow fetch error:", err);
    return [];
  }
}

// ─── Aggregator ───

const fetchedIds = new Set<string>();

export function resetFetchedIds(): void {
  fetchedIds.clear();
}

export async function fetchAllJobs(
  sources: JobSource[] = ["remoteok", "remotive", "arbeitnow"],
  query?: string,
  append = false
): Promise<RemoteJob[]> {
  if (!append) fetchedIds.clear();

  const fetchers: Promise<RemoteJob[]>[] = [];
  if (sources.includes("remoteok")) fetchers.push(fetchRemoteOK(query));
  if (sources.includes("remotive")) fetchers.push(fetchRemotive(query));
  if (sources.includes("arbeitnow")) fetchers.push(fetchArbeitnow(query));

  const results = await Promise.allSettled(fetchers);
  const all: RemoteJob[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  const seen = new Set<string>();
  return all.filter((j) => {
    const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Deep Search (searches across all fields) ───

export function deepSearchFilter(jobs: RemoteJob[], query: string): RemoteJob[] {
  if (!query.trim()) return jobs;
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return jobs.filter((job) => {
    const searchable = [
      job.title,
      job.company,
      job.description,
      job.location,
      job.position,
      job.category,
      ...job.tags,
    ]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
}

// ─── Advanced Filtering ───

export interface JobFilters {
  jobType: JobTypeFilter;
  locationFilter: string;
  salaryMin: number | null;
  tags: string[];
}

export function applyFilters(jobs: RemoteJob[], filters: JobFilters): RemoteJob[] {
  let result = [...jobs];

  if (filters.jobType !== "all") {
    result = result.filter((j) => j.job_type === filters.jobType);
  }

  if (filters.locationFilter) {
    const loc = filters.locationFilter.toLowerCase();
    result = result.filter((j) => j.location.toLowerCase().includes(loc));
  }

  if (filters.salaryMin !== null && filters.salaryMin > 0) {
    result = result.filter(
      (j) => j.salary_max !== null && j.salary_max >= filters.salaryMin!
    );
  }

  if (filters.tags.length > 0) {
    const normalizedFilters = filters.tags.map((t) => t.toLowerCase());
    result = result.filter((j) =>
      normalizedFilters.some(
        (f) =>
          j.tags.some((t) => t.toLowerCase().includes(f)) ||
          j.title.toLowerCase().includes(f) ||
          j.category.toLowerCase().includes(f)
      )
    );
  }

  return result;
}

// ─── Scoring ───

export function matchScore(job: RemoteJob, userSkills: string[]): number {
  if (!userSkills.length) return 0;
  const normalizedSkills = userSkills.map((s) => s.toLowerCase().trim());
  const jobText =
    `${job.title} ${job.tags.join(" ")} ${job.description} ${job.category}`.toLowerCase();

  let score = 0;
  for (const skill of normalizedSkills) {
    if (jobText.includes(skill)) {
      if (job.title.toLowerCase().includes(skill)) score += 3;
      else if (job.tags.some((t) => t.toLowerCase().includes(skill))) score += 2;
      else score += 1;
    }
  }
  return score;
}

export function getMatchedJobs(
  jobs: RemoteJob[],
  userSkills: string[]
): RemoteJob[] {
  if (userSkills.length > 0) {
    return [...jobs].sort(
      (a, b) => matchScore(b, userSkills) - matchScore(a, userSkills)
    );
  }
  return jobs;
}

export function getPopularTags(jobs: RemoteJob[], limit = 15): string[] {
  const tagCount: Record<string, number> = {};
  for (const job of jobs) {
    for (const tag of job.tags) {
      const t = tag.toLowerCase();
      tagCount[t] = (tagCount[t] || 0) + 1;
    }
  }
  return Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

// ─── Helpers ───

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent?.trim() ?? "";
}

function parseSalaryMin(salary?: string): number | null {
  if (!salary) return null;
  const nums = salary.match(/[\d,]+/g);
  if (nums && nums.length > 0) return parseInt(nums[0].replace(/,/g, ""), 10);
  return null;
}

function parseSalaryMax(salary?: string): number | null {
  if (!salary) return null;
  const nums = salary.match(/[\d,]+/g);
  if (nums && nums.length > 1) return parseInt(nums[1].replace(/,/g, ""), 10);
  return null;
}

function mapJobType(type?: string): string {
  if (!type) return "full_time";
  const t = type.toLowerCase();
  if (t.includes("contract") || t.includes("freelance")) return "contract";
  if (t.includes("part")) return "part_time";
  if (t.includes("intern")) return "internship";
  return "full_time";
}

function inferCategory(tags: string[], title: string): string {
  const text = [...tags, title].join(" ").toLowerCase();
  if (text.match(/devops|sre|infrastructure|cloud|aws|azure|gcp/)) return "DevOps";
  if (text.match(/data\s*scien|machine\s*learn|ml|ai|deep\s*learn/)) return "Data Science";
  if (text.match(/design|ui\s*\/?\s*ux|figma|graphic/)) return "Design";
  if (text.match(/product\s*manag/)) return "Product";
  if (text.match(/market|seo|growth|content/)) return "Marketing";
  if (text.match(/front\s*end|react|vue|angular|css|html|javascript|typescript/)) return "Frontend";
  if (text.match(/back\s*end|node|python|java|ruby|golang|rust|php|django|flask/)) return "Backend";
  if (text.match(/full\s*stack/)) return "Full Stack";
  if (text.match(/mobile|ios|android|flutter|react\s*native/)) return "Mobile";
  if (text.match(/qa|test|quality/)) return "QA";
  if (text.match(/security|cyber/)) return "Security";
  if (text.match(/sales|account\s*exec/)) return "Sales";
  if (text.match(/support|customer\s*success/)) return "Support";
  return "Engineering";
}
