/**
 * Unit checks on the mock service layer (PLAN Phase 3 verification).
 *
 * Covers the four the plan names — latency, failure injection, request
 * accept/decline, quota decrement — plus the rules that would be expensive to
 * discover later: the 18+ gate, the match gate, and blocked-user filtering.
 */

import {
  ApiError,
  configureClient,
  getClientConfig,
  request,
  resetClient,
} from "@/services/client";
import { authService } from "@/services/auth.service";
import { billingService, FREE_DAILY_LIKES } from "@/services/billing.service";
import { callsService } from "@/services/calls.service";
import { chatService } from "@/services/chat.service";
import { likesService } from "@/services/likes.service";
import { matchesService } from "@/services/matches.service";
import { meService } from "@/services/me.service";
import { profilesService } from "@/services/profiles.service";
import { safetyService } from "@/services/safety.service";

function resetAll() {
  resetClient();
  // Instant by default so the suite is not 172 * 500ms long.
  configureClient({ minLatencyMs: 0, maxLatencyMs: 0 });
  authService.__reset();
  meService.__reset();
  safetyService.__reset();
  billingService.__reset();
  chatService.__reset();
  matchesService.__reset();
  likesService.__reset();
  callsService.__reset();
}

beforeEach(resetAll);
afterAll(resetClient);

describe("client — latency", () => {
  it("delays every call by at least the configured minimum", async () => {
    configureClient({ minLatencyMs: 120, maxLatencyMs: 120 });

    // `performance.now()`, not `Date.now()`: the suite freezes the clock
    // (see jest.setup.js), so `Date.now()` cannot measure elapsed time.
    const started = performance.now();
    await request(() => "done");
    const elapsed = performance.now() - started;

    // Generous lower bound: timers fire late, never early.
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });

  it("defaults to the 300–800ms band the plan specifies", () => {
    resetClient();
    const { minLatencyMs, maxLatencyMs } = getClientConfig();
    expect(minLatencyMs).toBe(300);
    expect(maxLatencyMs).toBe(800);
  });
});

describe("client — failure injection", () => {
  it("throws the configured code from any service call", async () => {
    configureClient({ minLatencyMs: 0, maxLatencyMs: 0, failureMode: "server" });

    await expect(profilesService.listNearby()).rejects.toBeInstanceOf(ApiError);
    await expect(profilesService.listNearby()).rejects.toMatchObject({ code: "server" });
  });

  it("stops failing once the switch is cleared", async () => {
    configureClient({ failureMode: "network" });
    await expect(profilesService.listNearby()).rejects.toMatchObject({ code: "network" });

    configureClient({ failureMode: null });
    await expect(profilesService.listNearby()).resolves.toBeDefined();
  });

  it("fails after the delay, so the loading state is still exercised", async () => {
    configureClient({ minLatencyMs: 80, maxLatencyMs: 80, failureMode: "server" });

    const started = performance.now();
    await expect(request(() => "x")).rejects.toBeInstanceOf(ApiError);
    expect(performance.now() - started).toBeGreaterThanOrEqual(60);
  });
});

describe("billing — quota decrement (A16)", () => {
  it("starts with the free daily allowance", async () => {
    const entitlements = await billingService.getEntitlements();
    expect(entitlements.likesRemaining).toBe(FREE_DAILY_LIKES);
    expect(entitlements.isPremium).toBe(false);
  });

  it("decrements one per like", async () => {
    await billingService.consumeLike();
    await billingService.consumeLike();
    const { likesRemaining } = await billingService.getEntitlements();
    expect(likesRemaining).toBe(FREE_DAILY_LIKES - 2);
  });

  it("throws quotaExceeded once the allowance is spent", async () => {
    for (let i = 0; i < FREE_DAILY_LIKES; i += 1) await billingService.consumeLike();

    await expect(billingService.consumeLike()).rejects.toMatchObject({
      code: "quotaExceeded",
    });
  });

  it("does not decrement for premium", async () => {
    await billingService.setPremium(true);
    await billingService.consumeLike();
    await billingService.consumeLike();

    const { likesRemaining } = await billingService.getEntitlements();
    expect(likesRemaining).toBe(Number.POSITIVE_INFINITY);
  });

  it("a rejected like is not recorded", async () => {
    for (let i = 0; i < FREE_DAILY_LIKES; i += 1) await billingService.consumeLike();

    const before = (await likesService.listInboundLikes()).length;
    await expect(likesService.sendLike("user-20")).rejects.toMatchObject({
      code: "quotaExceeded",
    });
    expect((await likesService.listInboundLikes()).length).toBe(before);
  });
});

