const STORAGE_KEY = "qresto_website_notification_prefs";

export type WebsiteNotificationPrefs = {
  weeklyReports: boolean;
  marketingEmails: boolean;
};

const DEFAULTS: WebsiteNotificationPrefs = {
  weeklyReports: false,
  marketingEmails: true,
};

export function loadWebsiteNotificationPrefs(): WebsiteNotificationPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Record<string, unknown>;
    return {
      weeklyReports:
        typeof p.weeklyReports === "boolean" ? p.weeklyReports : DEFAULTS.weeklyReports,
      marketingEmails:
        typeof p.marketingEmails === "boolean" ? p.marketingEmails : DEFAULTS.marketingEmails,
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveWebsiteNotificationPrefs(prefs: WebsiteNotificationPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}
