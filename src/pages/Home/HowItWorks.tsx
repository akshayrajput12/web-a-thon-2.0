import { Upload, Settings, Play, Trophy } from "lucide-react";
import { motion } from "motion/react";

const STEPS = [
  {
    icon: <Upload className="h-6 w-6" />,
    step: "01",
    title: "Upload Your Resume",
    description: "Start by uploading your resume. Our AI instantly analyzes it for ATS compatibility and identifies skill gaps.",
  },
  {
    icon: <Settings className="h-6 w-6" />,
    step: "02",
    title: "Customize Your Path",
    description: "Select your target role, industry, and difficulty level. The platform adapts to your unique career goals.",
  },
  {
    icon: <Play className="h-6 w-6" />,
    step: "03",
    title: "Practice & Improve",
    description: "Engage in AI-powered mock interviews, coding challenges, and get real-time feedback on your performance.",
  },
  {
    icon: <Trophy className="h-6 w-6" />,
    step: "04",
    title: "Land the Job",
    description: "Use your personalized insights and matched job listings to apply with confidence and track your progress.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="relative border-y border-border/50 bg-card/30 py-24 overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-primary/5 dark:bg-primary/2" />
      <div className="absolute left-0 top-1/2 h-96 w-[800px] -translate-x-1/3 -translate-y-1/2 rounded-full bg-primary/20 blur-[100px] dark:bg-primary/10 opacity-30" />

      <div className="container relative z-10">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-3 text-sm font-medium uppercase tracking-wider text-primary"
          >
            How It Works
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-4 text-3xl font-bold text-foreground sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70"
          >
            From Sign-Up to Success in 4 Steps
          </motion.h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 relative">
          {/* Connecting Line for Large Screens */}
          <div className="absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent hidden lg:block -z-10 translate-y-4" />

          {STEPS.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="group relative flex flex-col items-center text-center p-6 rounded-2xl hover:bg-white/5 transition-colors duration-300"
            >
              <div className="mb-6 relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-background/50 text-primary shadow-sm group-hover:scale-110 group-hover:border-primary/60 transition-all duration-300">
                  {step.icon}
                </div>
                <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center border-2 border-background">
                  {step.step}
                </div>
              </div>

              <h3 className="mb-3 text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
