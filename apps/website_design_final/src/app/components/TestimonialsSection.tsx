import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  {
    name: "Marco Rossi",
    role: "Owner, Trattoria Milano",
    image:
      "https://images.unsplash.com/photo-1759521296144-fe6f2d2dc769?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwb3duZXIlMjBjaGVmJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzczNjkxOTQ5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    quote:
      "Ratolabs completely transformed our dining experience. Customers love scanning the QR code and browsing our menu on their phones. We've cut printing costs by 80% and update dishes in real-time.",
    rating: 5,
  },
  {
    name: "Sarah Chen",
    role: "Manager, The Bloom Cafe",
    image:
      "https://images.unsplash.com/photo-1753351055062-55b6bc51bb4f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWZlJTIwb3duZXIlMjB3b21hbiUyMHNtaWxpbmclMjBwb3J0cmFpdHxlbnwxfHx8fDE3NzM3NjU4MTV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    quote:
      "The dashboard is incredibly intuitive. We set up our entire menu in under an hour. The analytics help us understand what's popular and adjust our offerings accordingly. A must-have for any cafe!",
    rating: 5,
  },
  {
    name: "David Laurent",
    role: "Chef & Owner, Bistro Parisien",
    image:
      "https://images.unsplash.com/photo-1635927555397-61831a832086?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiaXN0cm8lMjBtYW5hZ2VyJTIwbWFuJTIwcHJvZmVzc2lvbmFsJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzczNzY1ODE1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    quote:
      "We switched from paper menus to Ratolabs and never looked back. The personalized branding makes it feel like our own app. Our guests always compliment how modern and sleek the experience is.",
    rating: 5,
  },
  {
    name: "Elena Vasquez",
    role: "GM, Sol y Luna Kitchen",
    image:
      "https://images.unsplash.com/photo-1586447610613-58e59e3f9d9e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmZW1hbGUlMjByZXN0YXVyYW50JTIwbWFuYWdlciUyMHByb2Zlc3Npb25hbCUyMGhlYWRzaG90fGVufDF8fHx8MTc3Mzc2NTk2Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    quote:
      "Our staff spend less time explaining the menu and more time creating great experiences. The QR codes on each table are elegant, and the branded menu pages make us look incredibly professional.",
    rating: 5,
  },
  {
    name: "Kenji Tanaka",
    role: "Owner, Sakura Ramen House",
    image:
      "https://images.unsplash.com/photo-1740990620245-33a275e53d30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhc2lhbiUyMG1hbiUyMGNoZWYlMjByZXN0YXVyYW50JTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc3Mzc2NTk3M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    quote:
      "Ratolabs's analytics showed us our best-selling bowls and helped us optimize the menu. Setup took minutes, support is top-notch, and our customers love the seamless digital ordering flow.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((c) => (c === 0 ? testimonials.length - 1 : c - 1));
  }, []);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((c) => (c === testimonials.length - 1 ? 0 : c + 1));
  }, []);

  // Auto-play
  useEffect(() => {
    const timer = setInterval(next, 4500);
    return () => clearInterval(timer);
  }, [next]);

  const t = testimonials[current];

  return (
    <section className="py-16 bg-gray-50/60 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between mb-14 gap-6"
        >
          <div>
            <span
              className="inline-block px-4 py-1.5 rounded-full bg-orange-50 text-[#f97316] mb-4"
              style={{ fontSize: 11, fontWeight: 600 }}
            >
              Testimonials
            </span>
            <h2
              className="text-gray-900 mb-3"
              style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}
            >
              Loved by restaurant owners
            </h2>
            <p
              className="text-gray-500 max-w-xl"
              style={{ fontSize: 17, lineHeight: 1.7 }}
            >
              See why hundreds of restaurants trust Ratolabs to power their digital
              menu experience.
            </p>
          </div>

          {/* Nav arrows */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={prev}
              className="w-11 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:border-[#f97316] hover:text-[#f97316] transition-colors cursor-pointer"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="w-11 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:border-[#f97316] hover:text-[#f97316] transition-colors cursor-pointer"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Carousel */}
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -60 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="bg-white rounded-2xl p-8 md:p-10 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_30px_rgba(0,0,0,0.06)] border border-gray-100"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-5">
                {Array.from({ length: t.rating }).map((_, idx) => (
                  <Star
                    key={idx}
                    className="w-4 h-4 fill-[#f97316] text-[#f97316]"
                  />
                ))}
              </div>

              {/* Quote */}
              <p
                className="text-gray-600 mb-8"
                style={{ fontSize: 15, lineHeight: 1.8 }}
              >
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-5 border-t border-gray-100">
                <img
                  src={t.image}
                  alt={t.name}
                  className="w-11 h-11 rounded-full object-cover"
                />
                <div>
                  <p
                    className="text-gray-900"
                    style={{ fontSize: 14, fontWeight: 600 }}
                  >
                    {t.name}
                  </p>
                  <p className="text-gray-400" style={{ fontSize: 13 }}>
                    {t.role}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > current ? 1 : -1);
                  setCurrent(i);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-8 bg-[#f97316]"
                    : "w-1.5 bg-gray-200 hover:bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
