export function Logo({ subtitle = "Admin" }: { subtitle?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-lg font-bold text-on-primary">H</span>
      <span className="leading-tight">
        <span className="block font-bold text-ink">Hello</span>
        <span className="block text-xs text-muted">{subtitle}</span>
      </span>
    </span>
  );
}
