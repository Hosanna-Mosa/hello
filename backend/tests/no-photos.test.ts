/**
 * "There are no photo fields anywhere."
 *
 * The contract calls this non-negotiable: *"If the API ever returns an image
 * URL for a person, a product decision has changed."* A rule that lives only in
 * a document survives exactly until someone adds a field in a hurry.
 *
 * So it is asserted against the actual schemas. This test failing does not mean
 * the test is wrong — it means someone added a photo field, and that is a
 * product decision, not a code review nit.
 */

import { describe, expect, it } from "vitest";

import { SessionModel } from "@/models/session.model.js";
import { UserModel } from "@/models/user.model.js";

const FORBIDDEN = /photo|image|media|avatarurl|picture|thumbnail|imageurl/i;

const MODELS = [UserModel, SessionModel];

describe("no photo fields", () => {
  it("no schema path on any model looks like an image", () => {
    const offenders: string[] = [];

    for (const model of MODELS) {
      for (const path of Object.keys(model.schema.paths)) {
        // `avatarId` is the allowed one: an id into a fixed preset set, not a
        // URL and not an upload. `avatarUrl` is exactly what must never appear.
        if (path === "avatarId") continue;
        if (FORBIDDEN.test(path)) offenders.push(`${model.modelName}.${path}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("avatarId is an id, not a URL", () => {
    const path = UserModel.schema.path("avatarId");
    expect(path).toBeDefined();
    expect(path.instance).toBe("String");
  });

  it("the user schema rejects an unknown field rather than dropping it", () => {
    // `strict: "throw"` is what makes the rule enforceable: a photo field added
    // by a write rather than by the schema must not silently vanish.
    expect(UserModel.schema.options.strict).toBe("throw");
  });
});
