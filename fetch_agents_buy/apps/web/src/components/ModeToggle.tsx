"use client";

import { useEffect, useState } from "react";
import { getModes, updateModes } from "@/lib/api";
import type { ModeConfig } from "@/lib/types";

export function ModeToggle() {
  const [modes, setModes] = useState<ModeConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getModes().then(setModes).catch(console.error);
  }, []);

  const update = async (key: keyof ModeConfig, value: string) => {
    if (!modes || saving) return;
    setSaving(true);
    try {
      const updated = await updateModes({ [key]: value } as Partial<ModeConfig>);
      setModes(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!modes) return <div className="text-xs text-zinc-500">Loading modes...</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <ModeSelect
        label="Treasury"
        value={modes.treasury_mode}
        options={[
          { value: "mock", label: "Mock (default)" },
          { value: "stripe", label: "Stripe test-mode" },
        ]}
        onChange={(v) => update("treasury_mode", v)}
        disabled={saving}
        tooltip="Mock: instant approval. Stripe: creates test-mode PaymentIntent as proof."
      />
      <ModeSelect
        label="Browser"
        value={modes.browser_mode}
        options={[
          { value: "browser_use", label: "Browser Use (cloud)" },
          { value: "local", label: "Local Playwright" },
        ]}
        onChange={(v) => update("browser_mode", v)}
        disabled={saving}
        tooltip="Browser Use: AI-powered cloud browser automation. Local: headless Playwright for dev."
      />
      <ModeSelect
        label="Checkout"
        value={modes.checkout_mode}
        options={[
          { value: "add_to_cart", label: "Add to cart (safe)" },
          { value: "checkout_ready", label: "Checkout ready ⚠️" },
        ]}
        onChange={(v) => update("checkout_mode", v)}
        disabled={saving}
        tooltip="Add to cart: safe default. Checkout ready: enables full purchase flow (use carefully)."
      />
    </div>
  );
}

interface ModeSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  tooltip?: string;
}

function ModeSelect({ label, value, options, onChange, disabled, tooltip }: ModeSelectProps) {
  return (
    <div title={tooltip}>
      <label className="text-xs text-zinc-500 mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full bg-zinc-800 text-zinc-100 text-sm rounded px-3 py-2 border border-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
