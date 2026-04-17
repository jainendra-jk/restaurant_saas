import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import ratolabsLogo from "../../assets/ratolabs_logo.svg";
import ratolabsWordmark from "../../assets/ratolabs_wordmark.svg";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { useWebsiteAuth } from "../context/WebsiteAuthContext";
import { toast } from "sonner";
import {
  resolveWebsitePostLoginPath,
  WEBSITE_DASHBOARD_PATH,
} from "../utils/accessRouting";

export function Navbar() {
  const navigate = useNavigate();
  const { session, openLogin, accessState } = useWebsiteAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const routeAuthenticatedUser = () => {
    if (accessState === "no_subscription") {
      toast("Buy a plan to unleash full potential", { closeButton: false });
      navigate("/#pricing");
      return;
    }
    navigate(resolveWebsitePostLoginPath(accessState, WEBSITE_DASHBOARD_PATH));
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#products", label: "Products" },
    { href: "#pricing", label: "Pricing" },
    { href: "#about", label: "About" },
  ];

  const spring = { type: "spring" as const, stiffness: 280, damping: 28 };

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 flex justify-center"
      animate={{ paddingTop: scrolled ? 8 : 0, paddingBottom: scrolled ? 0 : 0, paddingLeft: 16, paddingRight: 16 }}
      transition={spring}
    >
      <motion.div
        className="flex items-center justify-between"
        initial={{ maxWidth: 1280, borderRadius: 0 }}
        animate={{
          maxWidth: scrolled ? 800 : 1280,
          height: scrolled ? 52 : 72,
          backgroundColor: scrolled ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0)",
          borderRadius: scrolled ? 16 : 0,
          boxShadow: scrolled
            ? "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)"
            : "0 0 0 0 rgba(0,0,0,0)",
          backdropFilter: scrolled ? "blur(20px)" : "blur(0px)",
          paddingLeft: scrolled ? 20 : 32,
          paddingRight: scrolled ? 20 : 32,
        }}
        transition={spring}
        style={{ width: "100%" }}
      >
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 shrink-0">
          <img src={ratolabsLogo} alt="Ratolabs" width={32} height={32} />
          <img src={ratolabsWordmark} alt="" aria-hidden={true} height={14} />
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              style={{ fontSize: 13, fontWeight: 500 }}
            >
              {link.label}
            </a>
          ))}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (session ? routeAuthenticatedUser() : openLogin())}
              className="border border-gray-200 bg-white/80 text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-[#f97316] px-5 py-2.5 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]/40 focus-visible:ring-offset-2"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              Login
            </button>
            <a
              href="#pricing"
              className="bg-[#f97316] hover:bg-[#ea580c] text-white px-5 py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-orange-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]/50 focus-visible:ring-offset-2"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              Get Started
            </a>
          </div>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-gray-700"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </motion.div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute top-full left-4 right-4 md:hidden bg-white/95 backdrop-blur-xl border border-gray-200/60 rounded-2xl px-6 py-4 space-y-3 shadow-lg mt-2"
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block text-gray-700 py-2"
                style={{ fontSize: 13, fontWeight: 500 }}
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                if (session) routeAuthenticatedUser();
                else openLogin();
              }}
              className="block w-full border border-gray-200 bg-white text-gray-700 text-center py-3 rounded-xl hover:bg-gray-50 hover:border-[#f97316] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]/40 focus-visible:ring-offset-2"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              Login
            </button>
            <a
              href="#pricing"
              onClick={() => setMobileOpen(false)}
              className="block bg-[#f97316] text-white text-center py-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]/50 focus-visible:ring-offset-2"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              Get Started
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}