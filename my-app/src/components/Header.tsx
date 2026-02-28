"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export function Header() {
  const { data: session } = useSession();

  return (
    <nav className="fixed top-0 right-0 z-50 p-4 flex items-center gap-3">
      <Link
        href="/profile"
        className="text-sm font-medium py-2 px-3 rounded-lg hover:bg-black/5"
        style={{ color: "var(--text-primary)" }}
      >
        Profile
      </Link>
      {session ? (
        <>
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
          <button
            type="button"
            onClick={() => signOut()}
            className="text-sm py-1.5 px-3 rounded-lg hover:bg-black/5"
            style={{ color: "var(--text-muted)" }}
          >
            Sign out
          </button>
        </>
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
