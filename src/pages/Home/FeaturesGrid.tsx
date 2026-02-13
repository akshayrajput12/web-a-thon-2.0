import { Brain, Code, FileText, Briefcase, BarChart3, Users } from "lucide-react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <div className="group relative overflow-hidden rounded-lg border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    <div className="relative z-10">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  </div>
);

const FEATURES = [
  {
    icon: <Brain className="h-6 w-6" />,
    title: "AI Mock Interviews",
    description: "Practice with AI interviewers that adapt to your experience level, role, and target company culture.",
  },
  {
    icon: <Code className="h-6 w-6" />,
    title: "Live Coding Challenges",
    description: "Solve real-world coding problems in a full IDE with AI-powered hints and complexity analysis.",
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: "Resume Intelligence",
    description: "Get instant ATS scoring, keyword optimization, and tailored improvement suggestions for every application.",
  },
  {
    icon: <Briefcase className="h-6 w-6" />,
    title: "Smart Job Matching",
    description: "Discover opportunities matched to your skills with AI-driven compatibility scores and insights.",
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Performance Reports",
    description: "Track your progress with detailed analytics, skill radar charts, and personalized improvement roadmaps.",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "AI Avatar Interviewer",
    description: "Experience realistic interviews with lip-synced AI avatars that provide emotional and contextual feedback.",
  },
];

const FeaturesGrid = () => {
  return (
    <section id="features" className="py-24">
      <div className="container">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">
            Features
          </p>
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            Everything You Need to Land Your Dream Job
          </h2>
          <p className="text-muted-foreground">
            A comprehensive toolkit that covers every stage of your career journey,
            from preparation to placement.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;
