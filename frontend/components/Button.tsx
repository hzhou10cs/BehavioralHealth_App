import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>;

export default function Button({ children, ...props }: ButtonProps) {
  return (
    <button
      style={{
        background: "#2563eb",
        color: "#ffffff",
        border: "none",
        borderRadius: "8px",
        padding: "0.6rem 1rem",
        cursor: "pointer",
        fontWeight: 600
      }}
      {...props}
    >
      {children}
    </button>
  );
}
