import '@testing-library/jest-dom'

// jsdom doesn't implement ResizeObserver, but @xyflow/react (CanvasEditor)
// uses it internally to measure the viewport -- without this, any test
// that renders CanvasEditor throws "ResizeObserver is not defined" before
// it gets anywhere near the assertions actually being tested.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub
