/**
 * The `fetch` every request uses: `expo/fetch`, chosen explicitly.
 *
 * On SDK 57 Expo installed `expo/fetch` as the global `fetch`, and the client —
 * the raw voice upload above all — was built and debugged against it. On SDK
 * 54 the global is React Native's own fetch, which reads `file://` urls and
 * binary bodies differently. Naming it here keeps behaviour identical whatever
 * a given SDK makes global.
 *
 * Its own module so tests can swap it: `expo/fetch` subclasses a native class
 * that does not exist under Jest, and the suites fake the server by stubbing
 * `global.fetch`. `jest.setup.js` maps this module onto that stub.
 */

import { fetch as expoFetch } from "expo/fetch";

export const httpFetch = expoFetch;

export type HttpResponse = Awaited<ReturnType<typeof expoFetch>>;
