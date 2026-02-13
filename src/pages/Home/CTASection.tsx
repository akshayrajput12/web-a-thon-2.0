import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  return (
    <section className="relative overflow-hidden border-t border-border/50 py-24">
      <div className="absolute left-1/2 top-0 h-64 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="container relative z-10 text-center">
        <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
          Ready to Accelerate Your Career?
        </h2>
        <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
          Join thousands of professionals who've transformed their job search
          with AI-powered preparation and intelligence.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button variant="hero" size="lg" className="gap-2">
            Start Free Today
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="heroOutline" size="lg">
            Schedule a Demo
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          No credit card required · Free forever plan available
        </p>
      </div>
    </section>
  );
};

export default CTASection;
