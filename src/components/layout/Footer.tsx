import { Brain } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-card/30 py-12">
      <div className="container">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold text-foreground">HireSense AI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 HireSense AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
