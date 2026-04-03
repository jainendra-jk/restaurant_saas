import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Store, Bell, Palette, Shield, HelpCircle, CreditCard, GraduationCap } from 'lucide-react';
import { ProfileSlider } from '../components/ProfileSlider';
import { NotificationsSlider } from '../components/NotificationsSlider';
import { AppearanceSlider } from '../components/AppearanceSlider';
import { SecuritySlider } from '../components/SecuritySlider';
import { HelpSupportSlider } from '../components/HelpSupportSlider';
import { TutorialsSlider } from '../components/TutorialsSlider';
import { PaymentsSlider } from '../components/PaymentsSlider';
import { PageHeader } from '../components/ui/PageHeader';
import { SliderLayout } from '../components/ui/SliderLayout';

const sliderComponents: Record<string, React.ComponentType<{ onClose: () => void }>> = {
  profile: ProfileSlider,
  notifications: NotificationsSlider,
  appearance: AppearanceSlider,
  security: SecuritySlider,
  help: HelpSupportSlider,
  tutorials: TutorialsSlider,
  payments: PaymentsSlider,
};

const settingsSections = [
  {
    id: 'profile',
    icon: Store,
    title: 'Restaurant Profile',
    description: 'Update your restaurant name, address, and contact details',
    color: 'bg-primary/10 text-primary',
  },
  {
    id: 'notifications',
    icon: Bell,
    title: 'Notifications',
    description: 'Configure order alerts, sound notifications, and email updates',
    color: 'bg-[var(--notif-order-bg)] text-[var(--notif-order-text)]',
  },
  {
    id: 'payments',
    icon: CreditCard,
    title: 'Payments',
    description: 'Merchant ID, UPI details, settlement, and payment methods',
    color: 'bg-primary/10 text-primary',
  },
  {
    id: 'appearance',
    icon: Palette,
    title: 'Appearance',
    description: 'Theme, colors, and display preferences for your dashboard',
    color: 'bg-[var(--stat-peak-light)] text-[var(--stat-peak)]',
  },
  {
    id: 'security',
    icon: Shield,
    title: 'Security',
    description: 'Password, two-factor authentication, and access control',
    color: 'bg-status-preparing-light text-status-preparing',
  },
  {
    id: 'help',
    icon: HelpCircle,
    title: 'Help & Support',
    description: 'FAQs, documentation, and contact support team',
    color: 'bg-gray-100 text-gray-600',
  },
  {
    id: 'tutorials',
    icon: GraduationCap,
    title: 'Tutorials',
    description: 'Interactive step-by-step guides to master your dashboard',
    color: 'bg-primary/10 text-primary',
  },
];

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSlider, setActiveSlider] = useState<string | null>(null);
  const isSliderOpen = activeSlider !== null;
  const ActiveSliderComponent = activeSlider ? sliderComponents[activeSlider] : null;

  // Open payments slider when navigating from Dashboard or shop-toggle modal (?open=payments)
  useEffect(() => {
    const open = searchParams.get('open');
    if (open === 'payments') {
      setActiveSlider('payments');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleCardClick = (id: string) => {
    setActiveSlider((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Manage your restaurant dashboard preferences" />

      <SliderLayout
        isOpen={isSliderOpen}
        tabletOverlay
        onOverlayClose={() => setActiveSlider(null)}
        gridColsClosed="grid-cols-2 lg:grid-cols-3"
        gridColsOpen="grid-cols-2"
        sliderWidth={380}
        sliderHeight="calc(100vh - 180px)"
        stickyTop="top-0"
        sliderContent={
          ActiveSliderComponent ? (
            <ActiveSliderComponent onClose={() => setActiveSlider(null)} />
          ) : null
        }
      >
        {settingsSections.map((section) => (
          <button
            key={section.id}
            onClick={() => handleCardClick(section.id)}
            className={`bg-white rounded-xl border shadow-sm p-4 text-left hover:shadow-md transition-all cursor-pointer group ${
              activeSlider === section.id
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-gray-100'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${section.color}`}>
              <section.icon className="w-4 h-4" />
            </div>
            <h4 className="text-gray-900 group-hover:text-primary transition-colors">{section.title}</h4>
            <p className="text-xs text-gray-400 mt-1">{section.description}</p>
          </button>
        ))}
      </SliderLayout>
      <p className="fixed bottom-4 right-4 text-xs text-gray-300">powered by ratolabs</p>
    </div>
  );
}