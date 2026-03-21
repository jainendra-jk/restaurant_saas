/**
 * Notification sound playback.
 * Uses Settings > Notifications: "Sound alert for new orders" and "Alert volume".
 * Persisted in localStorage under DASHBOARD_NOTIFICATION_SETTINGS_KEY.
 *
 * Sound file: place a short tone (e.g. under 2 seconds) at public/notification.mp3
 * (or .wav). If the file is missing, play() will no-op gracefully.
 */

const DASHBOARD_NOTIFICATION_SETTINGS_KEY = 'dashboard-notification-settings';
const SOUND_URL = '/notification.mp3';

export interface NotificationSettings {
  newOrderSound: boolean;
  soundVolume: number; // 0–100
}

const DEFAULT_SETTINGS: NotificationSettings = {
  newOrderSound: true,
  soundVolume: 75,
};

export function getNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(DASHBOARD_NOTIFICATION_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    return {
      newOrderSound: typeof parsed.newOrderSound === 'boolean' ? parsed.newOrderSound : DEFAULT_SETTINGS.newOrderSound,
      soundVolume:
        typeof parsed.soundVolume === 'number' && parsed.soundVolume >= 0 && parsed.soundVolume <= 100
          ? parsed.soundVolume
          : DEFAULT_SETTINGS.soundVolume,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function setNotificationSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(DASHBOARD_NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

let audioInstance: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!audioInstance) {
    audioInstance = new Audio(SOUND_URL);
  }
  return audioInstance;
}

/**
 * Plays the notification sound. If override is provided (e.g. for preview or "Test sound"),
 * uses that volume and, when volume is explicitly set, plays even if "Sound on" is off so
 * the user can hear the level. If no override, uses saved settings and respects "Sound on".
 * Does not throw; catches autoplay policy or missing file errors.
 * @param override Optional settings for this play only. Pass { soundVolume: 0–100 } and
 *   optionally newOrderSound: true to force play for volume preview.
 */
export function playNotificationSound(override?: Partial<NotificationSettings>): void {
  const saved = getNotificationSettings();
  const settings: NotificationSettings = override
    ? { newOrderSound: saved.newOrderSound, soundVolume: saved.soundVolume, ...override }
    : saved;
  const isVolumePreview = override && 'soundVolume' in override;
  if (!settings.newOrderSound && !isVolumePreview) return;

  const audio = getAudio();
  audio.volume = Math.max(0, Math.min(1, settings.soundVolume / 100));
  audio.play().catch(() => {
    // Autoplay policy, missing file, or other failure — ignore
  });
}

export { DASHBOARD_NOTIFICATION_SETTINGS_KEY };
