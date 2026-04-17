import { motion } from "motion/react";
import { Upload, Sparkles, QrCode } from "lucide-react";

const STEPS = [
  {
    icon: Upload,
    title: "Upload Your Menu",
    desc: "Simply upload your existing menu — PDF, photo, or typed. We handle the rest.",
    color: "bg-orange-50 text-[#f97316]",
  },
  {
    icon: Sparkles,
    title: "We Digitize It",
    desc: "Our AI converts your menu into a beautiful, browsable digital experience instantly.",
    color: "bg-purple-50 text-purple-500",
  },
  {
    icon: QrCode,
    title: "Go Live Instantly",
    desc: "Get a unique QR code for each table. Customers scan and order — no app needed.",
    color: "bg-green-50 text-green-500",
  },
];

export function HowItWorks() {
  return (
    <section id="about" className="py-14 lg:py-20 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span
              className="inline-block text-[#f97316] mb-3"
              style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              How it works
            </span>
            <h2 className="text-gray-900 mb-4" style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 800, lineHeight: 1.2 }}>
              Three steps to go digital
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto" style={{ fontSize: 13, lineHeight: 1.7 }}>
              No technical skills needed. Get your restaurant online in minutes.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-[72px] left-[16.5%] right-[16.5%] h-[2px] bg-gradient-to-r from-orange-200 via-purple-200 to-green-200" />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative bg-white rounded-2xl p-8 text-center group hover:shadow-xl hover:shadow-gray-100/80 transition-all duration-300 hover:-translate-y-1 border border-gray-100"
              >
                <div className={`w-16 h-16 rounded-2xl ${step.color} flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={28} />
                </div>
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-gray-400"
                  style={{ fontSize: 10, fontWeight: 700 }}
                >
                  {i + 1}
                </div>
                <h3 className="text-gray-900 mb-3" style={{ fontSize: 16, fontWeight: 700 }}>
                  {step.title}
                </h3>
                <p className="text-gray-500" style={{ fontSize: 13, lineHeight: 1.7 }}>
                  {step.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}