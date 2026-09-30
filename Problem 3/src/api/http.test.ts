import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJson, HttpError, shouldRetry } from "./http";
import { DataValidationError } from "../wallet/validation";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("HTTP transport", () => {
  it("checks HTTP status instead of accepting an error body as data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 403 })));
    await expect(fetchJson("/api", new AbortController().signal)).rejects.toMatchObject({ status: 403 });
  });
  it("rejects invalid JSON without retrying it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Oops</html>")));
    await expect(fetchJson("/api", new AbortController().signal)).rejects.toBeInstanceOf(DataValidationError);
  });
  it("forwards cancellation to fetch", async () => {
    const controller = new AbortController();
    let observedSignal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn((_url: string, options: RequestInit) => {
      observedSignal = options.signal ?? undefined;
      return Promise.resolve(new Response("[]"));
    }));
    await fetchJson("/api", controller.signal);
    controller.abort();
    expect(observedSignal?.aborted).toBe(true);
  });
  it("applies a ten-second timeout to the request signal", async () => {
    const timeout = new AbortController();
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeout.signal);
    vi.stubGlobal("fetch", vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
    })));
    const pending = fetchJson("/api", new AbortController().signal);
    timeout.abort(new DOMException("Timed out", "TimeoutError"));
    await expect(pending).rejects.toMatchObject({ name: "TimeoutError" });
    expect(timeoutSpy).toHaveBeenCalledWith(10_000);
  });
  it("retries only transient failures with a bounded attempt count", () => {
    expect(shouldRetry(0, new HttpError(503))).toBe(true);
    expect(shouldRetry(0, new HttpError(429))).toBe(true);
    expect(shouldRetry(0, new TypeError("Network failure"))).toBe(true);
    expect(shouldRetry(2, new HttpError(503))).toBe(false);
    expect(shouldRetry(0, new HttpError(401))).toBe(false);
    expect(shouldRetry(0, new DataValidationError("Invalid data"))).toBe(false);
    expect(shouldRetry(0, new DOMException("Cancelled", "AbortError"))).toBe(false);
  });
});
