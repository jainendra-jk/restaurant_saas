import { Link } from "react-router";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { getEnterpriseSalesHref } from "../utils/routeTargets";

const PLANS = [
  {
    id: "starter" as const,
    name: "Starter",
    price: "$19",
    period: "/mo",
    desc: "Perfect for small restaurants getting started.",
    tables: "Up to 20 tables",
    features: [
      "Digital QR Menu",
      "Dashboard setup",
      "Basic analytics",
      "Email support",
      "1 location",
      "10MB menu PDF upload",
      "No domain needed",
      "Bill generation",
      "Receipt for kitchen",
    ],
    highlighted: false,
  },
  {
    id: "professional" as const,
    name: "Professional",
    price: "$49",
    period: "/mo",
    desc: "For growing restaurants that want more power.",
    tables: "10-50 tables",
    features: [
      "Everything in Starter",
      "Advanced analytics",
      "Priority support",
      "Custom branding",
      "Payment integration",
      "Up to 5 locations",
    ],
    highlighted: true,
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: null,
    period: "",
    desc: "Tailored solutions for large restaurant chains.",
    tables: "Unlimited tables",
    features: [
      "Everything in Professional",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "Unlimited locations",
      "Advanced reporting",
      "Embedding chatbots",
    ],
    highlighted: false,
    cta: "Contact Sales",
  },
];

export function PricingSection() {
  const enterpriseHref = getEnterpriseSalesHref();
  return (
    <section className="scroll-mt-24 py-14 lg:py-20 bg-gray-50/50 lg:scroll-mt-28" id="pricing">
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
              Simple pricing
            </span>
            <h2 className="text-gray-900 mb-4" style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 800, lineHeight: 1.2 }}>
              Plans that grow with you
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto" style={{ fontSize: 13, lineHeight: 1.7 }}>
              No hidden fees. Cancel anytime. Start free for 14 days.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className={`relative rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 ${
                plan.highlighted
                  ? "bg-gray-900 text-white shadow-2xl shadow-gray-900/20 ring-2 ring-[#f97316]"
                  : "bg-white border border-gray-200 hover:shadow-xl hover:shadow-gray-100/80"
              }`}
            >
              {plan.highlighted && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#f97316] text-white px-4 py-1 rounded-full"
                  style={{ fontSize: 12, fontWeight: 600 }}
                >
                  Most Popular
                </div>
              )}

              <div className="text-gray-400 mb-1" style={{ fontSize: 11, fontWeight: 500 }}>
                {plan.tables}
              </div>
              <div className="mb-1" style={{ fontSize: 14, fontWeight: 700 }}>
                {plan.name}
              </div>
              <div className={`mb-4 ${plan.highlighted ? "text-gray-400" : "text-gray-500"}`} style={{ fontSize: 12 }}>
                {plan.desc}
              </div>

              <div className="flex items-baseline gap-1 mb-6">
                {plan.price ? (
                  <>
                    <span style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>{plan.price}</span>
                    <span className="text-gray-400" style={{ fontSize: 14 }}>
                      {plan.period}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>Custom</span>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <Check size={18} className="text-[#f97316]" />
                    <span style={{ fontSize: 12 }}>{f}</span>
                  </li>
                ))}
              </ul>

              {plan.id === "enterprise" ? (
                <a
                  href={enterpriseHref}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center py-3.5 rounded-xl transition-all duration-200 bg-gray-100 hover:bg-gray-200 text-gray-900"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  {plan.cta || "Contact Sales"}
                </a>
              ) : (
                <Link
                  to={`/checkout?plan=${plan.id}`}
                  className={`block text-center py-3.5 rounded-xl transition-all duration-200 ${
                    plan.highlighted
                      ? "bg-[#f97316] hover:bg-[#ea580c] text-white hover:shadow-lg hover:shadow-orange-500/20"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                  }`}
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  Start Now
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}