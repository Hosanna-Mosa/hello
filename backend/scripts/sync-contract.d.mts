/**
 * Types for `sync-contract.mjs`.
 *
 * Hand-written, and deliberately so: the script is plain JavaScript because it
 * runs as `prebuild`, before any TypeScript loader is guaranteed to exist on a
 * deploy host. Four declarations is a cheaper price than making the build depend
 * on tsx.
 */

/** Absolute path to the app's `types.ts` — the one definition of the wire contract. */
export declare const SOURCE: string;
/** Absolute path to the generated declaration file inside `src/types/`. */
export declare const TARGET: string;
/** The generated file's exact text. Throws if the source is no longer pure types. */
export declare function render(source: string): string;
/** Read the app's `types.ts`. */
export declare function readSource(): string;
