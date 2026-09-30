/* eslint-disable import/first -- jest.mock calls must be hoisted above the imports they mock. */

/**
 * Support screens — every state as a render snapshot in both themes, and the
 * resolve prompt driven by hand.
 *
 * States are reached through the real mock service, as elsewhere: a pending
 * ticket is one support really asked to resolve, a resolved ticket is one the
 * user really confirmed.
 */

const mockParams: { id: string } = { id: "" };

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
  };
});

import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import TestRenderer, { type ReactTestInstance } from "react-test-renderer";

import SupportTicketScreen from "@/app/support/[id]";
import SupportScreen from "@/app/support/index";
import NewSupportTicketScreen from "@/app/support/new";
import { renderAtomAsync, THEMES } from "@/components/common/atoms/__tests__/renderAtom";
import { copy } from "@/copy";
import { configureClient, resetClient } from "@/services/client";
import { supportService } from "@/services/support.service";
import { useSupportStore } from "@/stores/support.store";
import { ThemeProvider } from "@/theme/ThemeProvider";

const INITIAL = useSupportStore.getState();

beforeEach(() => {
  resetClient();
  configureClient({ minLatencyMs: 0, maxLatencyMs: 0 });
  supportService.__reset();
  useSupportStore.setState(INITIAL, true);
});

/**
 * A ticket in a known state, made through the service. Times are pinned so
 * relative-time labels ("2m") cannot churn the snapshots.
 */
async function ticketIn(state: "open" | "pendingResolution" | "resolved") {
  const { ticket } = await supportService.createTicket(
    { subject: "Can't save my interests", category: "technical", message: "The save button does nothing." },
    "fixed-client-id",
  );
  if (state !== "open") supportService.mockRequestResolutionSync(ticket.id);
  if (state === "resolved") await supportService.respondToResolution(ticket.id, true);
  mockParams.id = ticket.id;
  return ticket.id;
}

const SESSION_ID = /(ticket|smsg|support)-[a-z0-9]+-\d+/g;
const CLOCK = /\b([01]\d|2[0-3]):[0-5]\d\b/g;
const ISO = /^\d{4}-\d{2}-\d{2}T/;
/** A relative time is its own text node ("Now", "3m"); a sentence is left alone. */
const RELATIVE = /^(Now|\d+[mhd])$/;

/** A React element (a List's header/footer prop) — printed by its own serializer, never walked. */
function isElement(value: object): boolean {
  const tag = (value as { $$typeof?: symbol }).$$typeof;
  return typeof tag === "symbol" && !String(tag).includes("test.json");
}

/**
 * Stable ids and times, so a snapshot says what is on screen and nothing else.
 *
 * A walk over strings only. It does not round-trip through JSON: that
 * serialised React elements down to their fibers, render timings included, and
 * the snapshot churned on every run.
 */
function stable<T>(tree: T): T {
  if (typeof tree === "string") {
    if (ISO.test(tree)) return tree;
    if (RELATIVE.test(tree)) return "<ago>" as T;
    return tree.replace(SESSION_ID, "$1-<id>").replace(CLOCK, "<time>") as T;
  }
  if (Array.isArray(tree)) return tree.map(stable) as T;
  if (tree && typeof tree === "object" && !isElement(tree)) {
    // Spread keeps the test renderer's own symbol tag, so it still prints as JSX.
    const out: Record<string, unknown> = { ...(tree as Record<string, unknown>) };
    for (const key of Object.keys(out)) out[key] = stable(out[key]);
    return out as T;
  }
  return tree;
}

describe.each(THEMES)("support screens — %s", (theme) => {
  it("support — empty", async () => {
    expect(stable(await renderAtomAsync(<SupportScreen />, theme))).toMatchSnapshot();
  });

  it("support — with tickets", async () => {
    await ticketIn("open");
    expect(stable(await renderAtomAsync(<SupportScreen />, theme))).toMatchSnapshot();
  });

  it("support/new", async () => {
    expect(stable(await renderAtomAsync(<NewSupportTicketScreen />, theme))).toMatchSnapshot();
  });

  it("support/[id] — open", async () => {
    await ticketIn("open");
    expect(stable(await renderAtomAsync(<SupportTicketScreen />, theme))).toMatchSnapshot();
  });

  it("support/[id] — resolved", async () => {
    await ticketIn("resolved");
    expect(stable(await renderAtomAsync(<SupportTicketScreen />, theme))).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// The resolve prompt, by hand
// ---------------------------------------------------------------------------

async function mount(element: ReactElement): Promise<TestRenderer.ReactTestRenderer> {
  let renderer!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(
      <SafeAreaProvider
        initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}
      >
        <ThemeProvider override="light">{element}</ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  await flush();
  return renderer;
}

async function flush(ticks = 8): Promise<void> {
  for (let i = 0; i < ticks; i += 1) {
    await TestRenderer.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

/** The pressable labelled `label`, if it is on screen. */
function button(root: ReactTestInstance, label: string): ReactTestInstance | undefined {
  return root.findAll((node) => node.props.accessibilityLabel === label && typeof node.props.onPress === "function")[0];
}

/** The Sheet (Modal) rendering the dialog — present and `visible` when shown. */
function dialogVisible(root: ReactTestInstance): boolean {
  return root
    .findAll((node) => node.props.visible === true && node.props.animationType === "fade")
    .some((node) => node.findAll((n) => n.props.children === copy.support.resolutionTitle).length > 0);
}

async function press(node: ReactTestInstance | undefined): Promise<void> {
  expect(node).toBeDefined();
  await TestRenderer.act(async () => {
    node?.props.onPress();
  });
  await flush();
}

describe("support/[id] — 'Is your issue resolved?'", () => {
  it("opens by itself when support asks", async () => {
    await ticketIn("pendingResolution");
    const renderer = await mount(<SupportTicketScreen />);
    expect(dialogVisible(renderer.root)).toBe(true);
    renderer.unmount();
  });

  it("'not now' leaves the question pending, pinned in a banner — it does NOT decline", async () => {
    const id = await ticketIn("pendingResolution");
    const renderer = await mount(<SupportTicketScreen />);

    await press(button(renderer.root, copy.common.notNow));
    expect(dialogVisible(renderer.root)).toBe(false);
    expect(useSupportStore.getState().tickets.find((t) => t.id === id)?.status).toBe("pendingResolution");

    // The banner brings it back.
    await press(button(renderer.root, copy.support.resolutionAnswer));
    expect(dialogVisible(renderer.root)).toBe(true);
    renderer.unmount();
  });

  it("yes resolves the ticket and swaps the composer for the resolved footer", async () => {
    const id = await ticketIn("pendingResolution");
    const renderer = await mount(<SupportTicketScreen />);

    await press(button(renderer.root, copy.support.resolutionConfirm));
    expect(useSupportStore.getState().tickets.find((t) => t.id === id)?.status).toBe("resolved");
    expect(dialogVisible(renderer.root)).toBe(false);
    expect(button(renderer.root, copy.support.openNewTicket)).toBeDefined();
    expect(button(renderer.root, "Send")).toBeUndefined();
    renderer.unmount();
  });

  it("no keeps the conversation going", async () => {
    const id = await ticketIn("pendingResolution");
    const renderer = await mount(<SupportTicketScreen />);

    await press(button(renderer.root, copy.support.resolutionDecline));
    expect(useSupportStore.getState().tickets.find((t) => t.id === id)?.status).toBe("open");
    expect(dialogVisible(renderer.root)).toBe(false);
    expect(button(renderer.root, "Send")).toBeDefined();
    renderer.unmount();
  });
});
