/* eslint-disable import/first -- jest.mock calls must be hoisted above the imports they mock. */

/**
 * Tap the mic to record, tap it again to send; the bin discards.
 *
 * The recorder itself is native (a device check); what is pinned here is the
 * wiring — which tap does what, and that a refused microphone SAYS so instead
 * of the button silently doing nothing.
 */

const mockRecorder = {
  recording: false,
  seconds: 0,
  start: jest.fn(async () => "started" as "started" | "denied" | "failed"),
  finish: jest.fn(async () => ({ uri: "file:///clip.m4a", durationSec: 3 }) as { uri: string; durationSec: number } | null),
  cancel: jest.fn(async () => {}),
};
const mockSendVoice = jest.fn(async () => {});

jest.mock("expo-haptics", () => ({
  impactAsync: async () => {},
  ImpactFeedbackStyle: { Light: "light" },
}));

jest.mock("@/components/thread/hooks/useVoiceRecorder", () => ({
  useVoiceRecorder: () => mockRecorder,
}));

jest.mock("@/stores/chat.store", () => ({
  useChatStore: (select: (state: { sendVoice: typeof mockSendVoice }) => unknown) =>
    select({ sendVoice: mockSendVoice }),
}));

jest.mock("@/stores/activeCall.store", () => ({
  useActiveCallStore: (select: (state: { active: null }) => unknown) => select({ active: null }),
}));

import { useEffect } from "react";
import TestRenderer from "react-test-renderer";

import { useComposerVoice, type ComposerVoiceState } from "@/components/thread/hooks/useComposerVoice";
import { copy } from "@/copy";

let latest: ComposerVoiceState | null = null;

function Probe() {
  const state = useComposerVoice("thread-1", () => {});
  useEffect(() => {
    latest = state;
  });
  return null;
}

async function render(): Promise<TestRenderer.ReactTestRenderer> {
  let renderer!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(<Probe />);
  });
  return renderer;
}

async function tap(action: "toggle" | "cancel", renderer: TestRenderer.ReactTestRenderer) {
  await TestRenderer.act(async () => {
    if (action === "toggle") latest?.voice.onToggle();
    else latest?.voice.onCancel();
    await Promise.resolve();
  });
  await TestRenderer.act(async () => {
    renderer.update(<Probe />);
  });
}

beforeEach(() => {
  mockRecorder.recording = false;
  mockRecorder.start.mockClear();
  mockRecorder.finish.mockClear();
  mockRecorder.cancel.mockClear();
  mockSendVoice.mockClear();
});

describe("tap to record, tap to send", () => {
  it("the first tap starts recording", async () => {
    const renderer = await render();
    await tap("toggle", renderer);

    expect(mockRecorder.start).toHaveBeenCalledTimes(1);
    expect(mockRecorder.finish).not.toHaveBeenCalled();
  });

  it("the second tap stops and SENDS", async () => {
    mockRecorder.recording = true;
    const renderer = await render();
    await tap("toggle", renderer);

    expect(mockRecorder.finish).toHaveBeenCalledTimes(1);
    expect(mockSendVoice).toHaveBeenCalledWith("thread-1", "file:///clip.m4a", 3);
  });

  it("the bin discards — nothing is sent", async () => {
    mockRecorder.recording = true;
    const renderer = await render();
    await tap("cancel", renderer);

    expect(mockRecorder.cancel).toHaveBeenCalledTimes(1);
    expect(mockSendVoice).not.toHaveBeenCalled();
  });

  it("a refused microphone says so", async () => {
    mockRecorder.start.mockResolvedValueOnce("denied");
    const renderer = await render();
    await tap("toggle", renderer);

    expect(latest?.error).toBe(copy.chat.voiceMicDenied);
  });

  it("a recording too short to send says so, and sends nothing", async () => {
    mockRecorder.recording = true;
    mockRecorder.finish.mockResolvedValueOnce(null);
    const renderer = await render();
    await tap("toggle", renderer);

    expect(mockSendVoice).not.toHaveBeenCalled();
    expect(latest?.error).toBe(copy.chat.voiceTooShort);
  });
});
