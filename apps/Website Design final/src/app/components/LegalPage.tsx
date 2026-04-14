import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import { useEffect } from "react";

function PageWrapper({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-20">
        <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 text-gray-400 hover:text-[#f97316] transition-colors mb-10 cursor-pointer" style={{ fontSize: 13, fontWeight: 500 }}>
          <ArrowLeft size={16} /> Back to home
        </button>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-gray-900 mb-3" style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2 }}>{title}</h1>
          <p className="text-gray-400 mb-12" style={{ fontSize: 13 }}>{subtitle}</p>
          <div className="space-y-10">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-gray-900 mb-3" style={{ fontSize: 18, fontWeight: 700 }}>{heading}</h2>
      <div className="text-gray-500 space-y-3" style={{ fontSize: 14, lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <PageWrapper title="Privacy Policy" subtitle="Last updated: March 17, 2026">
      <Section heading="Introduction">
        <p>At QResto, we take your privacy seriously. This policy describes how we collect, use, and protect your personal information when you use our QR menu platform for restaurants.</p>
      </Section>
      <Section heading="Information We Collect">
        <p>We collect information you provide directly, such as your name, email address, restaurant details, and menu content when you create an account and set up your digital menu.</p>
        <p>We also automatically collect usage data including device information, browser type, IP address, and interaction patterns with our platform to improve our services.</p>
      </Section>
      <Section heading="How We Use Your Information">
        <p>Your information is used to provide and maintain our QR menu services, process payments, send important service updates, and improve the platform experience for restaurant owners and their guests.</p>
        <p>We do not sell your personal data to third parties. Restaurant guest scanning data is anonymized and used solely for analytics dashboards visible to restaurant owners.</p>
      </Section>
      <Section heading="Data Storage & Retention">
        <p>All data is stored on encrypted servers hosted within the EU and US regions. Menu data and account information are retained for the duration of your subscription and up to 90 days after account closure.</p>
      </Section>
      <Section heading="Cookies & Tracking">
        <p>We use essential cookies for authentication and session management. Optional analytics cookies help us understand platform usage. You can manage cookie preferences through your browser settings at any time.</p>
      </Section>
      <Section heading="Your Rights">
        <p>You have the right to access, correct, export, or delete your personal data at any time. Restaurant owners can manage all data directly from the QResto dashboard or by contacting our support team at support@ratolabs.com.</p>
      </Section>
      <Section heading="Contact">
        <p>
          For any privacy-related questions, contact us at{' '}
          <a href="mailto:support@ratolabs.com" className="text-[#f97316] hover:underline">support@ratolabs.com</a>.
        </p>
      </Section>
    </PageWrapper>
  );
}

export function TermsPage() {
  return (
    <PageWrapper title="Terms of Service" subtitle="Last updated: March 17, 2026">
      <Section heading="Agreement to Terms">
        <p>By accessing or using QResto's platform, you agree to be bound by these Terms of Service. If you are using QResto on behalf of a restaurant or business, you represent that you have authority to bind that entity to these terms.</p>
      </Section>
      <Section heading="Service Description">
        <p>QResto provides a cloud-based digital menu platform that allows restaurants, cafes, and food establishments to create, customize, and deploy QR code-based menus accessible by their guests via mobile devices.</p>
      </Section>
      <Section heading="Account Responsibilities">
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must provide accurate restaurant and business information during registration.</p>
        <p>Menu content uploaded to QResto must comply with applicable food labeling laws and regulations in your jurisdiction, including allergen disclosures where required.</p>
      </Section>
      <Section heading="Subscription & Billing">
        <p>QResto offers monthly subscription plans. Charges are billed at the beginning of each billing cycle. You may cancel at any time; access continues until the end of the current billing period. Refunds are handled on a case-by-case basis.</p>
      </Section>
      <Section heading="Acceptable Use">
        <p>You agree not to misuse the platform, including uploading misleading menu information, attempting to reverse-engineer the service, or using QResto for any unlawful purpose. We reserve the right to suspend accounts that violate these terms.</p>
      </Section>
      <Section heading="Intellectual Property">
        <p>QResto retains ownership of the platform, branding, and technology. You retain full ownership of your menu content, images, and restaurant branding uploaded to the platform.</p>
      </Section>
      <Section heading="Limitation of Liability">
        <p>QResto is provided "as is." We strive for 99.9% uptime but do not guarantee uninterrupted service. QResto shall not be liable for indirect, incidental, or consequential damages arising from use of the platform.</p>
      </Section>
      <Section heading="Changes to Terms">
        <p>We may update these terms from time to time. Significant changes will be communicated via email or in-app notification at least 30 days before taking effect.</p>
      </Section>
      <Section heading="Contact">
        <p>
          Questions about these terms? Email{' '}
          <a href="mailto:support@ratolabs.com" className="text-[#f97316] hover:underline">support@ratolabs.com</a>.
        </p>
      </Section>
    </PageWrapper>
  );
}

export function SecurityPage() {
  return (
    <PageWrapper title="Security" subtitle="How we protect your restaurant data">
      <Section heading="Our Commitment">
        <p>Security is foundational to QResto. We understand that restaurant owners trust us with their business data, menu content, and customer interactions. We take that responsibility seriously with enterprise-grade protections.</p>
      </Section>
      <Section heading="Encryption">
        <p>All data transmitted between your browser and QResto is encrypted using TLS 1.3. Data at rest is encrypted using AES-256 encryption across all our storage systems, including database records, file uploads, and backups.</p>
      </Section>
      <Section heading="Infrastructure">
        <p>QResto runs on SOC 2 Type II certified cloud infrastructure with automatic failover, redundant backups, and real-time monitoring. Our servers are distributed across multiple geographic regions to ensure reliability and low-latency menu loading for your guests.</p>
      </Section>
      <Section heading="Authentication & Access Control">
        <p>We support two-factor authentication (2FA) for all accounts. Role-based access control lets restaurant owners manage team permissions — granting staff, managers, and owners different levels of dashboard access.</p>
      </Section>
      <Section heading="Regular Audits">
        <p>We conduct quarterly security audits and annual penetration testing through independent third-party firms. Vulnerabilities are triaged and patched following industry-standard disclosure timelines.</p>
      </Section>
      <Section heading="Incident Response">
        <p>In the unlikely event of a security incident, our dedicated response team follows a structured protocol to contain, investigate, and remediate. Affected customers are notified within 72 hours in compliance with applicable data protection regulations.</p>
      </Section>
      <Section heading="Bug Bounty">
        <p>
          We welcome responsible security researchers. If you discover a vulnerability, please report it to{' '}
          <a href="mailto:support@ratolabs.com" className="text-[#f97316] hover:underline">support@ratolabs.com</a>.
          We offer recognition and rewards for valid reports.
        </p>
      </Section>
    </PageWrapper>
  );
}