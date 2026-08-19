import { configure, fireEvent, render, waitFor } from "@testing-library/react-native";

// The first render in this file pays for module loading and the React Native
// transform, which lands within a few tens of milliseconds of RNTL's 1s default
// before the screen's initial fetch has even resolved. Raised so a slower CI
// machine fails for a real reason rather than for that.
configure({ asyncUtilTimeout: 8000 });

/**
 * Behavioural cover for the proof-of-delivery screen.
 *
 * Deliberately NOT under `src/app`. Expo Router builds its route table with
 * `require.context` over that directory, which pulls in every file it finds —
 * a test file there drags React Native Testing Library into the app bundle,
 * and RNTL requires Node's `console`, which Metro cannot resolve. The result is
 * that the app fails to bundle at all. Typecheck, lint and Jest all still pass,
 * so nothing catches it except starting the app.
 *
 * The pure queue logic is tested under Vitest; what needs a renderer is the
 * wiring — that the Take Photo button actually reaches the system camera, that
 * a partial failure leaves a retry the driver can press, and that reopening the
 * delivery shows the pages already on file. Those are exactly the joins that a
 * source-level assertion passes on for the wrong reason.
 */

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ soId: "so-1" }),
}));

const mockTakePhoto = jest.fn();
const mockPickLibrary = jest.fn();
jest.mock("@/features/proof-of-delivery/hooks/pick-pod-files", () => ({
  takePodPhoto: (...args: unknown[]) => mockTakePhoto(...args),
  pickPodFromLibrary: (...args: unknown[]) => mockPickLibrary(...args),
}));

const mockGetPod = jest.fn();
const mockUpload = jest.fn();
const mockRemove = jest.fn();
const mockReorder = jest.fn();
const mockDownloadUrl = jest.fn();
jest.mock("@/api/proof-of-delivery", () => ({
  getProofOfDelivery: (...args: unknown[]) => mockGetPod(...args),
  uploadPodDocument: (...args: unknown[]) => mockUpload(...args),
  removePodDocument: (...args: unknown[]) => mockRemove(...args),
  reorderPodDocuments: (...args: unknown[]) => mockReorder(...args),
  getPodDownloadUrl: (...args: unknown[]) => mockDownloadUrl(...args),
}));

import { Linking } from "react-native";

import ProofOfDeliveryScreen from "@/app/(app)/proof-of-delivery/[soId]";

// Spied on the real object rather than mocked by module path: React Native
// re-exports Linking from an internal path that differs between versions, and a
// path mock that misses simply never intercepts — the assertion then fails for
// a reason that has nothing to do with the screen.
const mockOpenURL = jest.spyOn(Linking, "openURL");

function document(id: string, pageNumber: number) {
  return {
    id,
    fileName: `${id}.jpg`,
    mimeType: "image/jpeg",
    sizeBytes: 2048,
    pageNumber,
    url: `/api/uploads/uploads/attachments/org/SHIPMENT/ship-1/${id}.jpg`,
    uploadedAt: new Date().toISOString(),
    uploadedBy: { id: "u1", name: "Driver" },
  };
}

function view(documents: ReturnType<typeof document>[] = []) {
  return {
    salesOrderId: "so-1",
    soNumber: "SO-2026-000123",
    deliveries: [
      {
        shipmentId: "ship-1",
        shipmentNumber: "SH-0001",
        status: "DELIVERED",
        deliveredAt: new Date().toISOString(),
        documents,
      },
    ],
    legacySignedInvoicePath: null,
  };
}

function picked(name: string, source: "camera" | "library" = "camera") {
  return { uri: `file:///${name}`, name, type: "image/jpeg", source };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPod.mockResolvedValue(view());
  mockUpload.mockResolvedValue({ document: document("doc-new", 1), duplicate: false });
  mockRemove.mockResolvedValue(undefined);
  mockReorder.mockResolvedValue([]);
  mockDownloadUrl.mockResolvedValue("https://wbos.test/api/proof-of-delivery/download/tok");
  mockOpenURL.mockResolvedValue(true);
});

describe("reopening a delivery", () => {
  it("shows the pages already on file", async () => {
    mockGetPod.mockResolvedValue(view([document("doc-a", 1), document("doc-b", 2)]));

    const screen = await render(<ProofOfDeliveryScreen />);

    await waitFor(() => expect(screen.getByText("doc-a.jpg")).toBeTruthy());
    expect(screen.getByText("doc-b.jpg")).toBeTruthy();
    expect(screen.getByText("2 saved")).toBeTruthy();
  });

  it("says so plainly when nothing has been attached yet", async () => {
    const screen = await render(<ProofOfDeliveryScreen />);

    await waitFor(() => expect(screen.getByText(/Nothing attached yet/i)).toBeTruthy());
  });
});

