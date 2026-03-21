import { useState, useRef, useCallback } from 'react';
import { Bell, Volume2 } from 'lucide-react';
import { SliderShell } from './ui/SliderShell';
import { SectionHeader } from './ui/SectionHeader';
import { SaveButton } from './ui/SaveButton';
import {
  getNotificationSettings,
  setNotificationSettings,
  playNotificationSound,
  type NotificationSettings,
} from '../utils/notificationSound';

type NotifSettings = NotificationSettings;

interface NotificationsSliderProps {
  onClose: () => void;
}

const VOLUME_PREVIEW_THROTTLE_MS = 400;

export function NotificationsSlider({ onClose }: NotificationsSliderProps) {
  const [settings, setSettings] = useState<NotifSettings>(getNotificationSettings);
  const lastVolumePreviewRef = useRef(0);

  const update = <K extends keyof NotifSettings>(key: K, value: NotifSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const playVolumePreview = useCallback((volumePercent: number) => {
    const now = Date.now();
    if (now - lastVolumePreviewRef.current >= VOLUME_PREVIEW_THROTTLE_MS) {
      lastVolumePreviewRef.current = now;
      playNotificationSound({ newOrderSound: true, soundVolume: volumePercent });
    }
  }, []);

  return (
    <SliderShell
      icon={<Bell className="w-5 h-5 text-[var(--notif-order-text)]" />}
      iconBg="bg-[var(--notif-order-bg)]"
      title="Notifications"
      subtitle="Alert preferences"
      onClose={onClose}
      footer={<SaveButton label="Save Preferences" onSave={() => { setNotificationSettings(settings); onClose(); }} />}
    >
      {/* Order Alerts */}
      <SectionHeader icon={Bell} label="Order Alerts" color="bg-[var(--notif-order-bg)] text-[var(--notif-order-text)]" />
      <div className="flex items-center justify-between py-2">
        <div className="min-w-0 flex-1 mr-3">
          <p className="text-sm text-gray-700">Sound alert for new orders</p>
          <p className="text-xs text-gray-400 mt-0.5">Play a notification sound when a new order arrives</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.newOrderSound}
          onClick={() => update('newOrderSound', !settings.newOrderSound)}
          className={`relative w-11 h-6 rounded-full transition-colors duration-300 cursor-pointer shrink-0 ${
            settings.newOrderSound ? 'bg-primary' : 'bg-switch-background'
          }`}
          aria-label={settings.newOrderSound ? 'Disable sound alert' : 'Enable sound alert'}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${
              settings.newOrderSound ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Sound Settings */}
      <SectionHeader icon={Volume2} label="Sound Settings" color="bg-[var(--notif-order-bg)] text-[var(--notif-order-text)]" />
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs text-gray-400">Alert Volume</label>
          <span className="text-xs text-white bg-primary px-2 py-0.5 rounded-full">{settings.soundVolume}%</span>
        </div>
        <div
          className="relative w-full h-2 bg-gray-200 rounded-full cursor-pointer group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
            update('soundVolume', pct);
            playVolumePreview(pct);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            const bar = e.currentTarget;
            const move = (ev: MouseEvent) => {
              const rect = bar.getBoundingClientRect();
              const pct = Math.round(Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100)));
              update('soundVolume', pct);
              playVolumePreview(pct);
            };
            const up = () => {
              window.removeEventListener('mousemove', move);
              window.removeEventListener('mouseup', up);
            };
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', up);
          }}
        >
          <div
            className="absolute top-0 left-0 h-full bg-primary rounded-full transition-[width] duration-75"
            style={{ width: `${settings.soundVolume}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-primary rounded-full shadow-md transition-[left] duration-75 group-hover:scale-110"
            style={{ left: `calc(${settings.soundVolume}% - 10px)` }}
          />
        </div>
        <div className="flex justify-between mt-2 px-0.5">
          {[0, 25, 50, 75, 100].map((v) => (
            <button
              key={v}
              onClick={() => {
                update('soundVolume', v);
                playVolumePreview(v);
              }}
              className={`text-[10px] cursor-pointer transition-colors ${
                settings.soundVolume >= v ? 'text-primary' : 'text-gray-300'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="h-4" />
    </SliderShell>
  );
}
