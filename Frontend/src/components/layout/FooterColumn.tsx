import { Link } from "react-router";

type Props = { title: string; links: readonly { to: string; label: string }[] };

export function FooterColumn({ title, links }: Props) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-sm text-muted transition-colors hover:text-primary-deep">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
