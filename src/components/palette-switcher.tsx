"use client";

import { useSyncExternalStore } from "react";

type Theme = "green" | "orange";

const STORAGE_KEY = "padelsquash-theme";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "green";
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "orange" ? "orange" : "green";
}

function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("padelsquash-theme-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("padelsquash-theme-change", callback);
  };
}

export function PaletteSwitcher() {
  const theme = useSyncExternalStore(subscribeTheme, readStoredTheme, () => "green");
  function apply(next: Theme) {
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event("padelsquash-theme-change"));
  }

  return (
    <div className="palette-switcher" role="group" aria-label="Тема оформления">
      <span className="palette-switcher__label">Палитра</span>
      <button
        type="button"
        className="palette-switcher__btn"
        data-active={theme === "green"}
        onClick={() => apply("green")}
      >
        <span className="palette-switcher__swatch palette-switcher__swatch--green" aria-hidden="true" />
        Зелёная
      </button>
      <button
        type="button"
        className="palette-switcher__btn"
        data-active={theme === "orange"}
        onClick={() => apply("orange")}
      >
        <span className="palette-switcher__swatch palette-switcher__swatch--orange" aria-hidden="true" />
        Оранжевая
      </button>
    </div>
  );
}
