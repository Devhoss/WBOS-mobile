import React from "react";
import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { ScannerErrorBoundary } from "@/features/scanner/components/scanner-error-boundary";

/**
 * What a picker sees when the scanner crashes.
 *
 * The boundary printed `err.message` and three stack frames onto a black
 * screen with no controls at all — a stack trace and a dead end, mid-task, for
 * someone standing in a warehouse. The only way out was the OS back gesture.
 */

function Boom(): React.ReactElement {
  throw new Error("Cannot read properties of undefined (reading 'controller')");
}

describe("the scanner error boundary", () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

  afterAll(() => consoleError.mockRestore());

  beforeEach(() => consoleError.mockClear());

  it("renders its children when nothing is wrong", async () => {
    const view = await render(
      <ScannerErrorBoundary onDismiss={jest.fn()}>
        <Text>camera</Text>
      </ScannerErrorBoundary>,
    );
    expect(view.getByText("camera")).toBeTruthy();
  });

  it("explains what happened in plain words", async () => {
    const view = await render(
      <ScannerErrorBoundary onDismiss={jest.fn()}>
        <Boom />
      </ScannerErrorBoundary>,
    );
    expect(view.getByText("The scanner stopped")).toBeTruthy();
  });

  it("never shows the exception message or a stack trace", async () => {
    const view = await render(
      <ScannerErrorBoundary onDismiss={jest.fn()}>
        <Boom />
      </ScannerErrorBoundary>,
    );
    expect(view.queryByText(/Cannot read properties/)).toBeNull();
    expect(view.queryByText(/controller/)).toBeNull();
    expect(view.queryByText(/at .*\.tsx/)).toBeNull();
  });

  it("still logs the detail for whoever has to fix it", async () => {
    await render(
      <ScannerErrorBoundary onDismiss={jest.fn()}>
        <Boom />
      </ScannerErrorBoundary>,
    );
    const logged = consoleError.mock.calls.flat().join(" ");
    expect(logged).toContain("Cannot read properties");
  });

  it("offers a way out instead of dead-ending", async () => {
    const view = await render(
      <ScannerErrorBoundary onDismiss={jest.fn()}>
        <Boom />
      </ScannerErrorBoundary>,
    );
    expect(view.getByText("Try Again")).toBeTruthy();
    expect(view.getByText("Back to Pick Order")).toBeTruthy();
  });

  it("Back to Pick Order hands control back to the screen", async () => {
    const onDismiss = jest.fn();
    const view = await render(
      <ScannerErrorBoundary onDismiss={onDismiss}>
        <Boom />
      </ScannerErrorBoundary>,
    );
    fireEvent.press(view.getByText("Back to Pick Order"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("Try Again re-renders the children rather than staying broken", async () => {
    let shouldThrow = true;
    function Flaky() {
      if (shouldThrow) throw new Error("boom");
      return <Text>camera back</Text>;
    }

    const view = await render(
      <ScannerErrorBoundary onDismiss={jest.fn()}>
        <Flaky />
      </ScannerErrorBoundary>,
    );
    expect(view.getByText("The scanner stopped")).toBeTruthy();

    shouldThrow = false;
    fireEvent.press(view.getByText("Try Again"));
    expect(await view.findByText("camera back")).toBeTruthy();
  });

  it("reassures the picker that their picks are safe", async () => {
    const view = await render(
      <ScannerErrorBoundary onDismiss={jest.fn()}>
        <Boom />
      </ScannerErrorBoundary>,
    );
    expect(view.getByText(/Nothing you picked has been lost/)).toBeTruthy();
  });
});
