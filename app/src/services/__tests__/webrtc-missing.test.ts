/**
 * A build WITHOUT WebRTC's native half — Expo Go, or a dev build older than
 * the code (PLAN #240).
 *
 * `react-native-webrtc` throws the moment it is imported there. The app must
 * still start: importing the call service may not throw, and a call must fail
 * the ordinary way (`startCallMedia` → false) instead of red-boxing the app.
 */

jest.mock("@/services/client", () => ({
  isMockMode: () => false,
  http: jest.fn(async () => ({ iceServers: [] })),
}));

jest.mock("@/services/socket", () => ({
  emitCallDiag: jest.fn(),
  emitCallSignal: jest.fn(),
}));

// What the real package does when its native module is absent.
jest.mock("react-native-webrtc", () => {
  throw new Error("WebRTC native module not found.");
});

describe("webrtc without the native module", () => {
  it("imports without throwing, reports calls unavailable, and fails a call gracefully", async () => {
    let service!: typeof import("@/services/webrtc");
    expect(() => {
      // A require, not an import: the import itself is what is under test.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      service = require("@/services/webrtc") as typeof import("@/services/webrtc");
    }).not.toThrow();

    expect(service.callingSupported()).toBe(false);
    await expect(
      service.startCallMedia({ callId: "call-1", role: "caller", onConnected: () => {}, onFailed: () => {} }),
    ).resolves.toBe(false);
  });
});
