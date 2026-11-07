/**
 * Folia Web TV adapter.
 * Works with the Android shell injection (`window.FoliaTV`) and also
 * enables a lightweight keyboard D-pad mode in desktop browsers for debugging.
 */

export type FoliaTvKeyEvent = {
  action: string;
  code?: string;
  repeat?: boolean;
};

type FoliaTvBridge = {
  __installed?: boolean;
  platform?: string;
  dispatchKey?: (evt: FoliaTvKeyEvent) => string;
  focusFirst?: () => void;
  version?: string;
};

declare global {
  interface Window {
    FoliaTV?: FoliaTvBridge;
    FoliaNative?: {
      ready?: () => void;
      requestExit?: () => void;
      log?: (message: string) => void;
    };
  }
}

function isTvContext(): boolean {
  if (typeof window === "undefined") return false;
  if (window.FoliaTV?.platform === "android-tv") return true;
  if (document.documentElement.dataset.foliaTv === "1") return true;
  const params = new URLSearchParams(window.location.search);
  return params.get("tv") === "1" || params.get("platform") === "tv";
}

function applyTvChrome(): void {
  document.documentElement.classList.add("folia-tv");
  document.documentElement.dataset.foliaTv = "1";
  if (!document.getElementById("folia-tv-adapter-style")) {
    const style = document.createElement("style");
    style.id = "folia-tv-adapter-style";
    style.textContent = `
      html.folia-tv {
        --folia-tv-focus: #7cffb2;
      }
      html.folia-tv body {
        -webkit-user-select: none;
        user-select: none;
      }
      html.folia-tv .folia-tv-focused,
      html.folia-tv *:focus-visible {
        outline: 3px solid var(--folia-tv-focus) !important;
        outline-offset: 4px !important;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Hook for future command-id alignment with Folia's command palette.
 * Safe no-op until upstream exposes a stable global command runner.
 */
function wireMediaSessionHints(): void {
  try {
    if (!("mediaSession" in navigator)) return;
    // Keep OS / TV media keys available; detailed handlers stay in the shell bridge.
    navigator.mediaSession.setActionHandler?.("play", null);
    navigator.mediaSession.setActionHandler?.("pause", null);
  } catch {
    // Older WebViews may throw on Media Session.
  }
}

export function initTvAdapter(): void {
  if (!isTvContext()) return;
  applyTvChrome();
  wireMediaSessionHints();

  // If the native shell has not injected yet, still mark readiness for debug (?tv=1).
  if (!window.FoliaTV) {
    window.FoliaTV = {
      __installed: true,
      platform: "web-tv-debug",
      version: "0.1.0",
    };
  }

  try {
    window.FoliaNative?.log?.("initTvAdapter ready");
  } catch {
    // ignore
  }
}

export default initTvAdapter;
