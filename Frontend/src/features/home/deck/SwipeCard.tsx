import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import type { SampleProfile } from "@/features/home/deck/profiles";
import { cn } from "@/lib/cn";

type Props = { profile: SampleProfile; dragX?: number };

/** One drawn profile card. The HELLO / PASS stamps fade in with the drag. */
export function SwipeCard({ profile, dragX = 0 }: Props) {
  const hello = Math.min(1, Math.max(0, dragX / 100));
  const pass = Math.min(1, Math.max(0, -dragX / 100));

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-line bg-surface p-6 shadow-pop select-none">
      <Stamp label="HELLO" className="top-8 left-6 -rotate-12 border-success text-success" opacity={hello} />
      <Stamp label="PASS" className="top-8 right-6 rotate-12 border-danger text-danger" opacity={pass} />

      <div className="flex items-center gap-4">
        <span className={cn("relative grid size-16 place-items-center rounded-full text-2xl font-bold", profile.avatar)}>
          {profile.name[0]}
          <span className="absolute right-0 bottom-0 size-4 rounded-full border-2 border-surface bg-success" />
        </span>
        <div>
          <p className="text-xl font-bold text-ink">
            {profile.name}, {profile.age}
          </p>
          <p className="flex items-center gap-1 text-sm text-muted">
            <Icon name="pin" size={14} /> {profile.km} km away
          </p>
        </div>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-muted">{profile.bio}</p>

      <p className="mt-5 text-xs font-semibold tracking-wide text-faint uppercase">Into</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {profile.interests.map((i) => (
          <Badge key={i} tone="primary">
            {i}
          </Badge>
        ))}
      </div>

      <p className="mt-auto flex items-center gap-1.5 pt-5 text-xs font-medium text-secondary-deep">
        <Icon name="sparkle" size={14} /> {profile.interests.length - 1} interests in common with you
      </p>
    </div>
  );
}

function Stamp({ label, className, opacity }: { label: string; className: string; opacity: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute z-10 rounded-xl border-4 px-3 py-1 text-2xl font-black tracking-widest", className)}
      style={{ opacity, transform: `scale(${0.8 + opacity * 0.2})` }}
    >
      {label}
    </span>
  );
}
