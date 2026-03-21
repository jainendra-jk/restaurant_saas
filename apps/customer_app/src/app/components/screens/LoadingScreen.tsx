import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { useMenu } from "../../context/MenuContext";
import * as typography from "../../theme/typography";

export function LoadingScreen() {
  const navigate = useNavigate();
  const params = useParams<{ slug?: string; tableNum?: string; restaurantSlug?: string; tableNumber?: string }>();
  const { branding } = useMenu();
  const [phase, setPhase] = useState(0);
  const base =
    params.slug && params.tableNum
      ? `/r/${params.slug}/t/${params.tableNum}`
      : params.restaurantSlug && params.tableNumber
        ? `/order/${params.restaurantSlug}/table/${params.tableNumber}`
        : "";

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 3000),
      setTimeout(() => navigate(`${base}/menu`, { replace: true }), 3800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [navigate, base]);

  const isExiting = phase >= 4;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 sm:px-8 relative overflow-hidden">
      {/* Full-screen overlay that fades in during exit */}
      <motion.div
        className="absolute inset-0 bg-background z-30 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isExiting ? 1 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      />

      {/* Botanical background decorations */}
      <motion.svg
        viewBox="0 0 200 200"
        className="absolute top-8 right-[-20px] w-40 h-40 opacity-[0.06]"
        fill="none"
        stroke="#6B7F5E"
        strokeWidth="0.8"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: isExiting ? 0 : 0.06,
          scale: isExiting ? 0.6 : 1,
        }}
        transition={{ duration: isExiting ? 0.4 : 1.5, delay: isExiting ? 0 : 0.5 }}
      >
        <path d="M100 180 C100 180 100 100 100 50 Q100 20 70 35 Q40 50 100 100" />
        <path d="M100 180 C100 180 100 100 100 50 Q100 20 130 35 Q160 50 100 100" />
        <path d="M100 130 Q70 100 55 115 Q45 130 100 130" />
        <path d="M100 130 Q130 100 145 115 Q155 130 100 130" />
      </motion.svg>

      <motion.svg
        viewBox="0 0 200 200"
        className="absolute bottom-16 left-[-20px] w-36 h-36 opacity-[0.06]"
        fill="none"
        stroke="#6B7F5E"
        strokeWidth="0.8"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: isExiting ? 0 : 0.06,
          scale: isExiting ? 0.6 : 1,
        }}
        transition={{ duration: isExiting ? 0.4 : 1.5, delay: isExiting ? 0 : 0.8 }}
      >
        <path d="M100 170 Q80 120 60 100 Q40 80 80 90 Q100 95 100 170" />
        <path d="M100 170 Q120 120 140 100 Q160 80 120 90 Q100 95 100 170" />
      </motion.svg>

      {/* Arch frame — scales up to fill viewport on exit */}
      <motion.div
        className="relative w-64 h-80 flex flex-col items-center justify-center z-20"
        animate={{
          scale: isExiting ? 3.5 : 1,
          opacity: isExiting ? 0 : 1,
        }}
        transition={{
          scale: {
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1], // smooth ease-out
          },
          opacity: {
            duration: 0.5,
            delay: 0.2,
            ease: "easeOut",
          },
        }}
      >
        <motion.svg
          viewBox="0 0 240 300"
          className="absolute inset-0 w-full h-full"
          fill="none"
        >
          <motion.path
            d="M20 300 L20 60 Q20 20 60 20 L180 20 Q220 20 220 60 L220 300"
            stroke="#8B9E7C"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: 1,
              opacity: isExiting ? 0.15 : 0.6,
            }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
        </motion.svg>

        {/* Botanical leaf growing */}
        <AnimatePresence>
          {phase >= 1 && !isExiting && (
            <motion.svg
              viewBox="0 0 80 80"
              className="absolute top-8 right-6 w-12 h-12"
              fill="none"
              stroke="#8B9E7C"
              strokeWidth="1"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 0.4, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.3 } }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <path d="M40 70 Q30 40 15 30 Q5 25 20 40 Q30 50 40 70" />
              <path d="M40 70 Q50 40 65 30 Q75 25 60 40 Q50 50 40 70" />
              <path d="M40 70 L40 30" />
            </motion.svg>
          )}
        </AnimatePresence>

        {/* Logo text — inside arch with breathing space */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center z-10 px-8 py-6 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: isExiting ? 0 : 1, y: isExiting ? -10 : 0 }}
              transition={{ duration: isExiting ? 0.3 : 0.8, ease: "easeOut" }}
            >
              <h1
                className="tracking-[0.3em] text-foreground/90 mb-2"
                style={typography.title2xl}
              >
                {branding.restaurantName}
              </h1>
              <div
                className="w-12 h-[1px] mx-auto mb-3"
                style={{ background: "var(--primary)" }}
              />
              <p
                className="text-muted-foreground/80 tracking-[0.15em] uppercase"
                style={typography.bodySm}
              >
                {branding.tagline}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Welcome text */}
      <AnimatePresence>
        {phase >= 3 && !isExiting && (
          <motion.div
            className="mt-12 text-center z-10"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.3 } }}
            transition={{ duration: 0.6 }}
          >
            <p
              className="text-foreground/70 mb-2"
              style={typography.titleSm}
            >
              {branding.welcomeMessage}
            </p>
            <p
              className="text-muted-foreground/60"
              style={typography.bodyMd2}
            >
              {branding.preparingMessage}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading dots — fade out during exit */}
      <motion.div
        className="mt-8 flex gap-2 z-10"
        animate={{ opacity: isExiting ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary/40"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
