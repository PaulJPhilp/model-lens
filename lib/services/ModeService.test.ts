import { Effect } from "effect";
/* @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModeService } from "./ModeService";
import { ModeServiceLive } from "./ModeService.live";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock window.matchMedia
const matchMediaMock = vi.fn();

// Mock document
const documentMock = {
  documentElement: {
    classList: {
      toggle: vi.fn(),
    },
  },
};

beforeEach(() => {
  // Setup mocks
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
  });

  Object.defineProperty(window, "matchMedia", {
    value: matchMediaMock,
    writable: true,
  });

  Object.defineProperty(window, "document", {
    value: documentMock,
    writable: true,
  });

  // Reset mocks
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ModeService", () => {
  describe("getMode", () => {
    it("should return stored light mode", async () => {
      localStorageMock.getItem.mockReturnValue("light");

      const program = Effect.gen(function* () {
        const service = yield* ModeService;
        return yield* service.getMode;
      }).pipe(Effect.provide(ModeServiceLive));

      const result = await Effect.runPromise(program);
      expect(result).toBe("light");
      expect(localStorageMock.getItem).toHaveBeenCalledWith("mode");
    });

    it("should return stored dark mode", async () => {
      localStorageMock.getItem.mockReturnValue("dark");

      const program = Effect.gen(function* () {
        const service = yield* ModeService;
        return yield* service.getMode;
      }).pipe(Effect.provide(ModeServiceLive));

      const result = await Effect.runPromise(program);
      expect(result).toBe("dark");
    });

    it("should return system preference when no stored mode", async () => {
      localStorageMock.getItem.mockReturnValue(null);
      matchMediaMock.mockReturnValue({ matches: true });

      const program = Effect.gen(function* () {
        const service = yield* ModeService;
        return yield* service.getMode;
      }).pipe(Effect.provide(ModeServiceLive));

      const result = await Effect.runPromise(program);
      expect(result).toBe("dark");
      expect(matchMediaMock).toHaveBeenCalledWith(
        "(prefers-color-scheme: dark)"
      );
    });

    it("should return light mode when system prefers light", async () => {
      localStorageMock.getItem.mockReturnValue(null);
      matchMediaMock.mockReturnValue({ matches: false });

      const program = Effect.gen(function* () {
        const service = yield* ModeService;
        return yield* service.getMode;
      }).pipe(Effect.provide(ModeServiceLive));

      const result = await Effect.runPromise(program);
      expect(result).toBe("light");
    });

    it("should return light mode for invalid stored value", async () => {
      localStorageMock.getItem.mockReturnValue("invalid");
      matchMediaMock.mockReturnValue({ matches: false });

      const program = Effect.gen(function* () {
        const service = yield* ModeService;
        return yield* service.getMode;
      }).pipe(Effect.provide(ModeServiceLive));

      const result = await Effect.runPromise(program);
      expect(result).toBe("light");
    });
  });

  describe("setMode", () => {
    it("should set light mode", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ModeService;
        return yield* service.setMode("light");
      }).pipe(Effect.provide(ModeServiceLive));

      await Effect.runPromise(program);

      expect(
        documentMock.documentElement.classList.toggle
      ).toHaveBeenCalledWith("dark", false);
      expect(localStorageMock.setItem).toHaveBeenCalledWith("mode", "light");
    });

    it("should set dark mode", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ModeService;
        return yield* service.setMode("dark");
      }).pipe(Effect.provide(ModeServiceLive));

      await Effect.runPromise(program);

      expect(
        documentMock.documentElement.classList.toggle
      ).toHaveBeenCalledWith("dark", true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith("mode", "dark");
    });
  });

  describe("toggleMode", () => {
    it("should toggle from light to dark", async () => {
      localStorageMock.getItem.mockReturnValue("light");

      const program = Effect.gen(function* () {
        const service = yield* ModeService;
        return yield* service.toggleMode;
      }).pipe(Effect.provide(ModeServiceLive));

      const result = await Effect.runPromise(program);

      expect(result).toBe("dark");
      expect(
        documentMock.documentElement.classList.toggle
      ).toHaveBeenCalledWith("dark", true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith("mode", "dark");
    });

    it("should toggle from dark to light", async () => {
      localStorageMock.getItem.mockReturnValue("dark");

      const program = Effect.gen(function* () {
        const service = yield* ModeService;
        return yield* service.toggleMode;
      }).pipe(Effect.provide(ModeServiceLive));

      const result = await Effect.runPromise(program);

      expect(result).toBe("light");
      expect(
        documentMock.documentElement.classList.toggle
      ).toHaveBeenCalledWith("dark", false);
      expect(localStorageMock.setItem).toHaveBeenCalledWith("mode", "light");
    });

    it("should toggle from null (defaults to light) to dark", async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const program = Effect.gen(function* () {
        const service = yield* ModeService;
        return yield* service.toggleMode;
      }).pipe(Effect.provide(ModeServiceLive));

      const result = await Effect.runPromise(program);

      expect(result).toBe("dark");
      expect(
        documentMock.documentElement.classList.toggle
      ).toHaveBeenCalledWith("dark", true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith("mode", "dark");
    });
  });
});
