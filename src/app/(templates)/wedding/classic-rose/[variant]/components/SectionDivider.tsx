export default function SectionDivider({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block h-px w-12 shrink-0 bg-[var(--color-primary)] opacity-70 ${className}`}
    />
  );
}