describe("message requests — accept and decline (A18)", () => {
  it("seeds the new thread with the note on accept", async () => {
    const [pending] = await likesService.listRequests("pending");
    expect(pending).toBeDefined();

    const threadsBefore = (await chatService.listThreads()).length;
    const match = await likesService.acceptRequest(pending.id);

    // A match and its thread are created together — never one without the other.
    expect(match.userIds).toContain(pending.fromUserId);
    expect((await chatService.listThreads()).length).toBe(threadsBefore + 1);

    const messages = await chatService.listMessages(match.threadId);
    expect(messages).toHaveLength(1);
    expect(messages[0].body).toBe(pending.note);
    expect(messages[0].senderId).toBe(pending.fromUserId);
  });

  it("removes the request from pending once accepted", async () => {
    const before = await likesService.listRequests("pending");
    await likesService.acceptRequest(before[0].id);

    const after = await likesService.listRequests("pending");
    expect(after).toHaveLength(before.length - 1);
    expect(await likesService.listRequests("accepted")).toHaveLength(1);
  });

  it("declines silently — no match, no thread, no trace for the sender", async () => {
    const [pending] = await likesService.listRequests("pending");
    const threadsBefore = (await chatService.listThreads()).length;
    const matchesBefore = (await matchesService.listMatches()).length;

    await likesService.declineRequest(pending.id);

    expect((await chatService.listThreads()).length).toBe(threadsBefore);
    expect((await matchesService.listMatches()).length).toBe(matchesBefore);
    expect(await likesService.listRequests("pending")).toHaveLength(2);
    expect(await likesService.listRequests("declined")).toHaveLength(1);
  });

  it("cannot answer the same request twice", async () => {
    const [pending] = await likesService.listRequests("pending");
    await likesService.acceptRequest(pending.id);

    await expect(likesService.acceptRequest(pending.id)).rejects.toMatchObject({
      code: "validation",
    });
  });
});

describe("the 18+ gate", () => {
  it("rejects an under-18 birthday at the data layer, not just the screen", async () => {
    const today = new Date();
    const seventeen = new Date(today);
    seventeen.setFullYear(today.getFullYear() - 17);

    await expect(
      meService.updateMe({ birthday: seventeen.toISOString().slice(0, 10) }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("accepts exactly 18", async () => {
    const today = new Date();
    const eighteen = new Date(today);
    eighteen.setFullYear(today.getFullYear() - 18);

    await expect(
      meService.updateMe({ birthday: eighteen.toISOString().slice(0, 10) }),
    ).resolves.toBeDefined();
  });

  it("never returns anyone under 18, whatever minAge is asked for", async () => {
    const page = await profilesService.listNearby({ minAge: 13 });
    expect(page.items.every((p) => p.age >= 18)).toBe(true);
  });
});

describe("the match gate", () => {
  it("every thread has a match behind it", async () => {
    const threads = await chatService.listThreads();
    expect(threads.length).toBeGreaterThan(0);
    expect(threads.every((t) => Boolean(t.matchId))).toBe(true);
  });

  it("unmatching deletes the conversation for good", async () => {
    const [match] = await matchesService.listMatches();
    await matchesService.unmatch(match.id);

    await expect(chatService.getThread(match.threadId)).rejects.toMatchObject({
      code: "notFound",
    });
    expect(await matchesService.listMatches()).not.toContainEqual(
      expect.objectContaining({ id: match.id }),
    );
  });
});

describe("blocking", () => {
  it("removes the person from discovery and search", async () => {
    const page = await profilesService.listNearby();
    const victim = page.items[0];

    await safetyService.block(victim.id);

    const after = await profilesService.listNearby();
    expect(after.items.map((p) => p.id)).not.toContain(victim.id);
    expect(await profilesService.searchByName(victim.name)).not.toContainEqual(
      expect.objectContaining({ id: victim.id }),
    );
  });

  it("reporting can block in the same step", async () => {
    await safetyService.report("user-05", "romanticAdvance", undefined, true);
    const blocked = await safetyService.listBlocked();
    expect(blocked.map((b) => b.blockedUserId)).toContain("user-05");
  });
});

describe("calls (A17)", () => {
  it("writes a system message only for a completed call", async () => {
    const [thread] = await chatService.listThreads();
    const before = (await chatService.listMessages(thread.id)).length;

    const call = await callsService.startCall(thread.id);
    await callsService.endCall(call.id, "completed", 134);

    const messages = await chatService.listMessages(thread.id);
    expect(messages.length).toBe(before + 1);
    expect(messages.at(-1)).toMatchObject({ kind: "system", body: "Voice call · 2:14" });
  });

  it("leaves no trace for a missed call", async () => {
    const [thread] = await chatService.listThreads();
    const before = (await chatService.listMessages(thread.id)).length;

    const call = await callsService.startCall(thread.id, "incoming");
    await callsService.endCall(call.id, "missed", 0);

    expect((await chatService.listMessages(thread.id)).length).toBe(before);
  });
});

describe("auth", () => {
  it("accepts any 6 digits and rejects anything else", async () => {
    await expect(authService.verifyCode("12345")).rejects.toMatchObject({ code: "validation" });
    await expect(authService.verifyCode("000000")).resolves.toMatchObject({
      onboardingComplete: false,
    });
  });

  it("a fresh session has not completed onboarding", async () => {
    const session = await authService.verifyCode("123456");
    expect(session.onboardingComplete).toBe(false);

    const completed = await authService.completeOnboarding();
    expect(completed.onboardingComplete).toBe(true);
  });
});
