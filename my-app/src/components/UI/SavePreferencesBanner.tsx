"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SavePreferencesBannerProps {
  onSave: () => Promise<{ success: boolean }>;
  onDismiss: () => void;
}

export function SavePreferencesBanner({ onSave, onDismiss }: SavePreferencesBannerProps) {
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(true);

  const handleSave = async () => {
    setSaving(true);
    const result = await onSave();
    setSaving(false);
    if (result.success) {
      setVisible(false);
      onDismiss();
    }
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="fixed bottom-0 left-0 right-0 z-40 p-4 flex items-center justify-between gap-4 border-t shadow-lg"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--text-primary)" }}>
          We noticed your preferences — save them for next time?
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="py-2 px-4 rounded-xl text-sm font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            Not now
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="py-2 px-4 rounded-xl text-sm font-medium text-white disabled:opacity-70"
            style={{ background: "#2d6a4f" }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
