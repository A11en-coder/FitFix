const RETRY_DELAYS_MS = [0, 250, 500, 750, 1_000, 1_500, 2_000, 2_000, 2_000] as const;

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export async function waitForActiveMembership(
  check: () => Promise<boolean>,
  pause: (milliseconds: number) => Promise<void> = delay,
): Promise<boolean> {
  for (const retryDelay of RETRY_DELAYS_MS) {
    if (retryDelay > 0) await pause(retryDelay);
    try {
      if (await check()) return true;
    } catch {
      // Treat temporary request failures as not-ready and retry within the same bound.
    }
  }

  return false;
}
