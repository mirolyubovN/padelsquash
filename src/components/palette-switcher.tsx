"use client";

import { useEffect, useState } from "react";

type Theme = "green" | "orange";

const STORAGE_KEY = "padelsquash-theme";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "green";
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "orange" ? "orange" : "green";
}

export function PaletteSwitcher() {
  const [theme, setTheme] = useState<Theme>("green");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readStoredTheme());
    setMounted(true);
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  if (!mounted) return null;

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