describe("choosing pages", () => {
  it("reaches the phone's camera, not an in-app viewfinder", async () => {
    mockTakePhoto.mockResolvedValue({ ok: true, files: [picked("shot.jpg")] });

    const screen = await render(<ProofOfDeliveryScreen />);
    await waitFor(() => expect(screen.getByLabelText("Take photo")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Take photo"));

    await waitFor(() => expect(mockTakePhoto).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("shot.jpg")).toBeTruthy());
  });

  it("accepts several photos from the gallery in one go", async () => {
    mockPickLibrary.mockResolvedValue({
      ok: true,
      files: [picked("saved-1.jpg", "library"), picked("saved-2.jpg", "library")],
    });

    const screen = await render(<ProofOfDeliveryScreen />);
    await waitFor(() => expect(screen.getByLabelText("Choose from gallery")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Choose from gallery"));

    await waitFor(() => expect(screen.getByText("saved-1.jpg")).toBeTruthy());
    expect(screen.getByText("saved-2.jpg")).toBeTruthy();
    expect(screen.getByText("Upload 2 pages")).toBeTruthy();
  });

  it("mixes a camera photo and gallery photos in one upload session", async () => {
    mockTakePhoto.mockResolvedValue({ ok: true, files: [picked("shot.jpg", "camera")] });
    mockPickLibrary.mockResolvedValue({ ok: true, files: [picked("saved.jpg", "library")] });

    const screen = await render(<ProofOfDeliveryScreen />);
    await waitFor(() => expect(screen.getByLabelText("Take photo")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Take photo"));
    await waitFor(() => expect(screen.getByText("shot.jpg")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Choose from gallery"));
    await waitFor(() => expect(screen.getByText("saved.jpg")).toBeTruthy());

    // Both sources sit in one queue and upload together.
    expect(screen.getByText("Upload 2 pages")).toBeTruthy();
  });

  it("stays silent when the driver backs out of the picker", async () => {
    mockPickLibrary.mockResolvedValue({ ok: false, reason: "cancelled" });

    const screen = await render(<ProofOfDeliveryScreen />);
    await waitFor(() => expect(screen.getByLabelText("Choose from gallery")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Choose from gallery"));

    // Cancelling is not an error and must not raise a message.
    await waitFor(() => expect(mockPickLibrary).toHaveBeenCalled());
    expect(screen.queryByText(/failed/i)).toBeNull();
    expect(screen.queryByText(/blocked/i)).toBeNull();
  });

  it("explains a refused permission instead of failing silently", async () => {
    mockTakePhoto.mockResolvedValue({
      ok: false,
      reason: "denied",
      message: "Camera access is blocked. Enable it for WBOS in your phone's settings.",
    });

    const screen = await render(<ProofOfDeliveryScreen />);
    await waitFor(() => expect(screen.getByLabelText("Take photo")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Take photo"));

    await waitFor(() => expect(screen.getByText(/Camera access is blocked/i)).toBeTruthy());
  });

  it("drops a queued page the driver changes their mind about", async () => {
    mockPickLibrary.mockResolvedValue({
      ok: true,
      files: [picked("keep.jpg", "library"), picked("drop.jpg", "library")],
    });

    const screen = await render(<ProofOfDeliveryScreen />);
    await waitFor(() => expect(screen.getByLabelText("Choose from gallery")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Choose from gallery"));
    await waitFor(() => expect(screen.getByText("drop.jpg")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Remove drop.jpg from the upload list"));

    await waitFor(() => expect(screen.queryByText("drop.jpg")).toBeNull());
    expect(screen.getByText("keep.jpg")).toBeTruthy();
  });

  it("reorders queued pages before any of them are sent", async () => {
    mockPickLibrary.mockResolvedValue({
      ok: true,
      files: [picked("first.jpg", "library"), picked("second.jpg", "library")],
    });

    const screen = await render(<ProofOfDeliveryScreen />);
    await waitFor(() => expect(screen.getByLabelText("Choose from gallery")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Choose from gallery"));
    await waitFor(() => expect(screen.getByText("second.jpg")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Move second.jpg earlier"));

    // The move has to be on screen before Upload is pressed — the reorder
    // commits on a later tick, and pressing into the same tick would test the
    // previous order.
    await waitFor(() =>
      expect(screen.getAllByText(/\.jpg$/).map((node) => node.props.children)).toEqual([
        "second.jpg",
        "first.jpg",
      ]),
    );

    // Upload order decides page order, so the queue order has to carry through.
    fireEvent.press(screen.getByLabelText("Upload pages"));
    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(2));
    expect(mockUpload.mock.calls[0][1].name).toBe("second.jpg");
    expect(mockUpload.mock.calls[1][1].name).toBe("first.jpg");
    // Let the run settle so no upload is still in flight when the screen
    // unmounts; a leaked one poisons whichever test happens to run next.
    await waitFor(() => expect(mockGetPod).toHaveBeenCalledTimes(2));
  });
});

describe("uploading", () => {
  it("sends every queued page to the delivery", async () => {
    mockPickLibrary.mockResolvedValue({
      ok: true,
      files: [picked("a.jpg", "library"), picked("b.jpg", "library")],
    });

    const screen = await render(<ProofOfDeliveryScreen />);
    await waitFor(() => expect(screen.getByLabelText("Choose from gallery")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Choose from gallery"));
    await waitFor(() => expect(screen.getByText("Upload 2 pages")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Upload pages"));

    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(2));
    expect(mockUpload.mock.calls[0][0]).toBe("ship-1");
    // Refreshed afterwards, so the saved set on screen includes the new pages.
    await waitFor(() => expect(mockGetPod).toHaveBeenCalledTimes(2));
  });

  it("keeps the pages that failed on screen when only some succeed", async () => {
    mockPickLibrary.mockResolvedValue({
      ok: true,
      files: [picked("good.jpg", "library"), picked("bad.jpg", "library")],
    });
    mockUpload
      .mockResolvedValueOnce({ document: document("doc-good", 1), duplicate: false })
      .mockRejectedValueOnce(new Error("Network error"));

    const screen = await render(<ProofOfDeliveryScreen />);
    await waitFor(() => expect(screen.getByLabelText("Choose from gallery")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Choose from gallery"));
    await waitFor(() => expect(screen.getByText("Upload 2 pages")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Upload pages"));

    // The failure is reported, not swallowed, and offers a retry.
    await waitFor(() => expect(screen.getByText("Retry 1 failed")).toBeTruthy());
    expect(screen.getByText("bad.jpg")).toBeTruthy();
    expect(screen.getByText("1 of 2 failed to upload")).toBeTruthy();
  });

  it("retries only the failed page, not the ones that already landed", async () => {
    mockPickLibrary.mockResolvedValue({
      ok: true,
      files: [picked("good.jpg", "library"), picked("bad.jpg", "library")],
    });
    mockUpload
      .mockResolvedValueOnce({ document: document("doc-good", 1), duplicate: false })
      .mockRejectedValueOnce(new Error("Network error"));

    const screen = await render(<ProofOfDeliveryScreen />);
    await waitFor(() => expect(screen.getByLabelText("Choose from gallery")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Choose from gallery"));
    await waitFor(() => expect(screen.getByText("Upload 2 pages")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Upload pages"));
    await waitFor(() => expect(screen.getByText("Retry 1 failed")).toBeTruthy());

    mockUpload.mockResolvedValue({ document: document("doc-bad", 2), duplicate: false });
    fireEvent.press(screen.getByLabelText("Retry failed uploads"));

    // Three calls in total: two in the first pass, one retry — the page that
    // succeeded is never re-sent.
    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(3));
    expect(mockUpload.mock.calls[2][1].name).toBe("bad.jpg");
  });

  it("reports a page the server already had as a duplicate rather than a new page", async () => {
    mockPickLibrary.mockResolvedValue({ ok: true, files: [picked("again.jpg", "library")] });
    mockUpload.mockResolvedValue({ document: document("doc-a", 1), duplicate: true });

    const screen = await render(<ProofOfDeliveryScreen />);
    await waitFor(() => expect(screen.getByLabelText("Choose from gallery")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Choose from gallery"));
    await waitFor(() => expect(screen.getByText("Upload 1 page")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Upload pages"));

    await waitFor(() => expect(screen.getByText("Already uploaded")).toBeTruthy());
  });
});

describe("managing saved pages", () => {
  it("reorders a saved page through the server", async () => {
    mockGetPod.mockResolvedValue(view([document("doc-a", 1), document("doc-b", 2)]));

    const screen = await render(<ProofOfDeliveryScreen />);
    await waitFor(() => expect(screen.getByText("doc-b.jpg")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Move page 2 earlier"));

    await waitFor(() => expect(mockReorder).toHaveBeenCalledWith("ship-1", ["doc-b", "doc-a"]));
  });

  it("asks for a signed URL rather than opening the storage path directly", async () => {
    mockGetPod.mockResolvedValue(view([document("doc-a", 1)]));

    const screen = await render(<ProofOfDeliveryScreen />);
    await waitFor(() => expect(screen.getByText("doc-a.jpg")).toBeTruthy());

    fireEvent.press(screen.getByText("doc-a.jpg"));

    // The system browser carries no token; opening `url` directly would 401.
    await waitFor(() => expect(mockDownloadUrl).toHaveBeenCalledWith("doc-a"));
    await waitFor(() =>
      expect(mockOpenURL).toHaveBeenCalledWith(
        "https://wbos.test/api/proof-of-delivery/download/tok",
      ),
    );
  });

  it("reports a failure to open instead of appearing to do nothing", async () => {
    mockGetPod.mockResolvedValue(view([document("doc-a", 1)]));
    mockDownloadUrl.mockRejectedValue(new Error("nope"));

    const screen = await render(<ProofOfDeliveryScreen />);
    await waitFor(() => expect(screen.getByText("doc-a.jpg")).toBeTruthy());

    fireEvent.press(screen.getByText("doc-a.jpg"));

    await waitFor(() => expect(screen.getByText(/Could not open this document/i)).toBeTruthy());
  });
});
