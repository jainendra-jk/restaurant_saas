import { motion } from "motion/react";
import { ArrowRight, Play } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { HERO_ALT_IMAGE, HERO_PHONE_IMAGE } from "../assets/images";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-[120px] pb-16 lg:pt-[140px] lg:pb-24">
      {/* Background gradient + blur shapes */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-br from-orange-100 via-orange-50 to-transparent rounded-full blur-3xl opacity-70" />
        <div className="absolute top-32 right-0 w-[300px] h-[300px] bg-orange-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-10 w-[250px] h-[250px] bg-orange-100/40 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left – Text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-1.5 rounded-full mb-6">
              <span className="w-2 h-2 bg-[#f97316] rounded-full animate-pulse" />
              <span className="text-[#ea580c]" style={{ fontSize: 11, fontWeight: 600 }}>
                Now serving 200+ restaurants
              </span>
            </div>

            <h1
              className="text-gray-900 mb-6"
              style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 800, lineHeight: 1.1 }}
            >
              Your Restaurant.{" "}
              <span className="bg-gradient-to-r from-[#f97316] to-[#ea580c] bg-clip-text text-transparent">
                Smarter
              </span>{" "}
              with QR.
            </h1>

            <p className="text-gray-500 mb-8 max-w-lg" style={{ fontSize: 14, lineHeight: 1.7 }}>
              Turn your menu into a digital experience. Orders, analytics, and payments — all in one place.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#pricing"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#f97316] hover:bg-[#ea580c] text-white px-7 py-3.5 rounded-2xl transition-all duration-200 hover:shadow-xl hover:shadow-orange-200/50 hover:-translate-y-0.5"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                Get Started <ArrowRight size={18} />
              </a>
              <a
                href="#demo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:border-gray-300 px-7 py-3.5 rounded-2xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                <Play size={16} className="text-[#f97316]" /> See Demo
              </a>
            </div>

            {/* Mini stats */}
            <div className="flex gap-8 mt-10 pt-8 border-t border-gray-100">
              {[
                { value: "200+", label: "Restaurants" },
                { value: "50K+", label: "Orders Served" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-gray-900" style={{ fontSize: 20, fontWeight: 800 }}>{s.value}</div>
                  <div className="text-gray-400" style={{ fontSize: 11 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right – Phone mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative flex justify-center"
          >
            {/* Phone frame */}
            <div className="relative w-[280px] sm:w-[320px] rounded-[40px] overflow-hidden shadow-2xl shadow-orange-200/30 border-[8px] border-gray-900 bg-gray-900">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-gray-900 rounded-b-2xl z-10" />
              <ImageWithFallback
                src={HERO_PHONE_IMAGE}
                alt="QR Menu App"
                className="w-full aspect-[9/19.5] object-cover object-top"
              />
            </div>

            {/* Floating card – Menu preview */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-4 lg:-left-12 top-24 bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-4 w-[180px]"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <ImageWithFallback src={HERO_ALT_IMAGE} alt="Menu preview" className="w-full h-full object-cover rounded-lg" />
                </div>
                <div>
                  <div className="text-gray-900" style={{ fontSize: 10, fontWeight: 600 }}>Margherita Pizza</div>
                  <div className="text-gray-400" style={{ fontSize: 9 }}>$12.99</div>
                </div>
              </div>
              <div className="h-1.5 bg-orange-100 rounded-full w-full">
                <div className="h-1.5 bg-[#f97316] rounded-full w-3/4" />
              </div>
              <div className="text-gray-400 mt-1" style={{ fontSize: 9 }}>Popular item</div>
            </motion.div>

            {/* Floating card – Orders */}
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-4 lg:-right-8 bottom-32 bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-4 w-36 lg:w-40"
            >
              <div className="text-[#f97316]" style={{ fontSize: 9, fontWeight: 600 }}>Live Orders</div>
              <div className="text-gray-900 mt-1" style={{ fontSize: 18, fontWeight: 800 }}>+128</div>
              <div className="text-green-500" style={{ fontSize: 9, fontWeight: 500 }}>↑ 24% today</div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}