import { useId } from "react";
import { Brain, Code, FileText, Briefcase, BarChart3, Users, Zap, Search } from "lucide-react";
import { motion, Variants } from "motion/react";

const FEATURES = [
  {
    title: "AI Mock Interviews",
    description: "Practice with AI interviewers that adapt to your experience level, role, and target company culture.",
    icon: <Brain className="h-6 w-6" />,
  },
  {
    title: "Live Coding Challenges",
    description: "Solve real-world coding problems in a full IDE with AI-powered hints and complexity analysis.",
    icon: <Code className="h-6 w-6" />,
  },
  {
    title: "Resume Intelligence",
    description: "Get instant ATS scoring, keyword optimization, and tailored improvement suggestions for every application.",
    icon: <FileText className="h-6 w-6" />,
  },
  {
    title: "Smart Job Matching",
    description: "Discover opportunities matched to your skills with AI-driven compatibility scores and insights.",
    icon: <Briefcase className="h-6 w-6" />,
  },
  {
    title: "Performance Reports",
    description: "Track your progress with detailed analytics, skill radar charts, and personalized improvement roadmaps.",
    icon: <BarChart3 className="h-6 w-6" />,
  },
  {
    title: "AI Avatar Interviewer",
    description: "Experience realistic interviews with lip-synced AI avatars that provide emotional and contextual feedback.",
    icon: <Users className="h-6 w-6" />,
  },
  {
    title: "Career Roadmap",
    description: "Get a personalized step-by-step career path based on your current skills and career goals.",
    icon: <Zap className="h-6 w-6" />,
  },
  {
    title: "Industry Insights",
    description: "Stay updated with the latest trends and demands in your target industry with AI-curated insights.",
    icon: <Search className="h-6 w-6" />,
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const FeaturesGrid = () => {
  return (
    <section id="features" className="py-24 bg-background overflow-hidden">
      <div className="container">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-3 text-sm font-medium uppercase tracking-wider text-primary"
          >
            Features
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mb-4 text-3xl font-bold text-foreground sm:text-4xl"
          >
            Everything You Need to Land Your Dream Job
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground"
          >
            A comprehensive toolkit that covers every stage of your career journey,
            from preparation to placement.
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{
                scale: 1.02,
                y: -5,
                transition: { duration: 0.2 }
              }}
              className="group relative bg-gradient-to-b from-background to-muted/20 dark:from-background dark:to-muted/10 p-6 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-primary/50"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <Grid size={20} />

              <div className="relative z-20 mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300 shadow-sm group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                {feature.icon}
              </div>

              <h3 className="text-lg font-bold text-foreground relative z-20 mb-2 group-hover:text-primary transition-colors duration-300">
                {feature.title}
              </h3>

              <p className="text-muted-foreground text-sm font-normal relative z-20 leading-relaxed group-hover:text-foreground/80 transition-colors duration-300">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export const Grid = ({
  pattern,
  size,
}: {
  pattern?: number[][];
  size?: number;
}) => {
  const p = pattern ?? [
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
  ];
  return (
    <div className="pointer-events-none absolute left-1/2 top-0  -ml-20 -mt-2 h-full w-full [mask-image:linear-gradient(white,transparent)]">
      <div className="absolute inset-0 bg-gradient-to-r  [mask-image:radial-gradient(farthest-side_at_top,white,transparent)] dark:from-zinc-900/30 from-zinc-100/30 to-zinc-300/30 dark:to-zinc-900/30 opacity-100">
        <GridPattern
          width={size ?? 20}
          height={size ?? 20}
          x="-12"
          y="4"
          squares={p}
          className="absolute inset-0 h-full w-full  mix-blend-overlay dark:fill-white/10 dark:stroke-white/10 stroke-black/10 fill-black/10"
        />
      </div>
    </div>
  );
};

export function GridPattern({ width, height, x, y, squares, ...props }: any) {
  const patternId = useId();

  return (
    <svg aria-hidden="true" {...props}>
      <defs>
        <pattern
          id={patternId}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path d={`M.5 ${height}V.5H${width}`} fill="none" />
        </pattern>
      </defs>
      <rect
        width="100%"
        height="100%"
        strokeWidth={0}
        fill={`url(#${patternId})`}
      />
      {squares && (
        <svg x={x} y={y} className="overflow-visible">
          {squares.map(([x, y]: any) => (
            <rect
              strokeWidth="0"
              key={`${x}-${y}`}
              width={width + 1}
              height={height + 1}
              x={x * width}
              y={y * height}
            />
          ))}
        </svg>
      )}
    </svg>
  );
}

export default FeaturesGrid;
