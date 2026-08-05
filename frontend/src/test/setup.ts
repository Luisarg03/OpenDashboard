import '@testing-library/jest-dom';

// jsdom has no ResizeObserver; components measure themselves with it
// (TimelineScrubber, React Flow). The mock reports a fixed 800x600 box.
class ResizeObserverMock {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element): void {
    this.callback(
      [
        {
          target,
          contentRect: { width: 800, height: 600 },
        },
      ] as unknown as ResizeObserverEntry[],
      this,
    );
  }

  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver =
  ResizeObserverMock as unknown as typeof ResizeObserver;
