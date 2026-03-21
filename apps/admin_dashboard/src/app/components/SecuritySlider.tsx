import { useState, useRef } from 'react';
import { Shield, Lock, KeyRound, History, ChevronDown, Check, Timer } from 'lucide-react';
import { SliderShell } from './ui/SliderShell';
import { SectionHeader } from './ui/SectionHeader';
import { SaveButton } from './ui/SaveButton';
import { useClickOutside } from '../hooks/useClickOutside';

interface SecuritySettings {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  sessionTimeout: string;
}

const initialSettings: SecuritySettings = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  sessionTimeout: '60',
};

const loginHistory = [
  { device: 'Chrome on MacOS', ip: '192.168.1.42', time: '2 hours ago', current: true },
  { device: 'Safari on iPad', ip: '192.168.1.38', time: 'Yesterday, 9:15 PM', current: false },
  { device: 'Chrome on Windows', ip: '103.21.58.6', time: 'Mar 10, 11:30 AM', current: false },
];

const timeoutOptions = [
  { value: '15', label: '15 minutes', desc: 'High security' },
  { value: '30', label: '30 minutes', desc: 'Recommended' },
  { value: '60', label: '1 hour', desc: 'Default' },
  { value: '120', label: '2 hours', desc: 'Relaxed' },
  { value: '0', label: 'Never', desc: 'Not recommended' },
];

const SECURITY_COLOR = 'bg-status-preparing-light text-status-preparing';

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        <button
          onClick={() => setShow(!show)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
          type="button"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            {show ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            ) : (
              <>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </>
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}

function SessionTimeoutSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = timeoutOptions.find((o) => o.value === value) || timeoutOptions[2];

  useClickOutside(containerRef, () => setOpen(false), open);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs text-gray-400 mb-1.5">Auto-logout after inactivity</label>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
          open
            ? 'border-primary ring-2 ring-primary/20 bg-white'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Timer className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900">{selected.label}</p>
          <p className="text-[11px] text-gray-400">{selected.desc}</p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1.5 bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden">
          {timeoutOptions.map((option) => {
            const isSelected = option.value === value;
            const isWarning = option.value === '0';
            return (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                  isSelected ? 'bg-primary/5' : 'hover:bg-gray-50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? 'bg-primary/10'
                      : isWarning
                        ? 'bg-red-50'
                        : 'bg-gray-100'
                  }`}
                >
                  <Timer
                    className={`w-4 h-4 ${
                      isSelected
                        ? 'text-primary'
                        : isWarning
                          ? 'text-red-400'
                          : 'text-gray-400'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${isSelected ? 'text-primary' : 'text-gray-700'}`}>
                    {option.label}
                  </p>
                  <p className={`text-[11px] ${isWarning && !isSelected ? 'text-red-400' : 'text-gray-400'}`}>
                    {option.desc}
                  </p>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SecuritySliderProps {
  onClose: () => void;
}

export function SecuritySlider({ onClose }: SecuritySliderProps) {
  const [settings, setSettings] = useState(initialSettings);

  const update = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <SliderShell
      icon={<Shield className="w-5 h-5 text-status-preparing" />}
      iconBg="bg-status-preparing-light"
      title="Security"
      subtitle="Access & authentication"
      onClose={onClose}
      footer={<SaveButton label="Save Security Settings" onSave={onClose} />}
    >
      {/* Change Password */}
      <SectionHeader icon={Lock} label="Change Password" color={SECURITY_COLOR} />
      <div className="space-y-3">
        <PasswordField label="Current Password" value={settings.currentPassword} onChange={(v) => update('currentPassword', v)} placeholder="Enter current password" />
        <PasswordField label="New Password" value={settings.newPassword} onChange={(v) => update('newPassword', v)} placeholder="Enter new password" />
        <PasswordField label="Confirm New Password" value={settings.confirmPassword} onChange={(v) => update('confirmPassword', v)} placeholder="Re-enter new password" />
        {settings.newPassword && settings.confirmPassword && settings.newPassword !== settings.confirmPassword && (
          <p className="text-xs text-danger">Passwords do not match</p>
        )}
      </div>

      {/* Session */}
      <SectionHeader icon={KeyRound} label="Session" color={SECURITY_COLOR} />
      <div className="space-y-3">
        <SessionTimeoutSelector value={settings.sessionTimeout} onChange={(v) => update('sessionTimeout', v)} />
      </div>

      {/* Recent Logins */}
      <SectionHeader icon={History} label="Recent Logins" color={SECURITY_COLOR} />
      <div className="space-y-2">
        {loginHistory.map((session, i) => (
          <div
            key={i}
            className={`flex items-center justify-between p-2.5 rounded-xl border ${
              session.current ? 'border-primary/20 bg-primary/5' : 'border-gray-100 bg-gray-50'
            }`}
          >
            <div className="min-w-0">
              <p className="text-xs text-gray-700 flex items-center gap-1.5">
                {session.device}
                {session.current && (
                  <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">Current</span>
                )}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {session.ip} &middot; {session.time}
              </p>
            </div>
            {!session.current && (
              <button className="text-[11px] text-danger hover:underline cursor-pointer flex-shrink-0">
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="h-4" />
    </SliderShell>
  );
}