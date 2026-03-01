"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Trophy, Leaf, Loader2 } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string | null;
  image: string | null;
  avgEmissionKg: number;
  tripCount: number;
}

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          throw new Error((data?.detail ?? data?.error) || "Failed to load");
        }
        return data;
      })
      .then((data) => setEntries(data.leaderboard ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const currentUserId = (session?.user as { id?: string })?.id;

  return (
    <div
      className="min-h-screen p-6 max-w-2xl mx-auto"
      style={{ background: "var(--bg-primary)" }}
    >
      <Link
        href="/"
        className="text-sm font-medium mb-6 inline-block"
        style={{ color: "var(--accent-green)" }}
      >
        ← Back to map
      </Link>

      <header className="flex flex-col items-center mb-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
          style={{
            background: "var(--accent-green)",
            color: "white",
          }}
        >
          <Trophy className="w-8 h-8" />
        </div>
        <h1
          className="text-2xl font-display font-semibold text-center"
          style={{ color: "var(--text-primary)" }}
        >
          Carbon Leaderboard
        </h1>
        <p
          className="text-sm text-center mt-2 max-w-md"
          style={{ color: "var(--text-muted)" }}
        >
          Lower average CO₂ per trip = higher rank. Build sustainable itineraries
          to climb the board!
        </p>
      </header>

      {!session && (
        <div
          className="rounded-2xl p-4 mb-6 border flex items-center gap-3"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border)",
          }}
        >
          <Leaf className="w-6 h-6 shrink-0" style={{ color: "var(--accent-green)" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Sign in to participate
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Your itineraries will count toward the leaderboard when you&apos;re
              signed in.
            </p>
          </div>
          <Link
            href="/signin"
            className="ml-auto shrink-0 py-2 px-4 rounded-xl font-medium text-white text-sm"
            style={{ background: "var(--accent-green)" }}
          >
            Sign in
          </Link>
        </div>
      )}

      <section
        className="rounded-2xl border overflow-hidden"
        style={{
          background: "var(--bg-elevated)",
          borderColor: "var(--border)",
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2" style={{ color: "var(--text-muted)" }}>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading leaderboard…</span>
          </div>
        ) : error ? (
          <div className="py-16 text-center" style={{ color: "var(--text-muted)" }}>
            {error}
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center" style={{ color: "var(--text-muted)" }}>
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No entries yet.</p>
            <p className="text-xs mt-1">
              Save sustainable itineraries while signed in to appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {entries.map((entry) => {
              const isCurrentUser = entry.userId === currentUserId;
              return (
                <li
                  key={entry.userId}
                  className="flex items-center gap-4 px-4 py-4"
                  style={{
                    background: isCurrentUser ? "rgba(45, 106, 79, 0.06)" : undefined,
                  }}
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{
                      background:
                        entry.rank === 1
                          ? "linear-gradient(135deg, #ffd700, #ffb347)"
                          : entry.rank === 2
                            ? "linear-gradient(135deg, #c0c0c0, #a8a8a8)"
                            : entry.rank === 3
                              ? "linear-gradient(135deg, #cd7f32, #b87333)"
                              : "var(--bg-primary)",
                      color:
                        entry.rank <= 3 ? "#1a1a1a" : "var(--text-muted)",
                    }}
                  >
                    {entry.rank}
                  </span>
                  <div
                    className="w-10 h-10 rounded-full overflow-hidden shrink-0 border"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {entry.image ? (
                      <img
                        src={entry.image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-sm font-medium"
                        style={{
                          background: "var(--bg-elevated)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {(entry.name ?? "?")[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-medium truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {entry.name || "Anonymous"}
                      {isCurrentUser && (
                        <span
                          className="ml-1.5 text-xs font-normal"
                          style={{ color: "var(--accent-green)" }}
                        >
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {entry.tripCount} trip{entry.tripCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div
                    className="text-right shrink-0"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <span className="font-semibold tabular-nums">
                      {entry.avgEmissionKg.toFixed(1)}
                    </span>
                    <span className="text-xs ml-0.5" style={{ color: "var(--text-muted)" }}>
                      kg CO₂e avg
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
