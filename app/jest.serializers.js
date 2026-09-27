/**
 * Redact absolute timestamps from snapshots.
 *
 * Fixtures anchor to `Date.now()` at module load — deliberately, so "8m ago"
 * stays true on any day (see src/mocks/threads.ts). The cost is that any
 * snapshot containing an ISO timestamp differs on every run, and a baseline
 * that churns every run cannot catch a regression, which is the whole point of
 * capturing one (PLAN §3).
 *
 * Replacing the instant keeps everything that matters — that a timestamp is
 * present, and its position in the tree — while removing the part that moves.
 */
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

expect.addSnapshotSerializer({
  test: (value) => typeof value === "string" && ISO.test(value),
  serialize: () => '"<timestamp>"',
});

/**
 * Collapse React elements passed as props.
 *
 * `refreshControl` on the nearby grid takes an element, and serializing it
 * dumps React's internal fibre fields — `_debugStack`, `_debugOwner`,
 * `_debugTask`. Those are development-only internals that move between runs and
 * between React versions, so they make the baseline churn while telling us
 * nothing about our own tree.
 *
 * The element is replaced by its type name, which is the part worth asserting:
 * that a RefreshControl is wired up at all.
 */
expect.addSnapshotSerializer({
  test: (value) =>
    Boolean(value) &&
    typeof value === "object" &&
    "$$typeof" in value &&
    String(value.$$typeof) === "Symbol(react.transitional.element)",
  serialize: (value) => {
    const type = value.type;
    const name = typeof type === "string" ? type : (type?.displayName ?? type?.name ?? "Component");
    return `<${name} />`;
  },
});

/**
 * Redact ids minted during the run.
 *
 * `nextId` is `${prefix}-${Date.now().toString(36)}-${counter}` (see
 * src/services/client.ts), so both halves move: the timestamp changes every
 * run, and the counter depends on how many ids the whole process minted before
 * this test — which is why an id can be stable when a file runs alone and
 * differ when the full suite does.
 *
 * Seeded ids are untouched. They have no base-36 middle segment (`thread-1`,
 * `user-07`, `match-fresh`) and they are exactly the ones worth asserting on,
 * because a screen rendering the wrong seeded record is a real regression.
 */
const MINTED_ID = /^[a-z]+-[0-9a-z]{7,}-\d+$/;

expect.addSnapshotSerializer({
  test: (value) => typeof value === "string" && MINTED_ID.test(value),
  serialize: () => '"<id>"',
});
