import { useState, useRef } from 'react';
import {
  Store,
  Phone,
  MapPin,
  Clock,
  CreditCard,
  UtensilsCrossed,
  ImagePlus,
  X,
  Plus,
  Trash2,
} from 'lucide-react';
import { SliderShell } from './ui/SliderShell';
import { SectionHeader } from './ui/SectionHeader';
import { FormField } from './ui/FormField';
import { SaveButton } from './ui/SaveButton';
import { useMenuConfig } from '../context/MenuConfigContext';
import { useProfileLogo } from '../context/ProfileLogoContext';
import {
  useRestaurantProfile,
  type RestaurantProfile,
  type TaxRule,
} from '../context/RestaurantProfileContext';

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB

/** Format input to 24h HH:MM; allow only digits and colon, clamp hour 0–23, minute 0–59. */
function formatTime24(value: string): string {
  const digits = value.replace(/\D/g, '');
  let h = 0;
  let m = 0;
  if (digits.length >= 4) {
    h = parseInt(digits.slice(0, 2), 10);
    m = parseInt(digits.slice(2, 4), 10);
  } else if (digits.length === 3) {
    h = parseInt(digits.slice(0, 1), 10);
    m = parseInt(digits.slice(1, 3), 10);
  } else if (digits.length === 2) {
    h = parseInt(digits, 10);
  } else if (digits.length === 1) {
    h = parseInt(digits, 10);
  }
  h = Math.min(23, Math.max(0, h));
  m = Math.min(59, Math.max(0, m));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const getInitialProfile = (restaurantName: string): RestaurantProfile => ({
  name: restaurantName,
  ownerName: 'Rajesh Kumar',
  phone: '+91 98765 43210',
  altPhone: '+91 98765 43211',
  email: 'info@spicegarden.in',
  address: '42, MG Road, Koramangala',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560034',
  gstNumber: '29ABCDE1234F1Z5',
  fssaiNumber: '12345678901234',
  cuisineType: 'North Indian, South Indian, Chinese',
  openingTime: '11:00',
  closingTime: '23:00',
  seatingCapacity: '120',
  avgCostForTwo: '800',
  description:
    'A fine-dining restaurant offering authentic Indian cuisine with a modern twist. Known for our signature Paneer Butter Masala and Tandoori platters.',
  taxRules: [],
});

interface ProfileSliderProps {
  onClose: () => void;
}

export function ProfileSlider({ onClose }: ProfileSliderProps) {
  const { branding } = useMenuConfig();
  const { logoUrl, setLogoUrl } = useProfileLogo();
  const { profile: savedProfile, saveProfile } = useRestaurantProfile();
  const [profile, setProfile] = useState<RestaurantProfile>(
    () => savedProfile ?? getInitialProfile(branding.restaurantName)
  );
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (key: keyof Omit<RestaurantProfile, 'taxRules'>) => (value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const addTax = () => {
    setProfile((prev) => ({
      ...prev,
      taxRules: [...prev.taxRules, { name: '', percent: 0 }],
    }));
  };

  const removeTax = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      taxRules: prev.taxRules.filter((_, i) => i !== index),
    }));
  };

  const updateTax = (index: number, field: keyof TaxRule, value: string | number) => {
    setProfile((prev) => ({
      ...prev,
      taxRules: prev.taxRules.map((r, i) =>
        i === index ? { ...r, [field]: value } : r
      ),
    }));
  };

  const handleSave = () => {
    saveProfile(profile);
    onClose();
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('Image must be 2MB or smaller');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoUrl(dataUrl);
    };
    reader.onerror = () => setLogoError('Failed to read image');
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const profileLogoIcon = logoUrl ? (
    <img src={logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
  ) : (
    <span className="text-primary text-sm">SG</span>
  );

  return (
    <SliderShell
      icon={profileLogoIcon}
      iconBg="bg-primary/10"
      title={profile.name}
      subtitle="Restaurant Profile"
      onClose={onClose}
      footer={<SaveButton label="Save Profile" onSave={handleSave} />}
    >
      {/* Logo / Avatar upload */}
      <div className="flex items-center gap-4 mb-5">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary text-xl flex-shrink-0 border-2 border-dashed border-primary/20 overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt="Restaurant logo" className="w-full h-full object-cover" />
          ) : (
            'SG'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            className="hidden"
            onChange={handleLogoFileChange}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs hover:bg-primary/15 transition-colors cursor-pointer"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              Upload Logo
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={() => setLogoUrl(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Remove logo
              </button>
            )}
          </div>
          {logoError && <p className="text-[11px] text-red-500 mt-1">{logoError}</p>}
          {!logoError && <p className="text-[11px] text-gray-400 mt-1.5">PNG, JPG up to 2MB</p>}
        </div>
      </div>

      {/* Basic Info */}
      <SectionHeader icon={Store} label="Basic Information" />
      <div className="space-y-3">
        <FormField label="Restaurant Name" value={profile.name} onChange={update('name')} placeholder="Enter restaurant name" />
        <FormField label="Owner / Manager Name" value={profile.ownerName} onChange={update('ownerName')} placeholder="Enter owner name" />
        <FormField label="Description" value={profile.description} onChange={update('description')} placeholder="Brief description of your restaurant" />
      </div>

      {/* Contact */}
      <SectionHeader icon={Phone} label="Contact Details" />
      <div className="space-y-3">
        <div className="flex gap-3">
          <FormField label="Phone" value={profile.phone} onChange={update('phone')} type="tel" placeholder="+91 XXXXX XXXXX" half />
          <FormField label="Alt. Phone" value={profile.altPhone} onChange={update('altPhone')} type="tel" placeholder="+91 XXXXX XXXXX" half />
        </div>
        <FormField label="Email" value={profile.email} onChange={update('email')} type="email" placeholder="restaurant@email.com" />
      </div>

      {/* Address */}
      <SectionHeader icon={MapPin} label="Address" />
      <div className="space-y-3">
        <FormField label="Street Address" value={profile.address} onChange={update('address')} placeholder="Street address, area" />
        <div className="flex gap-3">
          <FormField label="City" value={profile.city} onChange={update('city')} half />
          <FormField label="State" value={profile.state} onChange={update('state')} half />
        </div>
        <FormField label="Pincode" value={profile.pincode} onChange={update('pincode')} placeholder="XXXXXX" />
      </div>

      {/* Timings & Capacity */}
      <SectionHeader icon={Clock} label="Timings & Capacity" />
      <div className="space-y-3">
        <div className="flex gap-3">
          <FormField
            label="Opening Time"
            value={profile.openingTime}
            onChange={update('openingTime')}
            type="text"
            placeholder="09:00"
            half
            onBlur={(e) => update('openingTime')(formatTime24(e.target.value))}
          />
          <FormField
            label="Closing Time"
            value={profile.closingTime}
            onChange={update('closingTime')}
            type="text"
            placeholder="21:00"
            half
            onBlur={(e) => update('closingTime')(formatTime24(e.target.value))}
          />
        </div>
        <div className="flex gap-3">
          <FormField label="Seating Capacity" value={profile.seatingCapacity} onChange={update('seatingCapacity')} type="number" placeholder="e.g. 120" half />
          <FormField label="Avg. Cost for Two" value={profile.avgCostForTwo} onChange={update('avgCostForTwo')} type="number" placeholder="e.g. 800" half />
        </div>
      </div>

      {/* Cuisine */}
      <SectionHeader icon={UtensilsCrossed} label="Cuisine" />
      <FormField label="Cuisine Types" value={profile.cuisineType} onChange={update('cuisineType')} placeholder="e.g. North Indian, Chinese" />

      {/* Legal / Tax */}
      <SectionHeader icon={CreditCard} label="Legal & Tax" />
      <div className="space-y-3">
        <FormField label="GST Number" value={profile.gstNumber} onChange={update('gstNumber')} placeholder="29XXXXX1234X1XX" />
        <FormField label="FSSAI License Number" value={profile.fssaiNumber} onChange={update('fssaiNumber')} placeholder="14 digit FSSAI number" />

        {/* Taxes subsection */}
        <div className="pt-2">
          <p className="text-xs text-gray-400 mb-2">Taxes</p>
          <div className="space-y-2">
            {profile.taxRules.map((rule, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 rounded-xl border border-gray-200 bg-white"
              >
                <input
                  type="text"
                  value={rule.name}
                  onChange={(e) => updateTax(index, 'name', e.target.value)}
                  placeholder="e.g. GST, Service Charge"
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <div className="flex items-center gap-1 w-24 flex-shrink-0">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={rule.percent === 0 ? '' : rule.percent}
                    onChange={(e) => updateTax(index, 'percent', e.target.value === '' ? 0 : Number(e.target.value))}
                    placeholder="%"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeTax(index)}
                  className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
                  aria-label="Remove tax"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addTax}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-gray-200 text-gray-500 hover:border-primary/40 hover:text-primary hover:bg-primary/5 text-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add tax
            </button>
          </div>
        </div>
      </div>

      <div className="h-4" />
    </SliderShell>
  );
}
