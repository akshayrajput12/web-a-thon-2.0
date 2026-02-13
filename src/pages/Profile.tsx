import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Plus, X, Upload, FileText, Trash2 } from "lucide-react";

interface ProfileData {
  full_name: string;
  headline: string;
  bio: string;
  experience_years: number;
  target_role: string;
  skills: string[];
  location: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
}

interface ResumeData {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  created_at: string;
}

const DEFAULT_PROFILE: ProfileData = {
  full_name: "",
  headline: "",
  bio: "",
  experience_years: 0,
  target_role: "",
  skills: [],
  location: "",
  linkedin_url: "",
  github_url: "",
  portfolio_url: "",
};

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("resumes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
    ]).then(([profileRes, resumeRes]) => {
      if (profileRes.data) {
        setProfile({
          full_name: profileRes.data.full_name ?? "",
          headline: profileRes.data.headline ?? "",
          bio: profileRes.data.bio ?? "",
          experience_years: profileRes.data.experience_years ?? 0,
          target_role: profileRes.data.target_role ?? "",
          skills: (profileRes.data.skills as string[]) ?? [],
          location: profileRes.data.location ?? "",
          linkedin_url: profileRes.data.linkedin_url ?? "",
          github_url: profileRes.data.github_url ?? "",
          portfolio_url: profileRes.data.portfolio_url ?? "",
        });
      }
      if (resumeRes.data && resumeRes.data.length > 0) {
        setResume(resumeRes.data[0] as ResumeData);
      }
      setLoading(false);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(profile).eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
    }
    setSaving(false);
  };

  const addSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile({ ...profile, skills: [...profile.skills, newSkill.trim()] });
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setProfile({ ...profile, skills: profile.skills.filter((s) => s !== skill) });
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum 10MB allowed.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      // Delete existing resume from bucket if any
      if (resume) {
        const oldPath = `${user.id}/${resume.file_name}`;
        await supabase.storage.from("resumes").remove([oldPath]);
        await supabase.from("resumes").delete().eq("id", resume.id);
      }

      const filePath = `${user.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(filePath);

      const { data: resumeRow, error: dbError } = await supabase
        .from("resumes")
        .insert({ user_id: user.id, file_name: file.name, file_url: urlData.publicUrl, file_size: file.size })
        .select()
        .single();
      if (dbError) throw dbError;

      setResume(resumeRow as ResumeData);
      toast({ title: "Resume uploaded successfully" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleResumeDelete = async () => {
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
          <Button variant="hero" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>

        {/* Resume Upload Card */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Resume</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {resume ? (
              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{resume.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {resume.file_size ? `${(resume.file_size / 1024).toFixed(1)} KB` : ""} · Uploaded {new Date(resume.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={resume.file_url} target="_blank" rel="noopener noreferrer">View</a>
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleResumeDelete} disabled={deleting}>
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border/50 py-8">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Upload your resume (PDF, DOC, DOCX – max 10MB)</p>
                <label>
                  <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleResumeUpload} disabled={uploading} />
                  <Button variant="secondary" asChild disabled={uploading}>
                    <span>{uploading ? "Uploading..." : "Choose File"}</span>
                  </Button>
                </label>
              </div>
            )}
            {resume && (
              <div className="text-center">
                <label>
                  <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleResumeUpload} disabled={uploading} />
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span>{uploading ? "Uploading..." : "Replace Resume"}</span>
                  </Button>
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Headline</Label>
              <Input placeholder="e.g. Senior Frontend Engineer" value={profile.headline} onChange={(e) => setProfile({ ...profile, headline: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Bio</Label>
              <Textarea placeholder="Tell us about yourself..." value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input placeholder="e.g. Bangalore, India" value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Input type="number" min={0} value={profile.experience_years} onChange={(e) => setProfile({ ...profile, experience_years: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Target Role</Label>
              <Input placeholder="e.g. Senior Software Engineer" value={profile.target_role} onChange={(e) => setProfile({ ...profile, target_role: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a skill..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
              />
              <Button variant="secondary" onClick={addSkill}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1">
                  {skill}
                  <button onClick={() => removeSkill(skill)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {profile.skills.length === 0 && <p className="text-sm text-muted-foreground">No skills added yet.</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Links</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>LinkedIn</Label>
              <Input placeholder="https://linkedin.com/in/..." value={profile.linkedin_url} onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>GitHub</Label>
              <Input placeholder="https://github.com/..." value={profile.github_url} onChange={(e) => setProfile({ ...profile, github_url: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Portfolio</Label>
              <Input placeholder="https://yoursite.com" value={profile.portfolio_url} onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })} />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
