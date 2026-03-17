import type { PropsWithChildren } from "react";

type CardProps = PropsWithChildren<{
  title: string;
}>;

export default function Card({ title, children }: CardProps) {
  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "1rem"
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: "0.8rem" }}>{title}</h2>
      {children}
    </section>
  );
}
