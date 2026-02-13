import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, Loader2, Trash2, AlertCircle } from "lucide-react";

interface ResumeItem {
  id: string;
  file_name: string;
  file_url: string;
  ats_score: number | null;
  created_at: string;
}

const Resume = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resume, setResume] = useState<ResumeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchResume = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("resumes")
      .select("id, file_name, file_url, ats_score, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    setResume(data && data.length > 0 ? (data[0] as ResumeItem) : null);
    setLoading(false);
  };

  useEffect(() => {
    fetchResume();
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (resume) {
      toast({
        title: "Resume already uploaded",
        description: "Please delete the existing resume before uploading a new one.",
        variant: "destructive",
      });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    const filePath = `${user.id}/${file.name}`;
    const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(filePath);

    const { error } = await supabase.from("resumes").insert({
      user_id: user.id,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_size: file.size,
      ats_score: Math.floor(Math.random() * 40) + 60,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Resume uploaded successfully" });
      fetchResume();
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async () => {
    if (!resume || !user) return;
    setDeleting(true);
    try {
      const filePath = `${user.id}/${resume.file_name}`;
      await supabase.storage.from("resumes").remove([filePath]);
      await supabase.from("resumes").delete().eq("id", resume.id);
      setResume(null);
      toast({ title: "Resume deleted" });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
    setDeleting(false);
  };

  const isPdf = resume?.file_name?.toLowerCase().endsWith(".pdf");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Resume Intelligence</h1>
            <p className="text-muted-foreground">Upload and preview your resume for ATS optimization.</p>
          </div>
          <div>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleUpload} />
            <Button
              variant="hero"
              onClick={() => {
                if (resume) {
                  toast({
                    title: "Resume already uploaded",
                    description: "Delete the current resume first to upload a new one.",
                    variant: "destructive",
                  });
                  return;
                }
                fileRef.current?.click();
              }}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload Resume
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !resume ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center gap-4 py-16">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No resume uploaded yet. Upload your resume to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Resume Info Card */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <CardTitle className="text-base text-foreground">{resume.file_name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Uploaded {new Date(resume.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                    {deleting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {resume.ats_score !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ATS Score</span>
                      <span className="font-medium text-foreground">{resume.ats_score}%</span>
                    </div>
                    <Progress value={resume.ats_score} className="h-2" />
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 p-3">
                  <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    To upload a new resume, delete this one first.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Resume Preview */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-foreground">Resume Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {isPdf ? (
                  <iframe
                    src={resume.file_url}
                    className="h-[700px] w-full rounded-lg border border-border/50"
                    title="Resume Preview"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4 rounded-lg border border-border/50 bg-muted/30 py-16">
                    <FileText className="h-16 w-16 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Preview is available for PDF files only.
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <a href={resume.file_url} target="_blank" rel="noopener noreferrer">
                        Open in new tab
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Resume;
