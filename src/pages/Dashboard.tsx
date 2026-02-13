import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Mic, Code, FileText, Briefcase, BarChart3, ArrowRight,
  TrendingUp, Target, Clock, Zap, Activity, Sparkles, BrainCircuit
} from "lucide-react";

interface DashboardStats {
  totalInterviews: number;
  totalSubmissions: number;
  totalResumes: number;
  savedJobs: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalInterviews: 0,
    totalSubmissions: 0,
    totalResumes: 0,
    savedJobs: 0,
  });
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
      const [interviews, submissions, resumes, jobs] = await Promise.all([
        supabase.from("interviews").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("coding_submissions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("resumes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("saved_jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      setStats({
        totalInterviews: interviews.count ?? 0,
        totalSubmissions: submissions.count ?? 0,
        totalResumes: resumes.count ?? 0,
        savedJobs: jobs.count ?? 0,
      });

      if (profile?.full_name) {
        setProfileName(profile.full_name);
      }
    };

    fetchData();
  }, [user]);

  const STAT_CARDS = [
    { label: "Mock Interviews", value: stats.totalInterviews, icon: Mic, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { label: "Code Solved", value: stats.totalSubmissions, icon: Code, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    { label: "Resumes", value: stats.totalResumes, icon: FileText, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    { label: "Jobs Saved", value: stats.savedJobs, icon: Briefcase, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  ];

  const QUICK_ACTIONS = [
    { label: "Start Interview", href: "/interviews", icon: Mic, desc: "Practice with AI" },
    { label: "Coding Challenge", href: "/coding", icon: Code, desc: "Solve problems" },
    { label: "Upload Resume", href: "/profile", icon: FileText, desc: "Get analyzed" },
    { label: "Browse Jobs", href: "/jobs", icon: Briefcase, desc: "Find your role" },
    { label: "View Reports", href: "/reports", icon: BarChart3, desc: "Track progress" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Hero Section */}
        <div className="flex flex-col gap-2 border-b border-border/40 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl flex items-center gap-2">
            Welcome back{profileName ? `, ${profileName.split(' ')[0]}` : ""} <span className="animate-pulse">👋</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Ready to accelerate your career? Here is your daily progress overview.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_CARDS.map((card, i) => (
            <Card key={card.label} className={`border ${card.border} shadow-sm transition-all hover:-translate-y-1 hover:shadow-md cursor-default`}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bg}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground tracking-tight">{card.value}</p>
                  <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2"><Zap className="h-5 w-5 text-yellow-500" /> Quick Actions</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} to={action.href}>
                <Card className="group cursor-pointer border-border/50 transition-all hover:border-primary/40 hover:bg-muted/5 hover:shadow-sm h-full">
                  <CardContent className="flex flex-col items-center justify-center gap-3 p-6 text-center h-full">
                    <div className="p-3 rounded-full bg-secondary group-hover:bg-primary/10 transition-colors">
                      <action.icon className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-semibold text-foreground block">{action.label}</span>
                      <span className="text-xs text-muted-foreground block">{action.desc}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity & Progress */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Activity */}
          <Card className="border-border/50 shadow-sm h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.totalInterviews === 0 && stats.totalSubmissions === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground space-y-3">
                  <div className="bg-muted rounded-full p-4">
                    <Sparkles className="h-6 w-6 opacity-50" />
                  </div>
                  <p className="text-sm">No recent activity detected.</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/interviews">Start your first Interview</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Placeholder for actual activity list */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/50">
                    <div className="flex items-center gap-3">
                      <Mic className="h-4 w-4 text-blue-500" />
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">Mock Interview</p>
                        <p className="text-xs text-muted-foreground">Practice Session</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">Recently</span>
                  </div>
                  {/* More items would go here */}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skill Progress */}
          <Card className="border-border/50 shadow-sm h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BrainCircuit className="h-5 w-5 text-purple-500" />
                AI Readiness Score
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="relative flex items-center justify-center">
                <svg className="h-32 w-32 rotate-[-90deg]">
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/20" />
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="351.86" strokeDashoffset="351.86" className="text-primary transition-all duration-1000 ease-out" style={{ strokeDashoffset: 351.86 - (351.86 * 0.1) }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">10%</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">Beginner</span>
                </div>
              </div>
              <p className="text-sm text-center text-muted-foreground max-w-xs">
                Complete more challenges to increase your readiness score and unlock advanced insights.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
