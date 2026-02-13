import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { useScroll } from "@/components/ui/use-scroll";
import { ModeToggle } from "@/components/mode-toggle";
import { Brain } from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Pricing", href: "#pricing" },
];

const Header = () => {
  const [open, setOpen] = useState(false);
  const scrolled = useScroll(10);

  useEffect(() => {
    if (open) {
      // Disable scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable scroll
      document.body.style.overflow = '';
    }

    // Cleanup when component unmounts
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 mx-auto w-full max-w-5xl border-b border-transparent md:rounded-md md:border-transparent md:transition-all md:ease-out',
        {
          'bg-background/80 supports-[backdrop-filter]:bg-background/60 border-border/40 backdrop-blur-xl md:top-4 md:max-w-4xl md:border md:shadow-md':
            scrolled && !open,
          'bg-background': open,
        },
      )}
    >
      <nav
        className={cn(
          'flex h-16 w-full items-center justify-between px-4 md:h-14 md:transition-all md:ease-out md:px-6',
          {
            'md:px-4': scrolled,
          },
        )}
      >
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          {/* Kept existing logo logic to match "content is same" */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <span className="text-lg font-bold text-foreground">HireSense AI</span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-2 md:flex">
          {NAV_LINKS.map((link, i) => (
            <a key={i} className={cn(buttonVariants({ variant: 'ghost' }), "text-sm font-medium text-muted-foreground hover:text-foreground")} href={link.href}>
              {link.label}
            </a>
          ))}
          <div className="flex items-center gap-2 ml-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
          <ModeToggle />
        </div>

        {/* Mobile Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <ModeToggle />
          <Button size="icon" variant="outline" onClick={() => setOpen(!open)} className="z-50">
            <MenuToggleIcon open={open} className="size-5" duration={300} />
          </Button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        className={cn(
          'fixed inset-0 top-16 z-40 flex flex-col overflow-hidden bg-background md:hidden',
          open ? 'block' : 'hidden',
        )}
      >
        <div
          data-slot={open ? 'open' : 'closed'}
          className={cn(
            'data-[slot=open]:animate-in data-[slot=open]:slide-in-from-top-5 data-[slot=open]:fade-in data-[slot=closed]:animate-out data-[slot=closed]:slide-out-to-top-5 data-[slot=closed]:fade-out',
            'flex h-full w-full flex-col justify-between p-6 duration-300 ease-out',
          )}
        >
          <div className="grid gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                className={cn(buttonVariants({
                  variant: 'ghost',
                  className: 'justify-start text-lg py-4',
                }))}
                href={link.href}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-3 pb-8">
            <Link to="/auth" onClick={() => setOpen(false)}>
              <Button variant="outline" className="w-full text-lg py-6">
                Sign In
              </Button>
            </Link>
            <Link to="/auth" onClick={() => setOpen(false)}>
              <Button className="w-full text-lg py-6">Get Started</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
