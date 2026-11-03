export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#0055ff" />
      <path
        fill="#ffffff"
        fillRule="evenodd"
        d="M20 13h24v38H20V13zm4.4 6h3.6v3.6h-3.6V19zm5.8 0h3.6v3.6h-3.6V19zm5.8 0H39.6v3.6H36V19zM24.4 25h3.6v3.6h-3.6V25zm5.8 0h3.6v3.6h-3.6V25zm5.8 0H39.6v3.6H36V25zM29 40h6v11h-6V40z"
      />
    </svg>
  );
}
