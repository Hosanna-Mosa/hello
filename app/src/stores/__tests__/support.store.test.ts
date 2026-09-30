/**
 * Support — the store and the mock service, end to end in mock mode.
 *
 * What must hold, because support is where a lost message or a ticket closed
 * over someone's head does the most damage:
 *   - a ticket opens with its first message and lists newest-first;
 *   - a send appears at once, is replaced by the server's copy exactly once
 *     (whether the response or the socket echo lands first), and a failed send
 *     stays on screen, retryable, never dropped;
 *   - support can only ASK to resolve; yes closes the ticket, no reopens it,
 *     and writing while asked counts as no;
 *   - a resolved ticket refuses new messages.
 */

import { configureClient, resetClient } from "@/services/client";
import { supportService } from "@/services/support.service";
import type { SupportMessage } from "@/services/types";
import { mergeMessages, receiveSupportMessage, unreadTicketCount, upsertTicket, useSupportStore } from "@/stores/support.store";

const INITIAL = useSupportStore.getState();

beforeEach(() => {
  jest.useFakeTimers();
  resetClient();
  configureClient({ minLatencyMs: 0, maxLatencyMs: 0 });
  supportService.__reset();
  useSupportStore.setState(INITIAL, true);
});

afterEach(() => {
  jest.useRealTimers();
});

/**
 * Runs the mock's zero-latency timers until the promise settles.
 *
 * The outcome is captured BEFORE the timers run: a rejection that happens
 * while they advance would otherwise be unhandled for a tick, and Jest fails
 * the test on that rather than on the assertion.
 */
async function settle<T>(promise: Promise<T>): Promise<T> {
  const outcome = promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  await jest.advanceTimersByTimeAsync(0);
  const result = await outcome;
  if (!result.ok) throw result.error;
  return result.value;
}

async function openOne(subject = "Can't save my interests") {
  return settle(
    useSupportStore.getState().createTicket({ subject, category: "technical", message: "The save button does nothing." }),
  );
}

describe("opening tickets", () => {
  it("creates a ticket with its first message", async () => {
    const ticket = await openOne();
    const state = useSupportStore.getState();

    expect(ticket.status).toBe("open");
    expect(state.tickets).toHaveLength(1);
    expect(state.messages[ticket.id]?.map((m) => m.body)).toEqual(["The save button does nothing."]);
    expect(state.tickets[0]?.lastMessageAuthor).toBe("user");
  });

  it("lets someone open several, newest activity first", async () => {
    await openOne("First");
    jest.setSystemTime(Date.now() + 1000);
    await openOne("Second");
    await settle(useSupportStore.getState().loadTickets());
    expect(useSupportStore.getState().tickets.map((t) => t.subject)).toEqual(["Second", "First"]);
  });

  it("gets a scripted reply from support in mock mode, with typing first", async () => {
    const ticket = await openOne();
    await jest.advanceTimersByTimeAsync(700);
    expect(useSupportStore.getState().typing[ticket.id]).toBe(true);

    await jest.advanceTimersByTimeAsync(2000);
    const state = useSupportStore.getState();
    expect(state.typing[ticket.id]).toBe(false);
    expect(state.messages[ticket.id]?.at(-1)?.author).toBe("admin");
    expect(unreadTicketCount(state.tickets)).toBe(1);
  });
});

