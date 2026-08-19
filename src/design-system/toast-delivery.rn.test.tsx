import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";

import { Toast } from "@/design-system/components/feedback/toast";
import { useToast } from "@/design-system/hooks/use-toast";

/**
 * A raised toast must actually reach the screen.
 *
 * The picking screen returns early into a scanner branch, and the only `<Toast>`
 * lived in the branch below it. `handleCompleteTask` reopened the scanner on
 * failure and then raised a toast — into a render path with nothing to render
 * it. Every source-level guard passed: the handler did catch, did call
 * `toUserMessage`, did call `showToast(..., "error")`. The picker still saw
 * nothing. Only a rendering test can tell those two apart.
 */

/** A screen with two branches, mirroring the picking screen's shape. */
function TwoBranchScreen({ mountToastInBranch }: { mountToastInBranch: boolean }) {
  const { toast, showToast, hideToast } = useToast();
  const [inBranch, setInBranch] = useState(false);

  function failThenSwitchBranch() {
    setInBranch(true);
    showToast("Could not complete this task. Try again.", "error");
  }

  if (inBranch) {
    return (
      <View>
        <Text>branch</Text>
        {mountToastInBranch ? (
          <Toast
            message={toast.message}
            variant={toast.variant}
            visible={toast.visible}
            onHide={hideToast}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View>
      <TouchableOpacity onPress={failThenSwitchBranch}>
        <Text>Complete</Text>
      </TouchableOpacity>
      <Toast
        message={toast.message}
        variant={toast.variant}
        visible={toast.visible}
        onHide={hideToast}
      />
    </View>
  );
}

describe("a failure message reaches the user", () => {
  it("is invisible when the branch it lands in mounts no Toast", async () => {
    // This is the bug, reproduced: identical handler, no Toast on the path.
    const view = await render(<TwoBranchScreen mountToastInBranch={false} />);
    fireEvent.press(view.getByText("Complete"));
    expect(await view.findByText("branch")).toBeTruthy();
    expect(view.queryByText(/Could not complete this task/)).toBeNull();
  });

  it("is visible once that branch mounts one", async () => {
    const view = await render(<TwoBranchScreen mountToastInBranch />);
    fireEvent.press(view.getByText("Complete"));
    expect(await view.findByText(/Could not complete this task/)).toBeTruthy();
  });
});

describe("the Toast component itself", () => {
  it("shows nothing while not visible", async () => {
    const view = await render(
      <Toast message="hidden" visible={false} onHide={jest.fn()} />,
    );
    expect(view.queryByText("hidden")).toBeNull();
  });

  it("shows nothing when there is no message to show", async () => {
    const view = await render(<Toast message="" visible onHide={jest.fn()} />);
    expect(view.toJSON()).toBeNull();
  });

  it("renders the message it was given", async () => {
    const view = await render(
      <Toast message="No connection to the server." visible onHide={jest.fn()} />,
    );
    expect(view.getByText("No connection to the server.")).toBeTruthy();
  });

  it("hides itself when its own animation finishes", async () => {
    jest.useFakeTimers();
    const onHide = jest.fn();
    await render(<Toast message="gone soon" visible onHide={onHide} duration={100} />);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(onHide).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("a second message replaces the first rather than inheriting its timer", async () => {
    // The animation effect keyed only on `visible`, so a toast raised while one
    // was showing swapped the text mid-fade and vanished early.
    const onHide = jest.fn();
    const view = await render(
      <Toast message="first" visible onHide={onHide} duration={5000} />,
    );
    expect(view.getByText("first")).toBeTruthy();

    await view.rerender(<Toast message="second" visible onHide={onHide} duration={5000} />);
    expect(view.getByText("second")).toBeTruthy();
    expect(onHide).not.toHaveBeenCalled();
  });
});
