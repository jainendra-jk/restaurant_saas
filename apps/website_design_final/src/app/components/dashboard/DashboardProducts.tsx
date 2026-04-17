import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, ShoppingCart, Check, Star, ArrowRight, Package } from "lucide-react";
import { Link } from "react-router";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { useWebsiteAuth } from "../../context/WebsiteAuthContext";
import { useRestaurantDashboard } from "../../context/RestaurantDashboardContext";
import { getWeddingPlateDashboardHref } from "../../utils/routeTargets";

interface DigitalProduct {
  id: string;
  name: string;
  category: string;
  price: string;
  image: string;
  description: string;
  rating: number;
  reviews: number;
  features: string[];
  popular?: boolean;
  checkoutPlan?: "starter" | "professional";
  externalHref?: string;
}

const websitePlanPrice =
  typeof import.meta.env.VITE_WEBSITE_PLAN_PRICE === "string" && import.meta.env.VITE_WEBSITE_PLAN_PRICE.trim()
    ? import.meta.env.VITE_WEBSITE_PLAN_PRICE.trim()
    : "$19";

const DIGITAL_PRODUCTS: DigitalProduct[] = [
  {
    id: "website-plan",
    name: "Website plan — Starter",
    category: "Plans",
    price: websitePlanPrice,
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop",
    description:
      "Full QResto website and subscription access: QR menu, dashboard setup, and core restaurant tools.",
    rating: 4.9,
    reviews: 324,
    features: ["Digital QR menu", "Dashboard setup", "Billing & plans"],
    popular: true,
    checkoutPlan: "starter",
  },
  {
    id: "website-plan-professional",
    name: "Website plan — Professional",
    category: "Plans",
    price: "$49",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
    description:
      "Advanced restaurant growth plan with deeper analytics, priority support, and higher table limits.",
    rating: 4.9,
    reviews: 211,
    features: ["Advanced analytics", "Priority support", "Up to 50 tables"],
    checkoutPlan: "professional",
  },
  {
    id: "wedding-plate",
    name: "Digital Wedding Plate Builder",
    category: "Event Tools",
    price: "$39",
    image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&h=900&fit=crop&auto=format",
    description: "Design elegant digital wedding plates and invitations with customizable templates.",
    rating: 4.8,
    reviews: 186,
    features: ["Visual plate builder", "Guest estimator", "Share with catering"],
    externalHref: getWeddingPlateDashboardHref(),
  },
];

const CATEGORIES = ["All", "Plans", "Event Tools"];

