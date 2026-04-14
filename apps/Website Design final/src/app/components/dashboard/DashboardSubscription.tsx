import { motion } from "motion/react";
import { Check, Zap, CreditCard, Calendar, ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { useWebsiteAuth } from "../../context/WebsiteAuthContext";
import { getEnterpriseSalesHref } from "../../utils/routeTargets";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "$19",
    period: "/mo",
    tables: "Up to 20 tables",
    desc: "Perfect for small restaurants getting started.",
    features: [
      "Digital QR Menu",
      "Dashboard setup",
      "Basic analytics",
      "Email support",
      "1 location",
      "Bill generation",
      "Receipt for kitchen",
    ],
    highlighted: false,
  },
  {
    id: "professional",
    name: "Professional",
    price: "$49",
    period: "/mo",
    tables: "Up to 50 tables",
    desc: "For growing restaurants that want more power.",
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
    id: "enterprise",
    name: "Enterprise",
    price: null,
    period: "",
    tables: "Unlimited tables",
    desc: "Tailored solutions for large restaurant chains.",
    features: [
      "Everything in Professional",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "Unlimited locations",
    ],
    highlighted: false,
    cta: "Contact Sales",
    external: true,
  },
];

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

export function DashboardSubscription() {
  const { entitlement, profileLoading } = useWebsiteAuth();
  const currentPlanId = entitlement?.plan_tier ?? null;

  if (profileLoading) {
    return <div className="max-w-4xl mx-auto text-gray-400 text-sm py-12">Loading…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-1" style={{ fontSize: 22, fontWeight: 800 }}>Subscription</h1>
        <p className="text-gray-400" style={{ fontSize: 13 }}>Manage your plan and billing.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[#f97316] to-[#ea580c] rounded-2xl p-6 lg:p-8 text-white mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={18} />
              <span style={{ fontSize: 11, fontWeight: 600 }} className="uppercase tracking-wider opacity-80">
                Current plan
              </span>
            </div>
            {entitlement ? (
              <>
                <div style={{ fontSize: 26, fontWeight: 800 }} className="capitalize">
                  {entitlement.plan_tier} plan
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2 opacity-80" style={{ fontSize: 12 }}>
                  <span className="flex items-center gap-1.5">
                    <CreditCard size={14} /> Max {entitlement.max_tables} tables
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} /> Updated {new Date(entitlement.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 26, fontWeight: 800 }}>No subscription</div>
                <div className="mt-2 opacity-80" style={{ fontSize: 12 }}>
                  Subscribe to unlock plan limits and billing features.
                </div>
              </>
            )}
          </div>
          {entitlement && (
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
              <div
                className={`w-2 h-2 rounded-full ${
                  entitlement.status === "active" || entitlement.status === "trialing"
                    ? "bg-green-400"
                    : "bg-amber-300"
                }`}
              />
              <span style={{ fontSize: 12, fontWeight: 600 }} className="capitalize">
                {formatStatus(entitlement.status)}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      <div className="mb-8">
        <h2 className="text-gray-900 mb-4" style={{ fontSize: 14, fontWeight: 700 }}>Available plans</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((plan, i) => {
            const isActive = plan.id === currentPlanId;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className={`relative rounded-2xl p-6 border-2 transition-all duration-200 ${
                  isActive ? "border-[#f97316] bg-orange-50/50" : plan.highlighted ? "border-gray-900 bg-gray-900 text-white" : "border-gray-100 bg-white hover:border-gray-200"
                }`}
              >
                {plan.highlighted && !isActive && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#f97316] text-white px-3 py-0.5 rounded-full"
                    style={{ fontSize: 10, fontWeight: 600 }}
                  >
                    Most popular
                  </span>
                )}
                {isActive && (
                  <span
                    className="inline-block bg-[#f97316] text-white px-3 py-0.5 rounded-full mb-3"
                    style={{ fontSize: 10, fontWeight: 600 }}
                  >
                    Current plan
                  </span>
                )}
                <div className={`mb-1 ${plan.highlighted && !isActive ? "text-gray-400" : "text-gray-400"}`} style={{ fontSize: 10, fontWeight: 500 }}>{plan.tables}</div>
                <div className={plan.highlighted && !isActive ? "text-white" : "text-gray-900"} style={{ fontSize: 16, fontWeight: 700 }}>{plan.name}</div>
                <div className={`mb-3 ${plan.highlighted && !isActive ? "text-gray-400" : "text-gray-500"}`} style={{ fontSize: 11 }}>{plan.desc}</div>
                <div className="flex items-baseline gap-1 my-3">
                  {plan.price ? (
                    <>
                      <span className={plan.highlighted && !isActive ? "text-white" : "text-gray-900"} style={{ fontSize: 32, fontWeight: 800 }}>{plan.price}</span>
                      <span className="text-gray-400" style={{ fontSize: 13 }}>{plan.period}</span>
                    </>
                  ) : (
                    <span className={plan.highlighted && !isActive ? "text-white" : "text-gray-900"} style={{ fontSize: 28, fontWeight: 800 }}>Custom</span>
                  )}
                </div>
                <ul className="space-y-2 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 ${plan.highlighted && !isActive ? "text-gray-300" : "text-gray-600"}`} style={{ fontSize: 12 }}>
                      <Check size={14} className="text-[#f97316] shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {"external" in plan && plan.external ? (
                  <a
                    href={getEnterpriseSalesHref()}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex w-full items-center justify-center gap-1 py-2.5 rounded-xl transition-all duration-200 bg-gray-900 hover:bg-gray-800 text-white`}
                    style={{ fontSize: 12, fontWeight: 600 }}
                  >
                    {plan.cta} <ArrowRight size={14} />
                  </a>
                ) : (
                  <Link
                    to={`/checkout?plan=${plan.id}`}
                    className={`flex w-full items-center justify-center py-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-gray-200 text-gray-500 cursor-default pointer-events-none"
                        : plan.highlighted
                          ? "bg-[#f97316] hover:bg-[#ea580c] text-white"
                          : "bg-gray-900 hover:bg-gray-800 text-white"
                    }`}
                    style={{ fontSize: 12, fontWeight: 600 }}
                    aria-disabled={isActive}
                  >
                    {isActive ? "Current plan" : "Subscribe"}
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-gray-100 p-6"
      >
        <h2 className="text-gray-900 mb-2" style={{ fontSize: 14, fontWeight: 700 }}>Billing history</h2>
        <p className="text-gray-500 text-sm mb-4">
          Invoice history is managed by your payment provider (Stripe or Razorpay). It is not stored in this app yet.
          Use the checkout flow to change plans; contact support for past invoices.
        </p>
        <a
          href="mailto:support@ratolabs.com?subject=Billing%20history%20request"
          className="inline-flex text-[#f97316] font-semibold text-sm hover:underline"
        >
          Email support@ratolabs.com
        </a>
      </motion.div>
    </div>
  );
}
