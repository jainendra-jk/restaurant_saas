import { useEffect } from "react";
import { motion } from "motion/react";
import { Rocket } from "lucide-react";
import confetti from "canvas-confetti";

const DEFAULT_ADMIN_URL = "http://localhost:5174";

export function SuccessScreen({
  adminDashboardUrl,
  footnote,
}: {
  adminDashboardUrl?: string;
  footnote?: string | null;
}) {
  const url = (adminDashboardUrl || DEFAULT_ADMIN_URL).trim();
  const loginUrl = `${url.replace(/\/+$/, '')}/login`;
  useEffect(() => {
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#f97316", "#fb923c", "#fdba74", "#fed7aa"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#f97316", "#fb923c", "#fdba74", "#fed7aa"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="w-full flex flex-col items-center text-center py-8"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ backgroundColor: "rgba(249, 115, 22, 0.1)" }}
      >
        <Rocket className="w-10 h-10" style={{ color: "#f97316" }} />
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-gray-900 mb-2"
      >
        Your Restaurant is Ready
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-gray-400 mb-8"
      >
        Everything is set up. Let's start serving!
      </motion.p>

      <motion.a
        href={loginUrl}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-4 rounded-xl text-white cursor-pointer flex items-center justify-center"
        style={{ backgroundColor: "#f97316" }}
      >
        Go to Login
      </motion.a>

      {footnote ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
          className="text-xs text-amber-800/90 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-4 text-left w-full"
        >
          {footnote}
        </motion.p>
      ) : null}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-xs text-gray-400 mt-4"
      >
        You can always update your settings later
      </motion.p>
    </motion.div>
  );
}
