export type DeskPrefs = {
  compact: boolean;
  showSubtitle: boolean;
  showFixtureBanner: boolean;
  startOnHome: boolean;
};

export const DEFAULT_DESK_PREFS: DeskPrefs = {
  compact: false,
  showSubtitle: true,
  showFixtureBanner: true,
  startOnHome: true,
};

const KEY = "aether.desk.prefs.v1";

export function loadDeskPrefs(): DeskPrefs {
  if (typeof window === "undefined") return DEFAULT_DESK_PREFS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_DESK_PREFS;
    return { ...DEFAULT_DESK_PREFS, ...(JSON.parse(raw) as Partial<DeskPrefs>) };
  } catch {
    return DEFAULT_DESK_PREFS;
  }
}

export function saveDeskPrefs(prefs: DeskPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
    document.documentElement.dataset.deskCompact = prefs.compact ? "1" : "0";
    window.dispatchEvent(new CustomEvent("aether-desk-prefs"));
  } catch {
    /* ignore */
  }
}

export function applyDeskPrefsToDocument(prefs: DeskPrefs) {
  document.documentElement.dataset.deskCompact = prefs.compact ? "1" : "0";
}
