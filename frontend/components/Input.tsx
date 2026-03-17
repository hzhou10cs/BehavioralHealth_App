import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export default function Input({ label, id, ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label htmlFor={inputId} style={{ display: "grid", gap: "0.35rem" }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <input
        id={inputId}
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          padding: "0.55rem 0.7rem"
        }}
        {...props}
      />
    </label>
  );
}
