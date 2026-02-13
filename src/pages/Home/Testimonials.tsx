const TESTIMONIALS = [
  {
    quote: "HireSense AI helped me prepare for my Google interview in just two weeks. The AI mock interviews were incredibly realistic.",
    name: "Sarah Chen",
    role: "Software Engineer at Google",
    initials: "SC",
  },
  {
    quote: "The resume intelligence feature boosted my ATS score from 45% to 92%. I started getting callbacks within days.",
    name: "Marcus Johnson",
    role: "Product Manager at Meta",
    initials: "MJ",
  },
  {
    quote: "The coding challenges and real-time feedback transformed my problem-solving approach. Highly recommend for anyone targeting FAANG.",
    name: "Priya Patel",
    role: "Data Scientist at Amazon",
    initials: "PP",
  },
];

const Testimonials = () => {
  return (
    <section id="testimonials" className="py-24">
      <div className="container">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">
            Testimonials
          </p>
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            Trusted by Thousands of Professionals
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="flex flex-col rounded-lg border border-border/50 bg-card p-6"
            >
              <p className="mb-6 flex-1 text-sm leading-relaxed text-muted-foreground italic">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
