"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const el = document.documentElement;
    const next = !el.classList.contains("dark");
    el.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Basculer le thème clair/sombre"
      className="btn-ghost w-full justify-between text-xs"
    >
      <span className="flex items-center gap-2">
        <span className="dot bg-accent" />
        {dark ? "Mode sombre" : "Mode clair"}
      </span>
      <span className="mono text-[10px] text-faint">{dark ? "DARK" : "LIGHT"}</span>
    </button>
  );
}
