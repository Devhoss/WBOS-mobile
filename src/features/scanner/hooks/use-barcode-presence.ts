import { useRef, useCallback } from "react";

export interface BarcodeObservation {
  value: string;
}

type BarcodeState = {
  lastSeen: number;
  visible: boolean;
  lastAcceptedAt: number;
};

interface BarcodePresenceOptions {
  absenceTimeout?: number;
  lockoutTimeout?: number;
  staleTimeout?: number;
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
    lockoutTimeout = 1000,
    staleTimeout = 10000,
  } = options ?? {};
  const onBarcodePresentedRef = useRef(onBarcodePresented);
  onBarcodePresentedRef.current = onBarcodePresented;

  const barcodePresence = useRef(new Map<string, BarcodeState>());
  const acceptedAt = useRef(new Map<string, number>());

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

        if (!state) {
          const sinceLastAccept = now - (acceptedAt.current.get(code) ?? 0);
          if (sinceLastAccept < 200) {
            presenceLog("guard-rejected-duplicate", { code, sinceLastAccept });
            continue;
          }
          const id = ++scanCounter;
          presenceLog("accepted", { id, code, reason: "new" });
          acceptedAt.current.set(code, now);
          onBarcodePresentedRef.current(code, id);
          presence.set(code, {
            lastSeen: now, visible: true, lastAcceptedAt: now,
          });
        } else if (!state.visible) {
          const hiddenForMs = Math.round(now - state.lastSeen);
          if (hiddenForMs < lockoutTimeout) {
            presenceLog("restored-after-brief-gap", { code, hiddenForMs });
            state.visible = true;
            state.lastSeen = now;
          } else {
            const sinceLastAccept = now - (acceptedAt.current.get(code) ?? 0);
            if (sinceLastAccept < 200) {
              presenceLog("guard-rejected-duplicate", { code, sinceLastAccept });
              continue;
            }
            const id = ++scanCounter;
            presenceLog("accepted", { id, code, reason: "re-presented-after-gap", hiddenForMs });
            acceptedAt.current.set(code, now);
            onBarcodePresentedRef.current(code, id);
            state.lastSeen = now;
            state.visible = true;
            state.lastAcceptedAt = now;
          }
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
    [absenceTimeout, lockoutTimeout, staleTimeout],
  );

  const consumeBarcode = useCallback((barcode: string) => {
    const state = barcodePresence.current.get(barcode);
    if (state) {
      state.visible = true;
    }
  }, []);

  return { handleFrame, consumeBarcode };
}
