import { Link } from "react-router";

export function Footer() {
  return (
    <footer className="border-t border-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#f97316] flex items-center justify-center">
                <span className="text-white" style={{ fontSize: 16, fontWeight: 800 }}>Q</span>
              </div>
              <span style={{ fontSize: 18, fontWeight: 700 }} className="text-gray-900">
                QResto
              </span>
            </div>
            <p className="text-gray-400" style={{ fontSize: 12, lineHeight: 1.7 }}>
              The smartest way to run your restaurant's digital menu. QResto helps restaurants, cafes, and food trucks create beautiful QR code menus, streamline ordering, and delight guests — all without printing a single page.
            </p>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-gray-900 mb-4" style={{ fontSize: 12, fontWeight: 600 }}>Company</h4>
            <ul className="space-y-2.5">
              {[
                { label: "About", href: "/#about" },
                { label: "Careers", href: "#" },
                { label: "Contact", href: "mailto:support@ratolabs.com" },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-gray-400 hover:text-gray-600 transition-colors" style={{ fontSize: 12 }}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-gray-900 mb-4" style={{ fontSize: 12, fontWeight: 600 }}>Legal</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Privacy", href: "/privacy" },
                { label: "Terms", href: "/terms" },
                { label: "Security", href: "/security" },
              ].map((l) => (
                <li key={l.label}>
                  <Link to={l.href} className="text-gray-400 hover:text-gray-600 transition-colors" style={{ fontSize: 12 }}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-400" style={{ fontSize: 11 }}>
            &copy; 2026 QResto. All rights reserved.
          </p>
          <div className="flex gap-4">
            {/* Social icons as simple text links */}
            {["Twitter", "LinkedIn", "Instagram"].map((s) => (
              <a
                key={s}
                href="#"
                className="text-gray-300 hover:text-gray-500 transition-colors"
                style={{ fontSize: 11, fontWeight: 500 }}
              >
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}