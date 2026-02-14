import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "motion/react";

const CTASection = () => {
  return (
    <section className="relative overflow-hidden border-t border-border/50 py-32">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-primary/5 dark:bg-primary/2" />
      <div className="absolute left-1/2 top-1/2 h-96 w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[100px] dark:bg-primary/10 opacity-50" />

      <div className="container relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/50 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-primary"
        >
          <Sparkles className="h-4 w-4" />
          <span>Unlock Your Full Potential</span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6 text-4xl font-extrabold text-foreground sm:text-5xl lg:text-6xl tracking-tight"
        >
          Ready to Accelerate Your Career?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground leading-relaxed"
        >
          Join thousands of professionals who've transformed their job search
          with AI-powered preparation and intelligence. Stop guessing, start achieving.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <Button variant="default" size="lg" className="h-14 px-8 text-lg shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 hover:scale-105 transition-all duration-300 gap-2">
            Start Free Today
            <ArrowRight className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="lg" className="h-14 px-8 text-lg hover:bg-white/5 border-primary/20 backdrop-blur-sm">
            Schedule a Demo
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8 text-sm text-muted-foreground flex items-center justify-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          No credit card required
          <span className="mx-2 opacity-50">•</span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Free forever plan available
        </motion.p>
      </div>
    </section>
  );
};

export default CTASection;
