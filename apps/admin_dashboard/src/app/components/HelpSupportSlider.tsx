import { useState } from 'react';
import {
  HelpCircle,
  MessageCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  ExternalLink,
} from 'lucide-react';
import { SliderShell } from './ui/SliderShell';
import { SectionHeader } from './ui/SectionHeader';
import { SearchInput } from './ui/SearchInput';

const HELP_COLOR = 'bg-gray-100 text-gray-600';

const faqs = [
  {
    q: 'How do I get QR codes for my tables?',
    a: 'Go to the Tables page, click any table card, and open the QR Code tab. The QR for that table is shown there — use "Download QR Code" to save the image or "Copy Link" to copy the order URL.',
  },
  {
    q: 'Can I assign a menu item to multiple categories?',
    a: 'Yes! Each menu item has a categories array. You can drag a food item card onto any category tab in the sidebar to add it to that category. Items can belong to as many categories as needed.',
  },
  {
    q: 'How do I remove an item from a category without deleting it?',
    a: 'When viewing a specific category tab, each item card shows an amber "Remove" button that only removes it from that category. The red "Delete" button (which permanently deletes) only appears in the "All Items" tab.',
  },
  {
    q: 'What devices are supported for the dashboard?',
    a: 'The dashboard supports desktop (1024px and above) and tablet (768px-1023px) screens. Mobile phones below 768px are blocked with a "Use a Larger Screen" message.',
  },
  {
    q: 'How do order notifications work?',
    a: 'You can configure sound, push, and email notifications in Settings > Notifications. You can also set quiet hours and control how often alerts repeat for unacknowledged orders.',
  },
  {
    q: 'Can I customize the dashboard appearance?',
    a: 'Yes, go to Settings > Appearance to change the accent color, theme, layout density, font size, and other display preferences.',
  },
];

const guides = [
  { title: 'Getting Started Guide', desc: 'Set up your restaurant dashboard in 5 minutes' },
  { title: 'Menu Management', desc: 'Add items, manage categories, and set prices' },
  { title: 'Table & QR Setup', desc: 'Configure tables and use QR codes for ordering' },
  { title: 'Order Management', desc: 'Track, update, and manage live orders' },
  { title: 'Analytics Overview', desc: 'Understand your dashboard analytics and reports' },
];

interface HelpSupportSliderProps {
  onClose: () => void;
}

export function HelpSupportSlider({ onClose }: HelpSupportSliderProps) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SliderShell
      icon={<HelpCircle className="w-5 h-5 text-gray-600" />}
      iconBg="bg-gray-100"
      title="Help & Support"
      subtitle="FAQs & contact"
      onClose={onClose}
    >
      {/* Search */}
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search FAQs..."
        className="mb-4"
      />

      {/* FAQs */}
      <SectionHeader icon={MessageCircle} label="Frequently Asked Questions" color={HELP_COLOR} />
      <div className="space-y-2 mb-2">
        {filteredFaqs.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No matching FAQs found</p>
        )}
        {filteredFaqs.map((faq, i) => {
          const originalIndex = faqs.indexOf(faq);
          const isOpen = expandedFaq === originalIndex;
          return (
            <div key={originalIndex} className="rounded-xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => setExpandedFaq(isOpen ? null : originalIndex)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <span className="text-xs text-gray-700 pr-2">{faq.q}</span>
                {isOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="px-3 pb-3 pt-0">
                  <p className="text-xs text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Guides */}
      <SectionHeader icon={BookOpen} label="Guides & Documentation" color={HELP_COLOR} />
      <div className="space-y-2">
        {guides.map((guide, i) => (
          <button
            key={i}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer text-left group"
          >
            <div className="min-w-0">
              <p className="text-xs text-gray-700 group-hover:text-primary transition-colors">{guide.title}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{guide.desc}</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary flex-shrink-0 ml-2 transition-colors" />
          </button>
        ))}
      </div>

      {/* Contact Support */}
      <SectionHeader icon={Phone} label="Contact Support" color={HELP_COLOR} />
      <div className="space-y-2">
        <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
          <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-700">Email Support</p>
            <p className="text-[11px] text-primary mt-0.5">support@spicegarden.in</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
          <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-700">Phone Support</p>
            <p className="text-[11px] text-primary mt-0.5">+91 1800-123-4567 (Mon-Sat, 9am-6pm)</p>
          </div>
        </div>
      </div>

      <div className="h-4" />
    </SliderShell>
  );
}