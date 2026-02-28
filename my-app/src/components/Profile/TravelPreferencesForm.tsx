"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { TravelPreferences } from "@/types";
import { TRAVEL_VIBES } from "@/types";

const SLIDER_STEPS = 101;
const SCALE_MIN = 1;
const SCALE_MAX = 5;
const DRAG_THRESHOLD_PX = 20;
const TRACK_HEIGHT_LARGE = 24;
const TRACK_HEIGHT_THIN = 8;
const TRACK_TRANSITION_MS = 350;

function valueToScale(value: number): number {
  return Math.round(SCALE_MIN + value * (SCALE_MAX - SCALE_MIN));
}

interface SliderRowProps {
  label: string;
  left: string;
  right: string;
  value: number;
  onChange: (v: number) => void;
  onActivated?: () => void;
  /** If false, show full slider immediately (e.g. Profile edit). If true, start as point (onboarding). */
  requireDragToActivate?: boolean;
}

function SliderRow({ label, left, right, value, onChange, onActivated, requireDragToActivate = true }: SliderRowProps) {
  const [activated, setActivated] = useState(!requireDragToActivate);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0.5);
  const [transitioning, setTransitioning] = useState(!requireDragToActivate);
  const [trackThin, setTrackThin] = useState(false);
  const [expandedDrag, setExpandedDrag] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const hasMovedRef = useRef(false);
  const dragValueRef = useRef(0.5);

  const getValueFromClientX = useCallback((clientX: number): number => {
    const el = trackRef.current;
    if (!el) return 0.5;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      startXRef.current = e.clientX;
      hasMovedRef.current = false;
      const v = getValueFromClientX(e.clientX);
      dragValueRef.current = v;
      setDragValue(v);
      setIsDragging(true);
    },
    [getValueFromClientX]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: PointerEvent) => {
      const dx = Math.abs(e.clientX - startXRef.current);
      if (dx >= DRAG_THRESHOLD_PX) hasMovedRef.current = true;
      if (hasMovedRef.current) {
        const v = getValueFromClientX(e.clientX);
        dragValueRef.current = v;
        setDragValue(v);
      }
    };

    const handleUp = () => {
      if (hasMovedRef.current) {
        setActivated(true);
        setTransitioning(true);
        setTrackThin(false);
        onChange(dragValueRef.current);
        onActivated?.();
      }
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [isDragging, onChange, onActivated, getValueFromClientX]);

  // When transitioning: first paint large track, then trigger shrink animation, then show range input
  useEffect(() => {
    if (!transitioning) return;
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => setTrackThin(true));
    });
    return () => cancelAnimationFrame(rafId);
  }, [transitioning]);

  useEffect(() => {
    if (!transitioning) return;
    const t = setTimeout(() => {
      setTransitioning(false);
      setTrackThin(false);
    }, TRACK_TRANSITION_MS);
    return () => clearTimeout(t);
  }, [transitioning]);

  // When user drags the range input thumb: expand to large track, handle move/up, then transition back to thin
  const handleSliderPointerDownCapture = useCallback(
    (e: React.PointerEvent) => {
      if (transitioning || expandedDrag) return;
      e.preventDefault();
      e.stopPropagation();
      sliderContainerRef.current?.setPointerCapture(e.pointerId);
      setExpandedDrag(true);
    },
    [transitioning, expandedDrag]
  );

  useEffect(() => {
    if (!expandedDrag) return;
    const handleMove = (e: PointerEvent) => {
      const v = getValueFromClientX(e.clientX);
      dragValueRef.current = v;
      onChange(v);
    };
    const handleUp = () => {
      setExpandedDrag(false);
      setTransitioning(true);
      setTrackThin(false);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [expandedDrag, onChange, getValueFromClientX]);

  const scale = valueToScale(activated ? value : dragValue);
  const displayValue = activated ? value : dragValue;

  if (!activated) {
    return (
      <div className="mb-6">
        <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
          {label}
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs w-24 shrink-0" style={{ color: "var(--text-muted)" }}>
            {left}
          </span>
          <div className="flex-1 flex flex-col gap-1">
            <div
              ref={trackRef}
              className="relative rounded-full overflow-hidden select-none touch-none"
              style={{
                height: TRACK_HEIGHT_LARGE,
                background: isDragging ? "var(--border)" : "transparent",
                transition: "background 0.2s ease, height 0.2s ease",
              }}
            >
              <div
                role="slider"
                aria-label={label}
                aria-valuemin={SCALE_MIN}
                aria-valuemax={SCALE_MAX}
                aria-valuenow={scale}
                aria-valuetext={`${scale} of ${SCALE_MAX}`}
                tabIndex={0}
                onPointerDown={handlePointerDown}
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full cursor-grab active:cursor-grabbing outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--accent-green)] z-10"
                style={{
                  left: `calc(${displayValue * 100}% - 6px)`,
                  background: "var(--accent-green)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  transition: isDragging ? "none" : "left 0.15s ease",
                }}
              />
            </div>
            {!isDragging && (
              <p
                className="text-xs pointer-events-none pl-5"
                style={{ color: "var(--text-muted)" }}
              >
                Drag the point left or right
              </p>
            )}
          </div>
          <span
            className="text-sm font-medium tabular-nums shrink-0 w-8 text-center"
            style={{ color: "var(--accent-green)" }}
          >
            {scale}
          </span>
          <span className="text-xs w-24 shrink-0 text-right" style={{ color: "var(--text-muted)" }}>
            {right}
          </span>
        </div>
      </div>
    );
  }

  // Activated but still transitioning: show track animating from large to thin, then reveal range input (no 1/5 during transition)
  if (transitioning) {
    return (
      <div className="mb-6">
        <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
          {label}
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs w-24 shrink-0" style={{ color: "var(--text-muted)" }}>
            {left}
          </span>
          <div className="flex-1 flex flex-col gap-1">
            <div
              className="relative rounded-full overflow-hidden select-none touch-none flex items-center"
              style={{
                height: trackThin ? TRACK_HEIGHT_THIN : TRACK_HEIGHT_LARGE,
                background: "var(--border)",
                transition: `height ${TRACK_TRANSITION_MS}ms ease-out`,
              }}
            >
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full z-10 pointer-events-none"
                style={{
                  left: `calc(${value * 100}% - 6px)`,
                  background: "var(--accent-green)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  transition: `left ${TRACK_TRANSITION_MS}ms ease-out`,
                }}
              />
            </div>
          </div>
          <span
            className="text-sm font-medium tabular-nums shrink-0 w-8 text-center"
            style={{ color: "var(--accent-green)" }}
          >
            {scale}
          </span>
          <span className="text-xs w-24 shrink-0 text-right" style={{ color: "var(--text-muted)" }}>
            {right}
          </span>
        </div>
      </div>
    );
  }

  // Normal thin slider; when dragging (expandedDrag) show large track, and hide 1/5 during drag
  return (
    <div className="mb-6">
      <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
        {label}
      </p>
      <div className="flex items-center gap-3">
        <span className="text-xs w-24 shrink-0" style={{ color: "var(--text-muted)" }}>
          {left}
        </span>
        <div
          ref={sliderContainerRef}
          className={`flex-1 flex flex-col gap-1 ${expandedDrag ? "select-none touch-none" : "cursor-grab active:cursor-grabbing"}`}
          onPointerDownCapture={handleSliderPointerDownCapture}
        >
          {expandedDrag ? (
            <div
              ref={trackRef}
              className="relative rounded-full overflow-hidden flex items-center"
              style={{
                height: TRACK_HEIGHT_LARGE,
                background: "var(--border)",
              }}
            >
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full z-10 pointer-events-none"
                style={{
                  left: `calc(${value * 100}% - 6px)`,
                  background: "var(--accent-green)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              />
            </div>
          ) : (
            <input
              type="range"
              min={0}
              max={SLIDER_STEPS - 1}
              step={1}
              value={Math.round(value * (SLIDER_STEPS - 1))}
              onChange={(e) => onChange(Number(e.target.value) / (SLIDER_STEPS - 1))}
              className="travel-pref-slider w-full h-2 rounded-full appearance-none cursor-pointer block"
            />
          )}
        </div>
        <span
          className="text-sm font-medium tabular-nums shrink-0 w-8 text-center"
          style={{ color: "var(--accent-green)" }}
          aria-hidden
        >
          {scale}
        </span>
        <span className="text-xs w-24 shrink-0 text-right" style={{ color: "var(--text-muted)" }}>
          {right}
        </span>
      </div>
    </div>
  );
}

const SLIDER_IDS = [
  "trip_pace",
  "crowd_comfort",
  "morning_tolerance",
  "late_night_tolerance",
  "walking_effort",
  "budget_level",
  "planning_vs_spontaneity",
  "noise_sensitivity",
] as const;

interface TravelPreferencesFormProps {
  value: TravelPreferences;
  onChange: (v: TravelPreferences) => void;
  showTitle?: boolean;
  /** When true, sliders start as a point and must be dragged to activate (onboarding). When false, full slider shown (Profile). */
  requireDragToActivate?: boolean;
  /** Called when all 8 sliders have been activated (dragged). Use to enable submit. */
  onAllSlidersActivated?: () => void;
  /** Called whenever required non-slider sections become valid/invalid. */
  onValidationChange?: (state: {
    hasWeatherSelection: boolean;
    hasVibeSelection: boolean;
    isComplete: boolean;
  }) => void;
}

export function TravelPreferencesForm({
  value,
  onChange,
  showTitle = true,
  requireDragToActivate = false,
  onAllSlidersActivated,
  onValidationChange,
}: TravelPreferencesFormProps) {
  const [, setActivatedCount] = useState(requireDragToActivate ? 0 : SLIDER_IDS.length);
  const selectedVibes = (
    value.travel_vibes?.length
      ? value.travel_vibes
      : value.travel_vibe
        ? [value.travel_vibe]
        : []
  );
  const hasWeatherSelection = Boolean(
    value.no_weather_dislikes || value.dislike_heat || value.dislike_cold || value.dislike_rain
  );
  const hasVibeSelection = selectedVibes.length > 0;

  const handleSliderActivated = useCallback(() => {
    setActivatedCount((prev) => {
      const next = prev + 1;
      if (next === SLIDER_IDS.length) onAllSlidersActivated?.();
      return next;
    });
  }, [onAllSlidersActivated]);

  const update = (patch: Partial<TravelPreferences>) => {
    onChange({ ...value, ...patch });
  };

  useEffect(() => {
    onValidationChange?.({
      hasWeatherSelection,
      hasVibeSelection,
      isComplete: hasWeatherSelection && hasVibeSelection,
    });
  }, [hasWeatherSelection, hasVibeSelection, onValidationChange]);

  return (
    <div className="space-y-6">
      {showTitle && (
        <h2 className="text-lg font-medium mb-4" style={{ color: "var(--text-primary)" }}>
          Travel Preferences (1 - 5)
        </h2>
      )}

      <SliderRow
        requireDragToActivate={requireDragToActivate}
        label="How packed do you like your days?"
        left="Very relaxed"
        right="Very packed"
        value={value.trip_pace}
        onChange={(v) => update({ trip_pace: v })}
        onActivated={handleSliderActivated}
      />
      <SliderRow
        requireDragToActivate={requireDragToActivate}
        label="How much do crowds bother you?"
        left="Hate crowds"
        right="Don't mind crowds"
        value={value.crowd_comfort}
        onChange={(v) => update({ crowd_comfort: v })}
        onActivated={handleSliderActivated}
      />
      <SliderRow
        requireDragToActivate={requireDragToActivate}
        label="How okay are you with early-morning activities (before ~8am)?"
        left="Avoid early mornings"
        right="Totally fine"
        value={value.morning_tolerance}
        onChange={(v) => update({ morning_tolerance: v })}
        onActivated={handleSliderActivated}
      />
      <SliderRow
        requireDragToActivate={requireDragToActivate}
        label="How okay are you with late-night activities (after ~11pm)?"
        left="Prefer early nights"
        right="Love late nights"
        value={value.late_night_tolerance}
        onChange={(v) => update({ late_night_tolerance: v })}
        onActivated={handleSliderActivated}
      />
      <SliderRow
        requireDragToActivate={requireDragToActivate}
        label="How much walking or physical activity per day is comfortable?"
        left="Minimal walking"
        right="Long walks / hikes are fine"
        value={value.walking_effort}
        onChange={(v) => update({ walking_effort: v })}
        onActivated={handleSliderActivated}
      />
      <SliderRow
        requireDragToActivate={requireDragToActivate}
        label="What activity price range usually feels comfortable?"
        left="Budget"
        right="Premium"
        value={value.budget_level}
        onChange={(v) => update({ budget_level: v })}
        onActivated={handleSliderActivated}
      />
      <SliderRow
        requireDragToActivate={requireDragToActivate}
        label="Do you prefer fixed plans or free time?"
        left="Mostly free time"
        right="Mostly pre-planned"
        value={value.planning_vs_spontaneity}
        onChange={(v) => update({ planning_vs_spontaneity: v })}
        onActivated={handleSliderActivated}
      />
      <SliderRow
        requireDragToActivate={requireDragToActivate}
        label="How sensitive are you to noisy / party environments?"
        left="Very sensitive"
        right="Don't mind noise"
        value={value.noise_sensitivity}
        onChange={(v) => update({ noise_sensitivity: v })}
        onActivated={handleSliderActivated}
      />

      <div className="mb-6">
        <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
          Weather dislikes (required 1 or more)
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(value.no_weather_dislikes)}
            className="rounded-full px-3 py-1.5 border text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: value.dislike_heat ? "var(--accent-green)" : "var(--border)",
              background: value.dislike_heat ? "var(--accent-green-light)" : "transparent",
              color: value.dislike_heat ? "var(--accent-green)" : "var(--text-primary)",
            }}
            onClick={() => update({ dislike_heat: !value.dislike_heat, no_weather_dislikes: false })}
          >
            Heat
          </button>
          <button
            type="button"
            disabled={Boolean(value.no_weather_dislikes)}
            className="rounded-full px-3 py-1.5 border text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: value.dislike_cold ? "var(--accent-green)" : "var(--border)",
              background: value.dislike_cold ? "var(--accent-green-light)" : "transparent",
              color: value.dislike_cold ? "var(--accent-green)" : "var(--text-primary)",
            }}
            onClick={() => update({ dislike_cold: !value.dislike_cold, no_weather_dislikes: false })}
          >
            Cold
          </button>
          <button
            type="button"
            disabled={Boolean(value.no_weather_dislikes)}
            className="rounded-full px-3 py-1.5 border text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: value.dislike_rain ? "var(--accent-green)" : "var(--border)",
              background: value.dislike_rain ? "var(--accent-green-light)" : "transparent",
              color: value.dislike_rain ? "var(--accent-green)" : "var(--text-primary)",
            }}
            onClick={() => update({ dislike_rain: !value.dislike_rain, no_weather_dislikes: false })}
          >
            Outside in the rain
          </button>
          <button
            type="button"
            className="rounded-full px-3 py-1.5 border text-sm transition-colors"
            style={{
              borderColor: value.no_weather_dislikes ? "var(--accent-green)" : "var(--border)",
              background: value.no_weather_dislikes ? "var(--accent-green-light)" : "transparent",
              color: value.no_weather_dislikes ? "var(--accent-green)" : "var(--text-primary)",
            }}
            onClick={() =>
              update(
                value.no_weather_dislikes
                  ? { no_weather_dislikes: false }
                  : {
                      dislike_heat: false,
                      dislike_cold: false,
                      dislike_rain: false,
                      no_weather_dislikes: true,
                    }
              )
            }
          >
            None
          </button>
        </div>
        {!hasWeatherSelection && (
          <p className="text-xs mt-2" style={{ color: "#b91c1c" }}>
            Choose at least one option, or tap None.
          </p>
        )}
      </div>

      <div className="mb-6">
        <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
          What best describes your trips? (required 1 or more)
        </p>
        <div className="flex flex-wrap gap-2">
          {TRAVEL_VIBES.map((vibe) => (
            <button
              key={vibe}
              type="button"
              className="flex items-center gap-2 cursor-pointer rounded-full px-3 py-1.5 border transition-colors"
              style={{
                borderColor: selectedVibes.includes(vibe) ? "var(--accent-green)" : "var(--border)",
                background: selectedVibes.includes(vibe) ? "var(--accent-green-light)" : "transparent",
                color: selectedVibes.includes(vibe) ? "var(--accent-green)" : "var(--text-primary)",
              }}
              onClick={() => {
                const next = selectedVibes.includes(vibe)
                  ? selectedVibes.filter((v) => v !== vibe)
                  : [...selectedVibes, vibe];
                update({
                  travel_vibes: next,
                  travel_vibe: next[0],
                });
              }}
            >
              <span className="text-sm">{vibe}</span>
            </button>
          ))}
        </div>
        {!hasVibeSelection && (
          <p className="text-xs mt-2" style={{ color: "#b91c1c" }}>
            Pick at least one vibe before continuing.
          </p>
        )}
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
