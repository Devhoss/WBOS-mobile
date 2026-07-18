import { useRef, useCallback } from "react";

export interface BarcodeObservation {
  value: string;
  centerX?: number;
  centerY?: number;
  width?: number;
  height?: number;
}

type BarcodeState = {
  lastSeen: number;
  visible: boolean;
  lastAcceptedAt: number;
  lastAcceptedSignature: BarcodeSignature | null;
};

type BarcodeSignature = {
  centerX: number;
  centerY: number;
  area: number;
};

interface BarcodePresenceOptions {
  absenceTimeout?: number;
  staleTimeout?: number;
  minRepeatInterval?: number;
  movementThreshold?: number;
  areaChangeThreshold?: number;
}

let scanCounter = 0;

function presenceLog(message: string, data?: unknown) {
  if (__DEV__) {
    console.log(`[WBOS_PRESENCE] ${message}`, data ?? "");
  }
}

export function useBarcodePresence(
  onBarcodePresented: (barcode: string, scanId?: number) => void,
  options?: BarcodePresenceOptions,
) {
  const {
    absenceTimeout = 120,
    staleTimeout = 10000,
    minRepeatInterval = 280,
    movementThreshold = 22,
    areaChangeThreshold = 0.18,
  } = options ?? {};
  const onBarcodePresentedRef = useRef(onBarcodePresented);
  onBarcodePresentedRef.current = onBarcodePresented;

  const barcodePresence = useRef(new Map<string, BarcodeState>());

  const handleFrame = useCallback(
    (barcodes: Array<string | BarcodeObservation>) => {
      const now = performance.now();
      const presence = barcodePresence.current;
      const observations = barcodes.map((barcode) =>
        typeof barcode === "string" ? { value: barcode } : barcode,
      );
      const visible = new Set(observations.map((barcode) => barcode.value));

      for (const observation of observations) {
        const code = observation.value;
        const state = presence.get(code);
        const signature = getSignature(observation);
        const moved = state?.lastAcceptedSignature && signature
          ? hasMeaningfulMovement(state.lastAcceptedSignature, signature, movementThreshold, areaChangeThreshold)
          : false;
        const canRepeatByMovement =
          !!state?.visible &&
          !!moved &&
          now - state.lastAcceptedAt >= minRepeatInterval;

        if (!state || !state.visible || canRepeatByMovement) {
          const id = ++scanCounter;
          presenceLog("accepted", {
            id,
            code,
            reason: !state ? "new" : !state.visible ? "re-presented-after-gap" : "movement-rearm",
            hiddenForMs: state ? Math.round(now - state.lastSeen) : null,
            moved,
            signature,
          });
          onBarcodePresentedRef.current(code, id);
          presence.set(code, {
            lastSeen: now,
            visible: true,
            lastAcceptedAt: now,
            lastAcceptedSignature: signature,
          });
        } else {
          state.lastSeen = now;
        }
      }

      for (const [code, state] of presence) {
        if (!visible.has(code) && state.visible && now - state.lastSeen > absenceTimeout) {
          state.visible = false;
          presenceLog("marked-not-visible", {
            code,
            gapMs: Math.round(now - state.lastSeen),
            absenceTimeout,
          });
        }
      }

      if (now % 1000 < 16) {
        for (const [code, state] of presence) {
          if (now - state.lastSeen > staleTimeout) {
            presence.delete(code);
            presenceLog("deleted-stale", { code, staleMs: Math.round(now - state.lastSeen) });
          }
        }
      }
    },
    [absenceTimeout, staleTimeout, minRepeatInterval, movementThreshold, areaChangeThreshold],
  );

  const consumeBarcode = useCallback((barcode: string) => {
    const state = barcodePresence.current.get(barcode);
    if (state) {
      state.visible = true;
    }
  }, []);

  return { handleFrame, consumeBarcode };
}

function getSignature(observation: BarcodeObservation): BarcodeSignature | null {
  if (
    typeof observation.centerX !== "number" ||
    typeof observation.centerY !== "number" ||
    typeof observation.width !== "number" ||
    typeof observation.height !== "number"
  ) {
    return null;
  }
  return {
    centerX: observation.centerX,
    centerY: observation.centerY,
    area: Math.max(1, observation.width * observation.height),
  };
}

function hasMeaningfulMovement(
  previous: BarcodeSignature,
  next: BarcodeSignature,
  movementThreshold: number,
  areaChangeThreshold: number,
) {
  const dx = next.centerX - previous.centerX;
  const dy = next.centerY - previous.centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const areaChange = Math.abs(next.area - previous.area) / Math.max(previous.area, 1);
  return distance >= movementThreshold || areaChange >= areaChangeThreshold;
}
