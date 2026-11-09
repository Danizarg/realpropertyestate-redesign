"use client";

import { useState, useTransition } from "react";

interface PublishToggleProps {
  defaultChecked: boolean;
  label: string;
  action: (value: boolean) => Promise<void>;
}

export default function PublishToggle({ defaultChecked, label, action }: PublishToggleProps) {
  const [checked, setChecked] = useState(defaultChecked);
  const [isPending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.checked;
          setChecked(next);
          startTransition(() => {
            action(next);
          });
        }}
        className="w-4 h-4 accent-black"
      />
      <span
        className="text-[12px]"
        style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}
      >
        {label}
      </span>
    </label>
  );
}
