"use client";

import { useState } from "react";

interface ToggleSwitchProps {
  userId: string;
  field: "canBookDirectly" | "isActive";
  initialValue: boolean;
  label?: string;
}

export default function ToggleSwitch({
  userId,
  field,
  initialValue,
  label,
}: ToggleSwitchProps) {
  const [checked, setChecked] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !checked }),
      });
      if (res.ok) setChecked((v) => !v);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={label}
      aria-label={label}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
        checked ? "bg-green-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
