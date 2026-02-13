import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Loader2, FileText, TrendingUp, CheckCircle2, AlertCircle, Calendar, ArrowRight, Activity } from "lucide-react";

interface Report {
  id: string;
  title: string;
  report_type: string;
  overall_score: number | null;
  strengths: string[];
  improvements: string[];
  interview_id: string | null;
  coding_submission_id: string | null;
  created_at: string;
}

const Reports = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchReports = async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        const parsed = data.map((r: any) => ({
          ...r,
          strengths: Array.isArray(r.strengths) ? r.strengths : [],
          improvements: Array.isArray(r.improvements) ? r.improvements : [],
        }));
        setReports(parsed);
      }
      setLoading(false);
    };
    fetchReports();
  }, [user]);

  const averageScore = reports.length > 0
    ? Math.round(reports.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) / reports.length)
    : 0;

  const totalInterviews = reports.filter(r => r.report_type === 'interview').length;
  const totalCoding = reports.filter(r => r.report_type === 'coding').length;

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Performance Analytics</h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              Track your progress, analyze feedback, and improve your interview readiness.
            </p>
          </div>
          {reports.length > 0 && (
            <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-lg border border-border/50">
              <Activity className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Recent Activity: {new Date(reports[0].created_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-32"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
        ) : reports.length === 0 ? (
          <Card className="border-dashed border-2 border-border/60 bg-muted/10">
            <CardContent className="flex flex-col items-center gap-6 py-24 text-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">No Reports Yet</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Complete interviews or coding challenges to generate comprehensive performance reports.
                </p>
              </div>
              <Button size="lg" onClick={() => navigate("/interviews")} variant="outline" className="mt-4">
                Start an Interview
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-border/50 shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 opacity-50" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Average Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-foreground flex items-baseline gap-2">
                    {averageScore}%
                    <span className="text-sm font-normal text-muted-foreground">overall</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Interviews Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-foreground">{totalInterviews}</div>
                </CardContent>
              </Card>
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Coding Challenges</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-foreground">{totalCoding}</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Reports Grid */}
            <div>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Recent Reports
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {reports.map((report) => (
                  <Card
                    key={report.id}
                    className="group flex flex-col border-border/50 bg-card transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 cursor-pointer overflow-hidden"
                    onClick={() => {
                      if (report.interview_id) navigate(`/interviews/${report.interview_id}/report`);
                    }}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <ArrowRight className="h-5 w-5 text-primary" />
                    </div>

                    <div className={`h-1.5 w-full ${(report.overall_score || 0) >= 80 ? 'bg-green-500' :
                        (report.overall_score || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />

                    <CardHeader className="pb-3 pt-5">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline" className="uppercase text-[10px] tracking-wider px-2 bg-background/50">
                          {report.report_type}
                        </Badge>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <CardTitle className="text-lg font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {report.title}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="flex-1 space-y-5 pb-6">
                      <div className="flex items-center gap-3">
                        <div className={`text-3xl font-bold ${(report.overall_score || 0) >= 70 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          {report.overall_score || 0}%
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Overall Score</p>
                          <p className="text-xs text-muted-foreground">
                            {(report.overall_score || 0) >= 80 ? 'Excellent' : (report.overall_score || 0) >= 60 ? 'Good' : 'Needs Improvement'}
                          </p>
                        </div>
                      </div>

                      {report.strengths.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-green-500" /> Top Strengths
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {report.strengths.slice(0, 2).map((s, i) => (
                              <Badge key={i} variant="secondary" className="text-xs font-normal bg-secondary/50 text-secondary-foreground px-2 py-0.5 max-w-full truncate">
                                {String(s)}
                              </Badge>
                            ))}
                            {report.strengths.length > 2 && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">+{report.strengths.length - 2}</Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>

                    <div className="p-4 pt-0 mt-auto border-t border-border/30 bg-muted/5">
                      <Button
                        className="w-full text-foreground hover:text-primary hover:bg-primary/5 transition-colors justify-between group-hover:pr-2 group-hover:pl-4 transition-all"
                        variant="ghost"
                        size="sm"
                        disabled={!report.interview_id}
                      >
                        View Full Analysis <ArrowRight className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
