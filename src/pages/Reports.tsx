import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Loader2, FileText } from "lucide-react";

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
    supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const parsed = (data ?? []).map((r) => ({
          ...r,
          strengths: (r.strengths ?? []) as string[],
          improvements: (r.improvements ?? []) as string[],
        }));
        setReports(parsed);
        setLoading(false);
      });
  }, [user]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Performance Reports</h1>
          <p className="text-muted-foreground">Track your interview and coding performance over time.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : reports.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center gap-4 py-16">
              <BarChart3 className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                No reports yet. Complete interviews or coding challenges to generate reports.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <Card key={report.id} className="border-border/50 flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg text-foreground">{report.title}</CardTitle>
                    <Badge variant="outline">{report.report_type}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 flex-1">
                  {report.overall_score !== null && (
                    <p className="text-2xl font-bold text-primary">{report.overall_score}%</p>
                  )}
                  {report.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Strengths</p>
                      <div className="flex flex-wrap gap-1">
                        {report.strengths.slice(0, 3).map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{String(s)}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(report.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
                <div className="p-6 pt-0 mt-auto">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      if (report.interview_id) {
                        navigate(`/interviews/${report.interview_id}/report`);
                      } else {
                        // detailed view for coding reports not implemented yet / generic view
                        // console.log("No specific view for this report type yet");
                      }
                    }}
                    disabled={!report.interview_id}
                  >
                    View Full Report
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
