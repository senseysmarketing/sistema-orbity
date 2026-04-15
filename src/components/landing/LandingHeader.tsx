import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, ArrowRight, LogIn } from "lucide-react";
import orbityLogo from "@/assets/orbity-logo-white.png";

const navLinks = [
  { label: "Funcionalidades", href: "#features" },
  { label: "Preços", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function LandingHeader() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-md border-b border-border/50"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <button onClick={scrollToTop}>
          <img
            src={orbityLogo}
            alt="Orbity"
            className="h-8 transition-all duration-300"
            style={{ filter: scrolled ? 'brightness(0)' : 'none' }}
          />
        </button>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors duration-300 ${
                scrolled
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className={`transition-colors duration-300 ${
              scrolled ? "" : "text-white hover:bg-white/10"
            }`}
            onClick={() => navigate("/auth")}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Entrar
          </Button>
          <Button
            size="sm"
            className={`transition-colors duration-300 ${
              scrolled
                ? "bg-[#1c102f] hover:bg-[#1c102f]/90 text-white"
                : "bg-white text-purple-950 hover:bg-white/90"
            }`}
            onClick={() => navigate("/onboarding?flow=trial")}
          >
            Teste Grátis
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className={scrolled ? "" : "text-white hover:bg-white/10"}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 pt-12">
            <nav className="flex flex-col gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <hr className="border-border" />
              <Button variant="outline" onClick={() => { setOpen(false); navigate("/auth"); }}>
                <LogIn className="mr-2 h-4 w-4" />
                Entrar
              </Button>
              <Button className="bg-[#1c102f] hover:bg-[#1c102f]/90 text-white" onClick={() => { setOpen(false); navigate("/onboarding?flow=trial"); }}>
                Teste Grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
