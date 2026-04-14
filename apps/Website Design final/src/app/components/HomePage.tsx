import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { Navbar } from "./Navbar";
import { HeroSection } from "./HeroSection";
import { TrustSection } from "./TrustSection";
import { HowItWorks } from "./HowItWorks";
import { ProductSection } from "./ProductSection";
import { PricingSection } from "./PricingSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { CtaSection } from "./CtaSection";
import { Footer } from "./Footer";
import { useWebsiteAuth } from "../context/WebsiteAuthContext";

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { session, setLoginOpen, setPostLoginRedirect } = useWebsiteAuth();

  useEffect(() => {
    if (searchParams.get("login") !== "1" || session) return;
    const redirect = searchParams.get("redirect");
    if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
      setPostLoginRedirect(redirect);
    } else {
      setPostLoginRedirect(null);
    }
    setLoginOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("login");
    next.delete("redirect");
    setSearchParams(next, { replace: true });
  }, [searchParams, session, setLoginOpen, setPostLoginRedirect, setSearchParams]);

  return (
    <div
      className="min-h-screen bg-white overflow-x-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <Navbar />
      <HeroSection />
      <TrustSection />
      <HowItWorks />
      <ProductSection />
      <PricingSection />
      <TestimonialsSection />
      <CtaSection />
      <Footer />
    </div>
  );
}