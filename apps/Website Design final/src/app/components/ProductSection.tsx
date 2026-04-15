import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UtensilsCrossed, BarChart3, Cake, ChevronLeft, ChevronRight, Sparkles, ArrowRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Link } from "react-router";
import { getWeddingPlateDashboardHref, isExternalHref } from "../utils/routeTargets";
import { PRODUCT_ANALYTICS_IMAGE, PRODUCT_QR_MENU_IMAGE, PRODUCT_WEDDING_IMAGE } from "../assets/images";

const PRODUCTS = [
  {
    id: "qr-menu",
    icon: UtensilsCrossed,
    badge: "Core Product",
    title: "Smart QR Menu Builder",
    desc: "Create beautiful, dynamic digital menus that update in real-time. Customers scan, browse, and order — no app download needed.",
    features: ["Real-time menu updates", "Multi-language support", "Dietary filters & allergen tags", "Mobile-optimized design"],
    image: PRODUCT_QR_MENU_IMAGE,
    color: "from-orange-500 to-orange-600",
    lightColor: "bg-orange-50 text-[#f97316]",
  },
  {
    id: "wedding-plate",
    icon: Cake,
    badge: "New",
    title: "Digital Wedding Plate Builder",
    desc: "Design stunning digital wedding menus and seating plates. Guests scan a QR code to view courses, dietary options, and RSVP selections.",
    features: ["Custom wedding themes", "Course-by-course preview", "Guest dietary preferences", "Shareable digital invites"],
    image: PRODUCT_WEDDING_IMAGE,
    color: "from-orange-500 to-orange-600",
    lightColor: "bg-orange-50 text-[#f97316]",
  },
  {
    id: "analytics",
    icon: BarChart3,
    badge: "Pro",
    title: "Advanced Analytics Suite",
    desc: "Understand your customers with deep insights. Track popular items, peak hours, revenue trends, and customer behavior in real-time.",
    features: ["Real-time order tracking", "Revenue trend reports", "Customer behavior insights", "Exportable data & charts"],
    image: PRODUCT_ANALYTICS_IMAGE,
    color: "from-orange-500 to-orange-600",
    lightColor: "bg-orange-50 text-[#f97316]",
  },
];

export function ProductSection() {
  const [active, setActive] = useState(0);
  const product = PRODUCTS[active];
  const weddingPlateHref = getWeddingPlateDashboardHref();
  const productHref = product.id === "wedding-plate" ? weddingPlateHref : "/dashboard";

  const prev = () => setActive((a) => (a === 0 ? PRODUCTS.length - 1 : a - 1));
  const next = () => setActive((a) => (a === PRODUCTS.length - 1 ? 0 : a + 1));

  return (
    <section className="py-14 lg:py-20" id="products">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span
              className="inline-block text-[#f97316] mb-3"
              style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              Our Products
            </span>
            <h2 className="text-gray-900 mb-4" style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 800, lineHeight: 1.2 }}>
              Digital tools that power your restaurant
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto" style={{ fontSize: 13, lineHeight: 1.7 }}>
              From smart menus to interactive wedding plate builders — explore the suite of products built to modernize hospitality.
            </p>
          </motion.div>
        </div>

        {/* Product Tabs */}
        <div className="flex items-center justify-center gap-2 mb-10 overflow-x-auto pb-2">
          {PRODUCTS.map((p, i) => {
            const Icon = p.icon;
            const isActive = i === active;
            return (
              <button
                key={p.id}
                onClick={() => setActive(i)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all duration-300 ${
                  isActive
                    ? "bg-gray-900 text-white shadow-lg shadow-gray-900/10"
                    : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
                style={{ fontSize: 12, fontWeight: 600 }}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{p.title.split(" ").slice(0, 2).join(" ")}</span>
              </button>
            );
          })}
        </div>

        {/* Product Showcase */}
        <AnimatePresence mode="wait">
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center"
          >
            {/* Left – Image */}
            <div className="relative group">
              {/* Soft gradient backdrop */}
              <div className="absolute -inset-4 bg-gradient-to-br from-orange-100/80 via-orange-50/40 to-transparent rounded-3xl blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
              <div className="absolute -inset-2 bg-gradient-to-br from-orange-200/20 to-transparent rounded-3xl" />

              {/* Main image */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-orange-900/10 ring-1 ring-white/60">
                <ImageWithFallback
                  src={product.image}
                  alt={product.title}
                  className="w-full aspect-[16/10] object-cover"
                />
                {/* Subtle overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/5 pointer-events-none" />
              </div>

              {/* Floating badge */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-lg shadow-gray-200/50 px-4 py-3 flex items-center gap-2"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${product.lightColor}`}>
                  <Sparkles size={16} />
                </div>
                <div>
                  <div className="text-gray-900" style={{ fontSize: 11, fontWeight: 700 }}>{product.badge}</div>
                  <div className="text-gray-400" style={{ fontSize: 10 }}>Ratolabs Product</div>
                </div>
              </motion.div>
            </div>

            {/* Right – Info */}
            <div>
              <h3 className="text-gray-900 mb-3" style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 800, lineHeight: 1.2 }}>
                {product.title}
              </h3>
              <p className="text-gray-500 mb-6" style={{ fontSize: 13, lineHeight: 1.7 }}>
                {product.desc}
              </p>

              <ul className="space-y-3 mb-8">
                {product.features.map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${product.lightColor}`}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-gray-600" style={{ fontSize: 13 }}>{f}</span>
                  </li>
                ))}
              </ul>

              {product.id === "wedding-plate" ? (
                <a
                  href={productHref}
                  target={isExternalHref(productHref) ? "_self" : undefined}
                  rel={isExternalHref(productHref) ? "noreferrer" : undefined}
                  className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  Try {product.title.split(" ")[0]} {product.title.split(" ")[1]} <ArrowRight size={16} />
                </a>
              ) : (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  Try {product.title.split(" ")[0]} {product.title.split(" ")[1]} <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows */}
        <div className="flex items-center justify-center gap-4 mt-10">
          <button
            onClick={prev}
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:border-gray-300 transition-all duration-200"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex gap-2">
            {PRODUCTS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === active ? "w-8 bg-[#f97316]" : "w-1.5 bg-gray-200 hover:bg-gray-300"
                }`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:border-gray-300 transition-all duration-200"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}