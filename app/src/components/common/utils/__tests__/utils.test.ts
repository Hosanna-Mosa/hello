/**
 * Unit checks for the shared utils.
 *
 * The age boundary gets the most attention: it is the 18+ hard stop, and an
 * off-by-one there admits a minor to the product.
 */

import { calculateAge, isOldEnough } from "@/components/common/utils/calculateAge";
import { formatDistance } from "@/components/common/utils/formatDistance";
import { formatRelativeTime } from "@/components/common/utils/formatRelativeTime";
import { formatRupees } from "@/components/common/utils/formatRupees";
import {
  profileCompleteness,
  profileCompletenessPercent,
} from "@/components/common/utils/profileCompleteness";

describe("formatDistance", () => {
  it("never shows a precise point below 1 km", () => {
    expect(formatDistance(0)).toBe("Less than 1 km away");
    expect(formatDistance(999)).toBe("Less than 1 km away");
  });

  it("keeps the half below 10 km", () => {
    expect(formatDistance(2000)).toBe("2 km away");
    expect(formatDistance(2500)).toBe("2.5 km away");
  });

  it("drops the half above 10 km", () => {
    expect(formatDistance(24_600)).toBe("25 km away");
  });

  it("caps rather than showing a huge number", () => {
    expect(formatDistance(450_000)).toBe("Over 100 km away");
  });

  it("degrades safely on nonsense input", () => {
    expect(formatDistance(-1)).toBe("Nearby");
    expect(formatDistance(Number.NaN)).toBe("Nearby");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-09-19T12:00:00Z").getTime();
  const ago = (ms: number) => formatRelativeTime(now - ms, now);

  it("reads a future timestamp as now rather than negative", () => {
    expect(formatRelativeTime(now + 60_000, now)).toBe("Now");
  });

  it("steps through the scale", () => {
    expect(ago(30_000)).toBe("Now");
    expect(ago(5 * 60_000)).toBe("5m");
    expect(ago(3 * 3_600_000)).toBe("3h");
    expect(ago(30 * 3_600_000)).toBe("Yesterday");
    expect(ago(4 * 86_400_000)).toBe("4d");
  });

  it("falls back to a date beyond a week", () => {
    expect(ago(20 * 86_400_000)).toMatch(/\d+ \w{3}/);
  });
});

describe("calculateAge — the 18+ gate", () => {
  const today = new Date("2026-09-19T00:00:00Z");

  it("counts whole years", () => {
    expect(calculateAge("1998-03-14", today)).toBe(28);
  });

  it("does NOT round up a birthday that has not happened yet", () => {
    // Turns 18 tomorrow — must still read as 17.
    expect(calculateAge("2008-09-20", today)).toBe(17);
    expect(isOldEnough("2008-09-20", today)).toBe(false);
  });

  it("admits someone exactly on their 18th birthday", () => {
    expect(calculateAge("2008-09-19", today)).toBe(18);
    expect(isOldEnough("2008-09-19", today)).toBe(true);
  });

  it("rejects the day before the 18th birthday", () => {
    expect(isOldEnough("2008-09-20", today)).toBe(false);
  });

  it("handles an invalid date without silently admitting anyone", () => {
    expect(Number.isNaN(calculateAge("not-a-date", today))).toBe(true);
    expect(isOldEnough("not-a-date", today)).toBe(false);
  });
});

describe("profileCompleteness", () => {
  it("is 0 for an empty profile", () => {
    expect(profileCompleteness({})).toBe(0);
  });

  it("is 1 for a finished profile", () => {
    expect(
      profileCompleteness({
        name: "Maya",
        birthday: "1998-03-14",
        gender: "Woman",
        avatarId: "avatar-07",
        bio: "Weekend hiker, terrible cook.",
        interests: ["hiking", "board-games", "coffee"],
      }),
    ).toBe(1);
  });

  it("does not credit interests below the minimum of 3", () => {
    const two = profileCompleteness({ interests: ["hiking", "coffee"] });
    const three = profileCompleteness({ interests: ["hiking", "coffee", "film"] });
    expect(two).toBe(0);
    expect(three).toBeGreaterThan(0);
  });

  it("ignores whitespace-only values", () => {
    expect(profileCompleteness({ name: "   ", bio: "  " })).toBe(0);
  });

  it("reports a whole percent", () => {
    expect(profileCompletenessPercent({ name: "Maya" })).toBe(9);
  });
});

describe("formatRupees", () => {
  it("shows paise as whole rupees with the ₹ sign and Indian grouping", () => {
    expect(formatRupees(29900)).toBe("₹299");
    expect(formatRupees(149900)).toBe("₹1,499");
    expect(formatRupees(10000000)).toBe("₹1,00,000");
  });

  it("rounds a derived per-month figure to whole rupees", () => {
    expect(formatRupees(149900 / 6)).toBe("₹250");
  });
});
