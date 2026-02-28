"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

type BasemapKey = "light" | "outdoors";

interface HeaderProps {
  useMapbox?: boolean;
  basemap?: BasemapKey;
  onBasemapChange?: (key: BasemapKey) => void;
}

export function Header({ useMapbox = false, basemap = "outdoors", onBasemapChange }: HeaderProps = {}) {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (!accountMenuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  return (
    <nav className="fixed top-0 right-0 z-50 p-4 flex items-center gap-3">
      {useMapbox && onBasemapChange && (
        <div
          className="flex rounded-lg overflow-hidden border-2"
          style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
        >
          {(["light", "outdoors"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onBasemapChange(key)}
              className="px-3 py-1.5 text-sm font-medium capitalize"
              style={{
                color: basemap === key ? "var(--accent-green)" : "var(--text-muted)",
                background: basemap === key ? "var(--accent-green-light)" : "transparent",
              }}
            >
              {key}
            </button>
          ))}
        </div>
      )}
      <Link
        href="/profile"
        className="text-sm font-medium py-2 px-3 rounded-lg hover:bg-black/5"
        style={{ color: "var(--text-primary)" }}
      >
        Preference
      </Link>
      {session ? (
        <div className="relative" ref={accountMenuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-lg py-1.5 px-2 hover:bg-black/5"
          >
            {session.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || "user avatar"}
                className="w-8 h-8 rounded-full border-2"
                style={{ borderColor: "var(--border)" }}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full border-2 bg-gray-300"
                style={{ borderColor: "var(--border)" }}
              />
            )}
            <span className="text-sm hidden sm:inline" style={{ color: "var(--text-primary)" }}>
              {session.user?.name}
            </span>
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 mt-2 p-2 rounded-lg border shadow-sm"
              style={{
                background: "var(--bg-surface)",
                borderColor: "var(--border)",
              }}
            >
              <button
                type="button"
                onClick={() => signOut()}
                className="whitespace-nowrap text-xs py-1 px-2 rounded-md border"
                style={{
                  color: "#991b1b",
                  background: "#fee2e2",
                  borderColor: "#fecaca",
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link
          href="/signin"
          className="py-2 px-4 rounded-xl text-sm font-medium text-white"
          style={{ background: "#2d6a4f" }}
        >
          Sign in
        </Link>
      )}
    </nav>
  );
}
