import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { Grid } from "@/components/ui/feature-section-with-card-gradient";

const HeroSection = () => {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16 bg-background">
      {/* Background Gradients & Grid */}
      <div className="absolute inset-0 z-0">
        <Grid size={40} />
      </div>

      <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px] dark:bg-primary/10" />
      <div className="absolute right-0 top-0 h-[300px] w-[300px] rounded-full bg-accent/20 blur-[100px] dark:bg-accent/10" />

      <div className="container relative z-10 flex flex-col items-center gap-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary shadow-[0_0_10px_hsl(var(--primary)/0.2)] backdrop-blur-sm"
        >
          <Sparkles className="h-4 w-4" />
          AI-Powered Career Intelligence
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="max-w-4xl text-5xl font-extrabold leading-tight tracking-tight text-foreground sm:text-6xl lg:text-7xl"
        >
          Your Career,{" "}
          <span className="relative inline-block">
            <span className="bg-gradient-to-r from-primary via-indigo-500 to-accent bg-clip-text text-transparent">
              Supercharged
            </span>
            <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent opacity-50 blur-sm" />
          </span>{" "}
          by AI
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          className="max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed"
        >
          Master interviews, ace coding challenges, optimize your resume, and discover
          perfect job matches — all powered by intelligent automation.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
          className="flex flex-col gap-4 sm:flex-row"
        >
          <Button variant="default" size="lg" className="gap-2 h-12 px-8 text-base shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-shadow">
            Start Free Trial
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" className="h-12 px-8 text-base border-primary/20 hover:bg-primary/5">
            Watch Demo
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-wrap justify-center items-center gap-8 sm:gap-12 pt-12 text-sm text-muted-foreground"
        >
          {[
            { value: "50K+", label: "Users" },
            { value: "93%", label: "Success Rate" },
            { value: "200+", label: "Companies" }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-3xl font-bold text-foreground">{stat.value}</span>
              <span className="font-medium text-muted-foreground/80 lowercase">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
