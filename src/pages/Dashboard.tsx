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
  TrendingUp, Target, Clock,
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
      const [interviews, submissions, resumes, jobs, profile] = await Promise.all([
        supabase.from("interviews").select("id", { count: "exact", head: true }),
        supabase.from("coding_submissions").select("id", { count: "exact", head: true }),
        supabase.from("resumes").select("id", { count: "exact", head: true }),
        supabase.from("saved_jobs").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("full_name").eq("user_id", user.id).single(),
      ]);

      setStats({
        totalInterviews: interviews.count ?? 0,
        totalSubmissions: submissions.count ?? 0,
        totalResumes: resumes.count ?? 0,
        savedJobs: jobs.count ?? 0,
      });

      if (profile.data?.full_name) {
        setProfileName(profile.data.full_name);
      }
    };

    fetchData();
  }, [user]);

  const STAT_CARDS = [
    { label: "Mock Interviews", value: stats.totalInterviews, icon: Mic, color: "text-primary" },
    { label: "Code Submissions", value: stats.totalSubmissions, icon: Code, color: "text-accent" },
    { label: "Resumes Analyzed", value: stats.totalResumes, icon: FileText, color: "text-primary" },
    { label: "Jobs Saved", value: stats.savedJobs, icon: Briefcase, color: "text-accent" },
  ];

  const QUICK_ACTIONS = [
    { label: "Start Interview", href: "/interviews", icon: Mic },
    { label: "Coding Challenge", href: "/coding", icon: Code },
    { label: "Upload Resume", href: "/resume", icon: FileText },
    { label: "Browse Jobs", href: "/jobs", icon: Briefcase },
    { label: "View Reports", href: "/reports", icon: BarChart3 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back{profileName ? `, ${profileName}` : ""}
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your career preparation progress.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_CARDS.map((card) => (
            <Card key={card.label} className="border-border/50">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold text-foreground">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} to={action.href}>
                <Card className="group cursor-pointer border-border/50 transition-all hover:border-primary/30">
                  <CardContent className="flex items-center gap-3 p-4">
                    <action.icon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">{action.label}</span>
                    <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <TrendingUp className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Complete your first interview or coding challenge to see activity here.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Target className="h-5 w-5 text-accent" />
                Skill Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Upload a resume and take some interviews to track your skill growth.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
