import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Button({
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "copper" | "ghost" | "danger" }) {
  return <button className={`btn btn-${variant}`} {...props} />;
}

export function Banner({ kind = "info", children }: { kind?: "info" | "error" | "ok"; children: ReactNode }) {
  return <div className={`banner banner-${kind}`}>{children}</div>;
}

export function Badge({ value, map }: { value: string; map: Record<string, string> }) {
  return <span className={`badge badge-${value}`}>{map[value] ?? value}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function PageHead({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {text ? <p>{text}</p> : null}
      </div>
      {children}
    </header>
  );
}
