/* eslint-disable import/first -- jest.mock calls must be hoisted above the imports they mock. */

/**
 * Call setup must survive the ways it used to stall on "Connecting…".
 *
 * Every other suite runs in mock mode, where `startCallMedia` returns before
 * touching WebRTC at all — so none of this was ever exercised. Real mode here,
 * against the state-tracking `__mocks__/react-native-webrtc.js`.
 */

const mockSent: { kind: string; data: { type?: string; sdp?: string } }[] = [];

jest.mock("@/services/client", () => ({
  isMockMode: () => false,
  http: async () => ({
    iceServers: [
      { urls: ["stun:stun.example.org:3478"] },
      { urls: ["turn:turn.example.org:3478?transport=udp"], username: "u", credential: "p" },
    ],
  }),
}));

jest.mock("@/services/socket", () => ({
  emitCallSignal: (_callId: string, kind: string, data: { type?: string; sdp?: string }) =>
    mockSent.push({ kind, data }),
  emitCallDiag: () => {},
}));

import {
  callMediaDiagnostics,
  handleCallSignal,
  startCallMedia,
  stopCallMedia,
} from "@/services/webrtc";

const OFFER = { type: "offer", sdp: "remote-offer-sdp" };

beforeEach(async () => {
  await stopCallMedia();
  mockSent.length = 0;
});

afterEach(() => {
  jest.useRealTimers();
});

describe("callee", () => {
  it("answers an offer that arrived BEFORE its connection existed", async () => {
    // The race behind the stuck call: the offer lands while this phone is
    // still opening its microphone. It used to be dropped.
    await handleCallSignal({ callId: "c1", kind: "offer", data: OFFER });
    expect(mockSent).toEqual([]);

    await startCallMedia({ callId: "c1", role: "callee" });

    expect(mockSent.map((m) => m.kind)).toEqual(["answer"]);
  });

  it("answers a repeated offer with the same answer, without renegotiating", async () => {
    await startCallMedia({ callId: "c1", role: "callee" });
    await handleCallSignal({ callId: "c1", kind: "offer", data: OFFER });
    await handleCallSignal({ callId: "c1", kind: "offer", data: OFFER });

    expect(mockSent.map((m) => m.kind)).toEqual(["answer", "answer"]);
    expect(mockSent[1]?.data.sdp).toBe(mockSent[0]?.data.sdp);
  });

  it("ignores signals for a different call", async () => {
    await startCallMedia({ callId: "c1", role: "callee" });
    await handleCallSignal({ callId: "other", kind: "offer", data: OFFER });
    expect(mockSent).toEqual([]);
  });
});

describe("caller", () => {
  it("re-sends its offer until an answer arrives, then stops", async () => {
    jest.useFakeTimers();
    await startCallMedia({ callId: "c1", role: "caller" });
    expect(mockSent.map((m) => m.kind)).toEqual(["offer"]);

    await jest.advanceTimersByTimeAsync(6100);
    expect(mockSent.filter((m) => m.kind === "offer")).toHaveLength(3);

    await handleCallSignal({ callId: "c1", kind: "answer", data: { type: "answer", sdp: "a" } });
    await jest.advanceTimersByTimeAsync(9000);
    expect(mockSent.filter((m) => m.kind === "offer")).toHaveLength(3);
  });

  it("ignores a second answer to a repeated offer", async () => {
    await startCallMedia({ callId: "c1", role: "caller" });
    await handleCallSignal({ callId: "c1", kind: "answer", data: { type: "answer", sdp: "a" } });
    // Would throw "wrong state: stable" on a real connection if applied.
    await expect(
      handleCallSignal({ callId: "c1", kind: "answer", data: { type: "answer", sdp: "a" } }),
    ).resolves.toBeUndefined();
  });
});

describe("diagnostics", () => {
  it("says whether a relay was handed out and what each side found", async () => {
    await startCallMedia({ callId: "c1", role: "callee" });
    await handleCallSignal({ callId: "c1", kind: "offer", data: OFFER });
    await handleCallSignal({
      callId: "c1",
      kind: "ice",
      data: { candidate: "candidate:1 1 udp 1 203.0.113.9 5000 typ srflx raddr 0.0.0.0 rport 0" },
    });

    expect(callMediaDiagnostics()).toBe("ice new · you none · them srflx · turn yes");
  });
});
