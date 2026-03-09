// Use globalThis so the Map is shared across all Next.js route handler
// module instances (simulate/route.js and simulate/answer/route.js).
// Without this, HMR/module isolation in Next.js dev creates separate Maps.
if (!globalThis.__pendingAnswers) {
  globalThis.__pendingAnswers = new Map();
}
export const pendingAnswers = globalThis.__pendingAnswers;
