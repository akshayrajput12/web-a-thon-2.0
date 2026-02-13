import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Plus, X, Upload, FileText, Trash2, User, MapPin, Linkedin, Github, Globe, Briefcase, Download, ExternalLink } from "lucide-react";

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
      <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Your Profile</h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              Manage your professional identity and resume for AI-tailored experiences.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} size="lg" className="shadow-lg hover:shadow-primary/25 transition-all">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">

          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Personal Information */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl"><User className="h-5 w-5 text-primary" /> Personal Details</CardTitle>
                <CardDescription>Basic information to help AI understand who you are.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-foreground/80">Full Name</Label>
                    <Input className="bg-background/50" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground/80">Headline</Label>
                    <Input className="bg-background/50" placeholder="e.g. Senior Frontend Engineer" value={profile.headline} onChange={(e) => setProfile({ ...profile, headline: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground/80">Bio</Label>
                  <Textarea className="bg-background/50 resize-none" placeholder="Brief visual of your career journey..." value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={4} />
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-foreground/80 flex items-center gap-2"><MapPin className="h-4 w-4" /> Location</Label>
                    <Input className="bg-background/50" placeholder="e.g. Bangalore, India" value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground/80 flex items-center gap-2"><Briefcase className="h-4 w-4" /> Years of Experience</Label>
                    <Input className="bg-background/50" type="number" min={0} value={profile.experience_years} onChange={(e) => setProfile({ ...profile, experience_years: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground/80">Target Role</Label>
                  <Input className="bg-background/50" placeholder="e.g. Senior Software Engineer" value={profile.target_role} onChange={(e) => setProfile({ ...profile, target_role: e.target.value })} />
                </div>
              </CardContent>
            </Card>

            {/* Resume Section - Prominently Placed */}
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-xl"><FileText className="h-5 w-5 text-primary" /> Resume</CardTitle>
                    <CardDescription>Upload your latest resume to power AI interviews.</CardDescription>
                  </div>
                  {resume && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {resume ? (
                  <div className="bg-background border border-border/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-primary/40 hover:shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground line-clamp-1" title={resume.file_name}>{resume.file_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {resume.file_size ? `${(resume.file_size / 1024 / 1024).toFixed(2)} MB` : "Unknown size"} · Uploaded {new Date(resume.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <Button variant="outline" size="sm" asChild className="h-9">
                        <a href={resume.file_url} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-3.5 w-3.5" /> Download</a>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleResumeDelete} disabled={deleting}>
                        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border/60 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-muted/5 transition-colors group">
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Upload your resume</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mb-6">Drag and drop your PDF, DOCX file here or click to browse. Max 10MB.</p>
                    <div className="relative">
                      <input type="file" accept=".pdf,.doc,.docx" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleResumeUpload} disabled={uploading} />
                      <Button variant="secondary" disabled={uploading} className="pointer-events-none relative z-10">
                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        {uploading ? "Uploading..." : "Select File"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">

            {/* Skills */}
            <Card className="border-border/50 shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="text-lg">Skills</CardTitle>
                <CardDescription>Add skills to tune your challenges.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Input
                    placeholder="Add a new skill & press Enter"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                    className="pr-10 bg-background/50"
                  />
                  <Button size="icon" variant="ghost" className="absolute right-0 top-0 h-full w-10 hover:bg-transparent text-muted-foreground hover:text-foreground" onClick={addSkill}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1.5 py-1 pl-2.5 pr-1.5 transition-colors hover:bg-secondary/80">
                      {skill}
                      <button onClick={() => removeSkill(skill)} className="text-muted-foreground hover:text-foreground rounded-full p-0.5 hover:bg-background/20 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {profile.skills.length === 0 && <p className="text-sm text-muted-foreground italic w-full text-center py-2">No skills added yet.</p>}
                </div>
              </CardContent>
            </Card>

            {/* Social Links */}
            <Card className="border-border/50 shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="text-lg">Online Presence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold"><Linkedin className="h-3.5 w-3.5" /> LinkedIn</Label>
                  <Input className="bg-background/50" placeholder="https://linkedin.com/in/..." value={profile.linkedin_url} onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold"><Github className="h-3.5 w-3.5" /> GitHub</Label>
                  <Input className="bg-background/50" placeholder="https://github.com/..." value={profile.github_url} onChange={(e) => setProfile({ ...profile, github_url: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold"><Globe className="h-3.5 w-3.5" /> Portfolio</Label>
                  <Input className="bg-background/50" placeholder="https://yoursite.com" value={profile.portfolio_url} onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })} />
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
