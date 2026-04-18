import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="py-14 lg:py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded-3xl p-12 lg:p-20 text-center overflow-hidden"
        >
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <h2
            className="text-white mb-4 relative z-10"
            style={{ fontSize: "clamp(22px, 4vw, 36px)", fontWeight: 800, lineHeight: 1.2 }}
          >
            Launch Your Digital Menu Today
          </h2>
          <p
            className="text-white/80 mb-8 max-w-lg mx-auto relative z-10"
            style={{ fontSize: 13, lineHeight: 1.7 }}
          >
            Join thousands of restaurants already using Ratolabs to delight their customers.
          </p>
          <a
            href="#pricing"
            className="relative z-10 inline-flex items-center gap-2 bg-white text-[#f97316] hover:bg-gray-50 px-8 py-4 rounded-2xl transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
            style={{ fontSize: 14, fontWeight: 700 }}
          >
            Get Started <ArrowRight size={18} />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
