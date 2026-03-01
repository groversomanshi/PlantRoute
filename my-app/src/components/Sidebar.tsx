"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Home, Map, User, LogOut, ChevronDown, Trophy } from "lucide-react";
import type { BasemapKey } from "@/types";
import { BASEMAP_OPTIONS } from "@/types";

interface SidebarProps {
  basemap?: BasemapKey;
  onBasemapChange?: (key: BasemapKey) => void;
}

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function Sidebar({ basemap = "outdoors", onBasemapChange }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [basemapMenuOpen, setBasemapMenuOpen] = useState(false);
  const basemapMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!basemapMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (basemapMenuRef.current && !basemapMenuRef.current.contains(e.target as Node)) {
        setBasemapMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [basemapMenuOpen]);

  return (
    <aside
      className="relative z-20 w-[72px] flex-shrink-0 flex flex-col items-center py-6 gap-2 bg-white/25 backdrop-blur-2xl border-r border-white/20"
      style={{ boxShadow: "0 4px 30px rgba(0,0,0,0.06)" }}
    >
      {navItems.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors ${
              isActive ? "bg-[#2d6a4f] text-white" : "text-[#6b6560] hover:bg-white/30"
            }`}
            aria-label={label}
          >
            <Icon className="w-5 h-5" />
          </Link>
        );
      })}

      {onBasemapChange && (
        <div className="mt-4 pt-4 border-t border-white/20 w-full flex flex-col items-center gap-1 relative" ref={basemapMenuRef}>
          <button
            type="button"
            onClick={() => setBasemapMenuOpen((o) => !o)}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors ${
              basemapMenuOpen ? "bg-[#2d6a4f] text-white" : "text-[#6b6560] hover:bg-white/30"
            }`}
            aria-label="Change map style"
            aria-expanded={basemapMenuOpen}
            aria-haspopup="true"
          >
            <Map className="w-5 h-5" />
            <ChevronDown className="w-3 h-3 mt-0.5" />
          </button>
          {basemapMenuOpen && (
            <div
              className="absolute left-full ml-2 top-0 py-1 rounded-xl border shadow-lg min-w-[120px] z-50"
              style={{ background: "rgba(255,255,255,0.97)", borderColor: "rgba(0,0,0,0.08)" }}
            >
              {BASEMAP_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onBasemapChange(key);
                    setBasemapMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-medium capitalize hover:bg-[#2d6a4f]/10 transition-colors first:rounded-t-xl last:rounded-b-xl"
                  style={{
                    color: basemap === key ? "#2d6a4f" : "#1a1a1a",
                    fontWeight: basemap === key ? 600 : 500,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-white/20">
        {session ? (
          <button
            type="button"
            onClick={() => signOut()}
            className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-[#6b6560] hover:bg-white/30 hover:text-red-600 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        ) : (
          <Link
            href="/signin"
            className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-[#2d6a4f] text-white hover:bg-[#236b47] transition-colors"
            aria-label="Sign in"
          >
            <User className="w-5 h-5" />
          </Link>
        )}
      </div>
    </aside>
  );
}
