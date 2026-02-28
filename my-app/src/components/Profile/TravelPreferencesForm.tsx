"use client";

import type { TravelPreferences } from "@/types";
import { TRAVEL_VIBES } from "@/types";

const SLIDER_STEPS = 101; // 0, 0.01, ..., 1

interface SliderRowProps {
  label: string;
  left: string;
  right: string;
  value: number;
  onChange: (v: number) => void;
}

function SliderRow({ label, left, right, value, onChange }: SliderRowProps) {
  return (
    <div className="mb-6">
      <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
        {label}
      </p>
      <div className="flex items-center gap-3">
        <span className="text-xs w-24 shrink-0" style={{ color: "var(--text-muted)" }}>
          {left}
        </span>
        <input
          type="range"
          min={0}
          max={SLIDER_STEPS - 1}
          step={1}
          value={Math.round(value * (SLIDER_STEPS - 1))}
          onChange={(e) => onChange(Number(e.target.value) / (SLIDER_STEPS - 1))}
          className="travel-pref-slider flex-1 h-2 rounded-full appearance-none cursor-pointer"
        />
        <span className="text-xs w-24 shrink-0 text-right" style={{ color: "var(--text-muted)" }}>
          {right}
        </span>
      </div>
    </div>
  );
}

interface TravelPreferencesFormProps {
  value: TravelPreferences;
  onChange: (v: TravelPreferences) => void;
  showTitle?: boolean;
}

export function TravelPreferencesForm({
  value,
  onChange,
  showTitle = true,
}: TravelPreferencesFormProps) {
  const update = (patch: Partial<TravelPreferences>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className="space-y-6">
      {showTitle && (
        <h2 className="text-lg font-medium mb-4" style={{ color: "var(--text-primary)" }}>
          Travel Preferences
        </h2>
      )}

      <SliderRow
        label="How packed do you like your days?"
        left="Very relaxed"
        right="Very packed"
        value={value.trip_pace}
        onChange={(v) => update({ trip_pace: v })}
      />
      <SliderRow
        label="How much do crowds bother you?"
        left="Hate crowds"
        right="Don't mind crowds"
        value={value.crowd_comfort}
        onChange={(v) => update({ crowd_comfort: v })}
      />
      <SliderRow
        label="How okay are you with early-morning activities (before ~8am)?"
        left="Avoid early mornings"
        right="Totally fine"
        value={value.morning_tolerance}
        onChange={(v) => update({ morning_tolerance: v })}
      />
      <SliderRow
        label="How okay are you with late-night activities (after ~11pm)?"
        left="Prefer early nights"
        right="Love late nights"
        value={value.late_night_tolerance}
        onChange={(v) => update({ late_night_tolerance: v })}
      />
      <SliderRow
        label="How much walking or physical activity per day is comfortable?"
        left="Minimal walking"
        right="Long walks / hikes are fine"
        value={value.walking_effort}
        onChange={(v) => update({ walking_effort: v })}
      />
      <SliderRow
        label="What activity price range usually feels comfortable?"
        left="Budget"
        right="Premium"
        value={value.budget_level}
        onChange={(v) => update({ budget_level: v })}
      />
      <SliderRow
        label="Do you prefer fixed plans or free time?"
        left="Mostly free time"
        right="Mostly pre-planned"
        value={value.planning_vs_spontaneity}
        onChange={(v) => update({ planning_vs_spontaneity: v })}
      />
      <SliderRow
        label="How sensitive are you to noisy / party environments?"
        left="Very sensitive"
        right="Don't mind noise"
        value={value.noise_sensitivity}
        onChange={(v) => update({ noise_sensitivity: v })}
      />

      <div className="mb-6">
        <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
          Weather dislikes
        </p>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value.dislike_heat}
              onChange={(e) => update({ dislike_heat: e.target.checked })}
              className="rounded border-gray-300 accent-[#2d6a4f]"
            />
            <span className="text-sm" style={{ color: "var(--text-primary)" }}>
              I really dislike heat
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value.dislike_cold}
              onChange={(e) => update({ dislike_cold: e.target.checked })}
              className="rounded border-gray-300 accent-[#2d6a4f]"
            />
            <span className="text-sm" style={{ color: "var(--text-primary)" }}>
              I really dislike cold
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value.dislike_rain}
              onChange={(e) => update({ dislike_rain: e.target.checked })}
              className="rounded border-gray-300 accent-[#2d6a4f]"
            />
            <span className="text-sm" style={{ color: "var(--text-primary)" }}>
              I really dislike being outside in the rain
            </span>
          </label>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
          What best describes most of your trips?
        </p>
        <div className="flex flex-wrap gap-2">
          {TRAVEL_VIBES.map((vibe) => (
            <label
              key={vibe}
              className="flex items-center gap-2 cursor-pointer rounded-full px-3 py-1.5 border transition-colors"
              style={{
                borderColor: value.travel_vibe === vibe ? "var(--accent-green)" : "var(--border)",
                background: value.travel_vibe === vibe ? "var(--accent-green-light)" : "transparent",
                color: value.travel_vibe === vibe ? "var(--accent-green)" : "var(--text-primary)",
              }}
            >
              <input
                type="radio"
                name="travel_vibe"
                value={vibe}
                checked={value.travel_vibe === vibe}
                onChange={() => update({ travel_vibe: vibe })}
                className="sr-only"
              />
              <span className="text-sm">{vibe}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
          Anything else we should avoid or be careful about? (optional)
        </label>
        <textarea
          value={value.additional_notes ?? ""}
          onChange={(e) => update({ additional_notes: e.target.value })}
          placeholder="e.g. allergies, mobility, must-sees…"
          rows={3}
          className="w-full rounded-xl border px-3 py-2 text-sm resize-y"
          style={{
            borderColor: "var(--border)",
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
          }}
        />
      </div>
    </div>
  );
}