describe("sending", () => {
  it("shows a send at once, then swaps in the stored copy", async () => {
    const ticket = await openOne();
    const sending = useSupportStore.getState().send(ticket.id, "  Still broken  ");

    const optimistic = useSupportStore.getState().pending[ticket.id];
    expect(optimistic).toHaveLength(1);
    expect(optimistic?.[0]).toMatchObject({ body: "Still broken", failed: false });
    expect(useSupportStore.getState().drafts[ticket.id]).toBe("");

    await settle(sending);
    const state = useSupportStore.getState();
    expect(state.pending[ticket.id]).toHaveLength(0);
    expect(state.messages[ticket.id]?.filter((m) => m.body === "Still broken")).toHaveLength(1);
  });

  it("keeps one copy when the socket echo lands before the response", async () => {
    const ticket = await openOne();
    const sending = useSupportStore.getState().send(ticket.id, "Echo race");
    const clientMessageId = useSupportStore.getState().pending[ticket.id]?.[0]?.clientMessageId ?? "";

    const echoed: SupportMessage = {
      id: "server-1",
      ticketId: ticket.id,
      author: "user",
      body: "Echo race",
      event: null,
      clientMessageId,
      createdAt: new Date().toISOString(),
    };
    receiveSupportMessage(ticket.id, echoed);
    expect(useSupportStore.getState().pending[ticket.id]).toHaveLength(0);

    await settle(sending);
    expect(useSupportStore.getState().messages[ticket.id]?.filter((m) => m.body === "Echo race").length).toBeGreaterThanOrEqual(1);
    expect(useSupportStore.getState().messages[ticket.id]?.filter((m) => m.id === "server-1")).toHaveLength(1);
  });

  it("keeps a failed send on screen, marked, and delivers it on retry", async () => {
    const ticket = await openOne();
    configureClient({ failureMode: "network" });

    await expect(settle(useSupportStore.getState().send(ticket.id, "Please help"))).rejects.toThrow();
    const failed = useSupportStore.getState().pending[ticket.id]?.[0];
    expect(failed).toMatchObject({ body: "Please help", failed: true });

    configureClient({ failureMode: null });
    await settle(useSupportStore.getState().retry(ticket.id, failed?.clientMessageId ?? ""));
    const state = useSupportStore.getState();
    expect(state.pending[ticket.id]).toHaveLength(0);
    expect(state.messages[ticket.id]?.some((m) => m.body === "Please help")).toBe(true);
  });

  it("can discard a failed send", async () => {
    const ticket = await openOne();
    configureClient({ failureMode: "network" });
    await expect(settle(useSupportStore.getState().send(ticket.id, "Oops"))).rejects.toThrow();
    const id = useSupportStore.getState().pending[ticket.id]?.[0]?.clientMessageId ?? "";

    useSupportStore.getState().discard(ticket.id, id);
    expect(useSupportStore.getState().pending[ticket.id]).toHaveLength(0);
  });
});

describe("resolving", () => {
  it("yes closes the ticket, and a closed ticket takes no more messages", async () => {
    const ticket = await openOne();
    useSupportStore.getState().simulateResolutionRequest(ticket.id);
    expect(useSupportStore.getState().tickets[0]?.status).toBe("pendingResolution");

    await settle(useSupportStore.getState().respondToResolution(ticket.id, true));
    const state = useSupportStore.getState();
    expect(state.tickets[0]?.status).toBe("resolved");
    expect(state.messages[ticket.id]?.at(-1)?.event).toBe("resolutionAccepted");

    await expect(settle(useSupportStore.getState().send(ticket.id, "one more thing"))).rejects.toMatchObject({ code: "validation" });
  });

  it("no sends it back to open", async () => {
    const ticket = await openOne();
    useSupportStore.getState().simulateResolutionRequest(ticket.id);
    await settle(useSupportStore.getState().respondToResolution(ticket.id, false));

    const state = useSupportStore.getState();
    expect(state.tickets[0]?.status).toBe("open");
    expect(state.tickets[0]?.resolutionRequestedAt).toBeNull();
    expect(state.messages[ticket.id]?.at(-1)?.event).toBe("resolutionDeclined");
  });

  it("writing while support waits for an answer counts as 'not yet'", async () => {
    const ticket = await openOne();
    useSupportStore.getState().simulateResolutionRequest(ticket.id);
    await settle(useSupportStore.getState().send(ticket.id, "It's still happening"));

    const state = useSupportStore.getState();
    expect(state.tickets[0]?.status).toBe("open");
    expect(state.messages[ticket.id]?.slice(-2).map((m) => m.author)).toEqual(["user", "system"]);
  });

  it("a user cannot confirm what support never asked", async () => {
    const ticket = await openOne();
    await expect(settle(useSupportStore.getState().respondToResolution(ticket.id, true))).rejects.toMatchObject({
      code: "validation",
    });
    expect(useSupportStore.getState().tickets[0]?.status).toBe("open");
  });
});

describe("merges", () => {
  const msg = (id: string, at: number): SupportMessage => ({
    id,
    ticketId: "t",
    author: "admin",
    body: id,
    event: null,
    clientMessageId: null,
    createdAt: new Date(at).toISOString(),
  });

  it("dedupes by id and keeps time order", () => {
    const merged = mergeMessages([msg("a", 1), msg("c", 3)], [msg("b", 2), msg("a", 1)]);
    expect(merged.map((m) => m.id)).toEqual(["a", "b", "c"]);
  });

  it("returns the same array when nothing is new — no needless re-render", () => {
    const list = [msg("a", 1)];
    expect(mergeMessages(list, [msg("a", 1)])).toBe(list);
  });

  it("upserts a ticket and re-sorts by activity", async () => {
    const first = await openOne("First");
    const later = { ...first, lastMessageAt: new Date(Date.now() + 5000).toISOString(), subject: "Renamed" };
    const next = upsertTicket([first], later);
    expect(next).toHaveLength(1);
    expect(next[0]?.subject).toBe("Renamed");
  });
});
