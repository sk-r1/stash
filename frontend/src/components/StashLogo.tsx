export function StashLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="3" y="14" width="26" height="14" rx="3" stroke="var(--accent)" strokeWidth="2.5" />
      <path
        d="M16 4V18M16 18L10.5 12.5M16 18L21.5 12.5"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
