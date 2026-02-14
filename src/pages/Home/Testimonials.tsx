import { StaggerTestimonials } from "@/components/ui/stagger-testimonials";
import { motion } from "motion/react";

const TESTIMONIALS = [
  {
    tempId: 0,
    testimonial: "The AI mock interviews were a game changer. I felt so much more prepared for my technical rounds at Google.",
    by: "Sarah Chen, Software Engineer at Google",
    imgSrc: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150"
  },
  {
    tempId: 1,
    testimonial: "My resume score went from 45 to 90 using the Resume Intelligence tool. Got callbacks immediately.",
    by: "Michael Ross, Product Manager at Stripe",
    imgSrc: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150"
  },
  {
    tempId: 2,
    testimonial: "The job matching is incredibly accurate. It found roles I wouldn't have found on my own.",
    by: "Jessica Lee, UX Designer at Airbnb",
    imgSrc: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150&h=150"
  },
  {
    tempId: 3,
    testimonial: "Love the live coding challenges. Exact same environment as the real interviews.",
    by: "David Kim, Full Stack Dev at Amazon",
    imgSrc: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150"
  },
  {
    tempId: 4,
    testimonial: "The career roadmap gave me a clear path to my promotion. Highly recommend.",
    by: "Emily Rodriguez, Data Scientist at Netflix",
    imgSrc: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150"
  },
  {
    tempId: 5,
    testimonial: "Automated applications saved me hours every week. Best investment for my job search.",
    by: "Chris Wilson, Marketing Specialist",
    imgSrc: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150&h=150"
  },
  {
    tempId: 6,
    testimonial: "Finally, a platform that gives actionable feedback. The AI avatar feedback was spot on.",
    by: "Amanda Tyrell, HR Consultant",
    imgSrc: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150&h=150"
  },
  {
    tempId: 7,
    testimonial: "I landed my dream job at a FAANG company thanks to the rigorous practice here.",
    by: "James Carter, Senior Developer",
    imgSrc: "https://images.unsplash.com/photo-1522075469751-3a3694c2d654?auto=format&fit=crop&q=80&w=150&h=150"
  }
];

const Testimonials = () => {
  return (
    <section id="testimonials" className="relative py-24 bg-background overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-primary/5 dark:bg-primary/2" />
      <div className="absolute right-0 top-1/2 h-96 w-[800px] translate-x-1/3 -translate-y-1/2 rounded-full bg-primary/20 blur-[100px] dark:bg-primary/10 opacity-30" />

      <div className="container relative z-10 overflow-hidden">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-3 text-sm font-medium uppercase tracking-wider text-primary"
          >
            Testimonials
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-4 text-3xl font-bold text-foreground sm:text-4xl"
          >
            Trusted by Thousands of Professionals
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-muted-foreground"
          >
            See how HireSense AI is helping professionals across the globe achieve their career goals.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <StaggerTestimonials testimonials={TESTIMONIALS} />
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
