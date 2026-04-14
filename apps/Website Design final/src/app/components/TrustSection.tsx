import { motion } from "motion/react";

const POWERED_BY = [
  {
    name: "Vercel",
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-auto" fill="none">
        <path d="M12 1L24 22H0L12 1z" fill="#000"/>
      </svg>
    ),
  },
  {
    name: "Supabase",
    logo: (
      <svg viewBox="0 0 109 113" className="h-5 w-auto" fill="none">
        <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627H99.1935C108.074 40.0627 113.064 50.4197 107.559 57.2765L63.7076 110.284Z" fill="url(#supabase-a)"/>
        <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627H99.1935C108.074 40.0627 113.064 50.4197 107.559 57.2765L63.7076 110.284Z" fill="url(#supabase-b)" fillOpacity="0.2"/>
        <path d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.04075L54.4849 72.2922H9.83113C0.950506 72.2922 -4.03998 61.9352 1.46553 55.0784L45.317 2.07103Z" fill="#3ECF8E"/>
        <defs>
          <linearGradient id="supabase-a" x1="53.9738" y1="54.974" x2="94.1635" y2="71.8295" gradientUnits="userSpaceOnUse">
            <stop stopColor="#249361"/>
            <stop offset="1" stopColor="#3ECF8E"/>
          </linearGradient>
          <linearGradient id="supabase-b" x1="36.1558" y1="30.578" x2="54.4844" y2="65.0806" gradientUnits="userSpaceOnUse">
            <stop/>
            <stop offset="1" stopOpacity="0"/>
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    name: "Figma",
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-auto" fill="none">
        <path d="M8 24c2.21 0 4-1.79 4-4v-4H8c-2.21 0-4 1.79-4 4s1.79 4 4 4z" fill="#0ACF83"/>
        <path d="M4 12c0-2.21 1.79-4 4-4h4v8H8c-2.21 0-4 1.79-4 4z" fill="#A259FF"/>
        <path d="M4 4c0-2.21 1.79-4 4-4h4v8H8C5.79 8 4 6.21 4 4z" fill="#F24E1E"/>
        <path d="M12 0h4c2.21 0 4 1.79 4 4s-1.79 4-4 4h-4V0z" fill="#FF7262"/>
        <path d="M20 12c0 2.21-1.79 4-4 4s-4-1.79-4-4 1.79-4 4-4 4 1.79 4 4z" fill="#1ABCFE"/>
      </svg>
    ),
  },
];

export function TrustSection() {
  return (
    <section className="py-10 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-center gap-6">
          <p
            className="text-gray-400 shrink-0"
            style={{
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Powered by
          </p>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-10 lg:gap-14">
            {POWERED_BY.map((brand, i) => (
              <motion.div
                key={brand.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2.5 cursor-default"
              >
                {brand.logo}
                <span
                  className="hidden md:inline text-gray-400 hover:text-gray-600 transition-colors"
                  style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}
                >
                  {brand.name}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}