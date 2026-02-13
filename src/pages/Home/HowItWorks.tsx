import { Upload, Settings, Play, Trophy } from "lucide-react";

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
    <section id="how-it-works" className="border-y border-border/50 bg-card/50 py-24">
      <div className="container">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">
            How It Works
          </p>
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            From Sign-Up to Success in 4 Steps
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={step.step} className="relative flex flex-col items-center text-center">
              {i < STEPS.length - 1 && (
                <div className="absolute left-[calc(50%+2rem)] top-8 hidden h-px w-[calc(100%-4rem)] bg-gradient-to-r from-primary/40 to-transparent lg:block" />
              )}
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                {step.icon}
              </div>
              <span className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">
                Step {step.step}
              </span>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