function formatMoney(amount: number, currency: string) {
  const n = Number.isFinite(amount) ? amount : 0;
  if (currency === "USD" || currency === "$") {
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function DashboardProducts() {
  const { primaryRestaurant, entitlement, profileLoading } = useWebsiteAuth();
  const { stats, loading: dataLoading, error } = useRestaurantDashboard();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showDetail, setShowDetail] = useState<DigitalProduct | null>(null);

  const currency = primaryRestaurant?.currency ?? "Rs";

  const subscriptionActive =
    !!entitlement && (entitlement.status === "active" || entitlement.status === "trialing");

  const filtered = useMemo(() => {
    return DIGITAL_PRODUCTS.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "All" || p.category === category;
      return matchSearch && matchCat;
    });
  }, [search, category]);

  const isOwned = (product: DigitalProduct) => {
    if (product.checkoutPlan === "starter") {
      return subscriptionActive && entitlement?.plan_tier === "starter";
    }
    if (product.checkoutPlan === "professional") {
      return subscriptionActive && entitlement?.plan_tier === "professional";
    }
    return false;
  };

  if (profileLoading) {
    return <div className="max-w-6xl mx-auto text-gray-400 text-sm py-12">Loading…</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-gray-900 mb-1" style={{ fontSize: 22, fontWeight: 800 }}>Products</h1>
          <p className="text-gray-400" style={{ fontSize: 13 }}>
            Digital products and plans for your business.
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-5 sm:p-6 text-white mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-1">Total revenue (your restaurant)</p>
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {primaryRestaurant && stats
                ? formatMoney(stats.revenueTotal, currency)
                : "—"}
            </p>
            <p className="text-white/60 text-xs mt-2 max-w-md">
              {primaryRestaurant
                ? "Sum of all order totals from your linked restaurant. Updates live with new orders."
                : "Complete onboarding and link a restaurant to see revenue from orders in the database."}
            </p>
          </div>
          {dataLoading && primaryRestaurant && (
            <span className="text-white/50 text-xs">Refreshing…</span>
          )}
        </div>
        {error && <p className="text-amber-200 text-xs mt-3">{error}</p>}
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
            style={{ fontSize: 13 }}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all duration-200 ${
                category === cat
                  ? "bg-[#f97316] text-white"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
              style={{ fontSize: 12, fontWeight: 500 }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((product, i) => {
            const owned = isOwned(product);
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:shadow-gray-100/80 transition-all duration-300 group cursor-pointer"
                onClick={() => setShowDetail(product)}
              >
                <div className="relative h-40 overflow-hidden">
                  <ImageWithFallback
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {product.popular && (
                    <div
                      className="absolute top-3 left-3 bg-[#f97316] text-white px-2.5 py-0.5 rounded-full"
                      style={{ fontSize: 10, fontWeight: 600 }}
                    >
                      Popular
                    </div>
                  )}
                  {owned && (
                    <div
                      className="absolute top-3 right-3 bg-green-500 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1"
                      style={{ fontSize: 10, fontWeight: 600 }}
                    >
                      <Check size={12} /> Active
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="mb-1 text-gray-400" style={{ fontSize: 11, fontWeight: 500 }}>
                    {product.reviews} users
                  </div>
                  <div className="text-gray-900 mb-1" style={{ fontSize: 14, fontWeight: 600 }}>
                    {product.name}
                  </div>
                  <div className="text-gray-400 mb-3" style={{ fontSize: 11 }}>
                    {product.category}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#f97316]" style={{ fontSize: 18, fontWeight: 800 }}>
                      {product.price}
                    </span>
                    {product.externalHref ? (
                      <a
                        href={product.externalHref}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white hover:shadow-lg hover:shadow-orange-200 transition-all duration-200"
                        style={{ fontSize: 12, fontWeight: 600 }}
                      >
                        Open <ArrowRight size={14} />
                      </a>
                    ) : product.checkoutPlan && !owned ? (
                      <Link
                        to={`/checkout?plan=${product.checkoutPlan}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white hover:shadow-lg hover:shadow-orange-200 transition-all duration-200"
                        style={{ fontSize: 12, fontWeight: 600 }}
                      >
                        <ShoppingCart size={14} /> Subscribe
                      </Link>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-50 text-green-600"
                        style={{ fontSize: 12, fontWeight: 600 }}
                      >
                        <Check size={14} /> Subscribed
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Package size={40} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400" style={{ fontSize: 14, fontWeight: 500 }}>
            No products found
          </p>
        </div>
      )}

      <AnimatePresence>
        {showDetail && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
              onClick={() => setShowDetail(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="h-48 overflow-hidden">
                <ImageWithFallback
                  src={showDetail.image}
                  alt={showDetail.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[#f97316] bg-orange-50 px-2 py-0.5 rounded-full"
                    style={{ fontSize: 10, fontWeight: 600 }}
                  >
                    {showDetail.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-[#f97316] fill-[#f97316]" />
                    <span className="text-gray-600" style={{ fontSize: 11 }}>
                      {showDetail.rating} ({showDetail.reviews} reviews)
                    </span>
                  </div>
                </div>
                <h3 className="text-gray-900 mb-2" style={{ fontSize: 18, fontWeight: 700 }}>
                  {showDetail.name}
                </h3>
                <p className="text-gray-500 mb-4" style={{ fontSize: 13, lineHeight: 1.6 }}>
                  {showDetail.description}
                </p>
                <div className="mb-5">
                  <div className="text-gray-900 mb-2" style={{ fontSize: 12, fontWeight: 600 }}>
                    Key features
                  </div>
                  <ul className="space-y-1.5">
                    {showDetail.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-gray-600" style={{ fontSize: 12 }}>
                        <Check size={14} className="text-[#f97316]" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-[#f97316]" style={{ fontSize: 28, fontWeight: 800 }}>
                    {showDetail.price}
                  </span>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowDetail(null)}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      style={{ fontSize: 13, fontWeight: 600 }}
                    >
                      Close
                    </button>
                    {showDetail.externalHref ? (
                      <a
                        href={showDetail.externalHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white"
                        style={{ fontSize: 13, fontWeight: 600 }}
                      >
                        Open builder <ArrowRight size={16} />
                      </a>
                    ) : showDetail.checkoutPlan && !isOwned(showDetail) ? (
                      <Link
                        to={`/checkout?plan=${showDetail.checkoutPlan}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white"
                        style={{ fontSize: 13, fontWeight: 600 }}
                      >
                        <ShoppingCart size={16} /> Subscribe
                      </Link>
                    ) : (
                      <span
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-50 text-green-600"
                        style={{ fontSize: 13, fontWeight: 600 }}
                      >
                        <Check size={16} /> Subscribed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
