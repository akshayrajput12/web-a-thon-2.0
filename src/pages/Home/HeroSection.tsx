import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
      <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />

      <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute right-1/4 top-1/2 h-64 w-64 rounded-full bg-accent/10 blur-[100px]" />

      <div className="container relative z-10 flex flex-col items-center gap-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
          <Sparkles className="h-4 w-4" />
          AI-Powered Career Intelligence
        </div>

        <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-7xl">
          Your Career,{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Supercharged
          </span>{" "}
          by AI
        </h1>

        <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Master interviews, ace coding challenges, optimize your resume, and discover
          perfect job matches — all powered by intelligent automation.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Button variant="hero" size="lg" className="gap-2">
            Start Free Trial
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="heroOutline" size="lg">
            Watch Demo
          </Button>
        </div>

        <div className="flex items-center gap-8 pt-8 text-sm text-muted-foreground">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-foreground">50K+</span>
            <span>Users</span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-foreground">93%</span>
            <span>Success Rate</span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-foreground">200+</span>
            <span>Companies</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
