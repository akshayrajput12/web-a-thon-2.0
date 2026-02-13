import { useEffect, useState, useCallback, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAllJobs,
  deepSearchFilter,
  applyFilters,
  getMatchedJobs,
  getPopularTags,
  matchScore,
  type RemoteJob,
  type JobSource,
  type JobTypeFilter,
  type JobFilters,
} from "@/lib/jobs-api";
import {
  analyzeResumeForJobs,
  clearJobCriteriaCache,
  getCachedCriteria,
  type JobSearchCriteria,
} from "@/lib/job-ai";
import {
  Briefcase, MapPin, DollarSign, Search, Loader2,
  ExternalLink, Sparkles, Globe, Clock, X, Calendar,
  Filter, RefreshCw, Brain,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 20;

const SOURCE_OPTIONS: { value: JobSource; label: string }[] = [
  { value: "remoteok", label: "RemoteOK" },
  { value: "remotive", label: "Remotive" },
  { value: "arbeitnow", label: "Arbeitnow" },
];

const JOB_TYPE_OPTIONS: { value: JobTypeFilter; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "full_time", label: "Full Time" },
  { value: "contract", label: "Contract" },
  { value: "part_time", label: "Part Time" },
  { value: "internship", label: "Internship" },
];

const Jobs = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allJobs, setAllJobs] = useState<RemoteJob[]>([]);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeSources, setActiveSources] = useState<JobSource[]>([
    "remoteok", "remotive", "arbeitnow",
  ]);
  const [jobType, setJobType] = useState<JobTypeFilter>("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [aiCriteria, setAiCriteria] = useState<JobSearchCriteria | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Load AI criteria from cache on mount
  useEffect(() => {
    const cached = getCachedCriteria();
    if (cached) setAiCriteria(cached);
  }, []);

  // Fetch user skills + resume, run AI analysis
  useEffect(() => {
    if (!user) return;
    const fetchAndAnalyze = async () => {
      const [profileRes, resumeRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("skills, target_role")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("resumes")
          .select("parsed_data")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      const skills: string[] = [];
      const targetRole = profileRes.data?.target_role || null;
      if (profileRes.data?.skills)
        skills.push(...(profileRes.data.skills as string[]));
      if (targetRole) skills.push(targetRole);

      const resumeData = resumeRes.data?.[0]?.parsed_data as Record<string, unknown> | null;
      let resumeText = "";
      if (resumeData) {
        if (resumeData.skills && Array.isArray(resumeData.skills))
          skills.push(...(resumeData.skills as string[]));
        resumeText = JSON.stringify(resumeData);
      }

      const uniqueSkills = [...new Set(skills.filter(Boolean))];
      setUserSkills(uniqueSkills);

      // Run AI analysis if no cache and we have data
      if (!getCachedCriteria() && (uniqueSkills.length > 0 || resumeText)) {
        setAiLoading(true);
        try {
          const criteria = await analyzeResumeForJobs(resumeText, uniqueSkills, targetRole);
          setAiCriteria(criteria);
          toast({
            title: "AI Analysis Complete",
            description: `Found ${criteria.keywords.length} keywords and ${criteria.roles.length} matching roles`,
          });
        } catch {
          console.error("AI analysis failed, using skills directly");
        } finally {
          setAiLoading(false);
        }
      }
    };
    fetchAndAnalyze();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build effective search keywords from AI criteria
  const getAISearchQuery = useCallback((): string | undefined => {
    if (!aiCriteria) return undefined;
    // Use top 3 keywords for API query
    return aiCriteria.keywords.slice(0, 3).join(" ");
  }, [aiCriteria]);

  // Fetch jobs
  const loadJobs = useCallback(
    async (query?: string) => {
      setLoading(true);
      const searchQuery = query || getAISearchQuery();
      const jobs = await fetchAllJobs(activeSources, searchQuery);
      setAllJobs(jobs);
      setPopularTags(getPopularTags(jobs));
      setVisibleCount(PAGE_SIZE);
      setLoading(false);
    },
    [activeSources, getAISearchQuery]
  );

  // Initial load & reload on source change
  useEffect(() => {
    loadJobs(search || undefined);
  }, [activeSources, aiCriteria]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      loadJobs(search || undefined);
    }, 500);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll — instant local pagination, no loading delay
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && !loading) {
        setVisibleCount((prev) => prev + PAGE_SIZE);
      }
    },
    [loading]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: "200px",
    });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTags, jobType, locationFilter]);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSourceChange = (val: string[]) => {
    if (val.length === 0) return;
    setActiveSources(val as JobSource[]);
  };

  const handleRefreshAI = async () => {
    clearJobCriteriaCache();
    setAiCriteria(null);
    setAiLoading(true);
    // Re-trigger the useEffect by forcing a re-render
    const profileRes = await supabase
      .from("profiles")
      .select("skills, target_role")
      .eq("user_id", user!.id)
      .single();
    const resumeRes = await supabase
      .from("resumes")
      .select("parsed_data")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const skills: string[] = [];
    if (profileRes.data?.skills) skills.push(...(profileRes.data.skills as string[]));
    const resumeData = resumeRes.data?.[0]?.parsed_data as Record<string, unknown> | null;
    const resumeText = resumeData ? JSON.stringify(resumeData) : "";

    try {
      const criteria = await analyzeResumeForJobs(
        resumeText,
        [...new Set(skills.filter(Boolean))],
        profileRes.data?.target_role || null
      );
      setAiCriteria(criteria);
      toast({ title: "AI Re-analyzed", description: "Job criteria refreshed from your resume." });
    } catch {
      toast({ title: "AI Failed", description: "Showing all jobs instead.", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  // Build the combined skill set from user + AI
  const effectiveSkills = [
    ...userSkills,
    ...(aiCriteria?.keywords ?? []),
    ...(aiCriteria?.skills ?? []),
  ];
  const uniqueEffectiveSkills = [...new Set(effectiveSkills)];

  // Apply pipeline: deep search → filters → skill ranking
  const filters: JobFilters = { jobType, locationFilter, salaryMin: null, tags: activeTags };
  const searched = deepSearchFilter(allJobs, search);
  const filtered = applyFilters(searched, filters);
  const matched = getMatchedJobs(filtered, uniqueEffectiveSkills);
  const visible = matched.slice(0, visibleCount);
  const hasMore = visibleCount < matched.length;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Job Feed</h1>
            <p className="text-sm text-muted-foreground">
              {aiCriteria
                ? `AI-matched for: ${aiCriteria.roles.slice(0, 2).join(", ")}`
                : userSkills.length > 0
                  ? "Ranked by your skills & resume"
                  : "Explore remote opportunities worldwide"}
            </p>
          </div>
          {user && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAI}
              disabled={aiLoading}
              className="gap-1.5"
            >
              {aiLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Brain className="h-3.5 w-3.5" />
              )}
              {aiLoading ? "Analyzing…" : "Re-analyze"}
            </Button>
          )}
        </div>

        {/* AI Criteria Badge */}
        {aiCriteria && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">AI-Matched Criteria</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {aiCriteria.keywords.slice(0, 8).map((kw) => (
                  <Badge key={kw} variant="secondary" className="text-xs capitalize">{kw}</Badge>
                ))}
                {aiCriteria.keywords.length > 8 && (
                  <Badge variant="outline" className="text-xs">+{aiCriteria.keywords.length - 8}</Badge>
                )}
              </div>
              {aiCriteria.experience_level && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Level: {aiCriteria.experience_level} · {aiCriteria.salary_expectation || "Salary N/A"}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Source filters */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sources</span>
          <ToggleGroup
            type="multiple"
            value={activeSources}
            onValueChange={handleSourceChange}
            className="justify-start flex-wrap"
          >
            {SOURCE_OPTIONS.map((s) => (
              <ToggleGroupItem key={s.value} value={s.value} className="gap-1.5 text-xs px-3 py-1.5">
                <Globe className="h-3 w-3" />
                {s.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Deep search: roles, skills, companies, categories…"
            className="pl-10 pr-20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {loading && (
            <Loader2 className="absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
          )}
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Job Type</label>
                  <Select value={jobType} onValueChange={(v) => setJobType(v as JobTypeFilter)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Location</label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="e.g. Remote, US, EU"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setJobType("all");
                  setLocationFilter("");
                  setActiveTags([]);
                }}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reset Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tag Filters */}
        {popularTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <Badge
                key={tag}
                variant={activeTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer capitalize transition-colors"
                onClick={() => toggleTag(tag)}
              >
                {tag}
                {activeTags.includes(tag) && <X className="ml-1 h-3 w-3" />}
              </Badge>
            ))}
          </div>
        )}

        {activeTags.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {activeTags.length} filter{activeTags.length > 1 ? "s" : ""}
            </span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setActiveTags([])}>
              Clear all
            </Button>
          </div>
        )}

        {/* Job count */}
        {!loading && (
          <p className="text-xs text-muted-foreground">
            {matched.length} jobs from {activeSources.length} source{activeSources.length > 1 ? "s" : ""}
            {jobType !== "all" ? ` · ${jobType.replace("_", " ")}` : ""}
          </p>
        )}

        {/* Feed */}
        {loading && allJobs.length === 0 ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <FeedSkeleton key={i} />
            ))}
          </div>
        ) : matched.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center gap-4 py-16">
              <Briefcase className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No jobs match your criteria.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setActiveTags([]);
                  setJobType("all");
                  setLocationFilter("");
                }}
              >
                Clear filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {visible.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                score={uniqueEffectiveSkills.length > 0 ? matchScore(job, uniqueEffectiveSkills) : 0}
                hasSkills={uniqueEffectiveSkills.length > 0}
              />
            ))}

            {hasMore && (
              <div ref={loaderRef} className="flex justify-center py-4">
                <p className="text-xs text-muted-foreground">Scroll for more…</p>
              </div>
            )}

            {!hasMore && visible.length > 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                You've seen all {matched.length} jobs · Try different filters for more
              </p>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

/* ─── Job Card ─── */

function JobCard({ job, score, hasSkills }: { job: RemoteJob; score: number; hasSkills: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(job.date), { addSuffix: true });
    } catch {
      return "";
    }
  })();

  const postedDate = (() => {
    try {
      return format(new Date(job.date), "MMM d, yyyy");
    } catch {
      return "";
    }
  })();

  const sourceLabel =
    job.source === "remoteok" ? "RemoteOK" : job.source === "remotive" ? "Remotive" : "Arbeitnow";

  return (
    <Card className="border-border/50 transition-all hover:border-primary/30 hover:shadow-sm">
      <CardContent className="p-5">
        <div className="flex gap-3">
          {job.company_logo ? (
            <img
              src={job.company_logo}
              alt={job.company}
              className="h-12 w-12 rounded-lg border border-border/50 bg-muted object-contain p-1"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border/50 bg-muted">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold leading-tight text-foreground">{job.title}</h3>
            <p className="text-sm font-medium text-primary">{job.company}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {hasSkills && score > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Sparkles className="h-3 w-3" />
                {score >= 5 ? "Strong" : score >= 2 ? "Good" : "Partial"}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px]">{sourceLabel}</Badge>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {job.location || "Remote"}
          </span>
          {job.salary_min && job.salary_max && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              ${(job.salary_min / 1000).toFixed(0)}k – ${(job.salary_max / 1000).toFixed(0)}k
            </span>
          )}
          {timeAgo && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {timeAgo}
            </span>
          )}
          {postedDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {postedDate}
            </span>
          )}
          {job.category && (
            <Badge variant="outline" className="text-[10px]">{job.category}</Badge>
          )}
        </div>

        {job.description && (
          <p className={`mt-3 text-sm text-muted-foreground ${expanded ? "" : "line-clamp-3"}`}>
            {job.description}
          </p>
        )}
        {job.description && job.description.length > 200 && (
          <button
            className="mt-1 text-xs font-medium text-primary hover:underline"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}

        {job.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.tags.slice(0, 6).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs capitalize">{tag}</Badge>
            ))}
            {job.tags.length > 6 && (
              <Badge variant="outline" className="text-xs">+{job.tags.length - 6}</Badge>
            )}
          </div>
        )}

        <div className="mt-4">
          <Button size="sm" asChild>
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Apply
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Skeleton ─── */

function FeedSkeleton() {
  return (
    <Card className="border-border/50">
      <CardContent className="space-y-3 p-5">
        <div className="flex gap-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default Jobs;
