"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Home, Map, User, LogOut } from "lucide-react";

type BasemapKey = "light" | "outdoors";

interface SidebarProps {
  basemap?: BasemapKey;
  onBasemapChange?: (key: BasemapKey) => void;
}

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function Sidebar({ basemap = "outdoors", onBasemapChange }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside
      className="w-[72px] flex-shrink-0 flex flex-col items-center py-6 gap-2 bg-white/25 backdrop-blur-2xl border-r border-white/20"
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
        <div className="mt-4 pt-4 border-t border-white/20 w-full flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => onBasemapChange(basemap === "light" ? "outdoors" : "light")}
            className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-[#6b6560] hover:bg-white/30 transition-colors"
            aria-label="Toggle map style"
          >
            <Map className="w-5 h-5" />
          </button>
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
