/**
 * Long-form pages (policies, terms, guidelines) are DATA, rendered by one set
 * of components. Wording lives in `src/content/`; layout lives in
 * `src/components/legal/` — so every policy page looks and behaves the same.
 */

export type ContentBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "note"; tone?: "info" | "warning"; text: string };

export type ContentSection = { id: string; title: string; blocks: ContentBlock[] };

export type ContentDoc = {
  eyebrow: string;
  title: string;
  summary: string;
  sections: ContentSection[];
};
