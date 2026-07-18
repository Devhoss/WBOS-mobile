import { useEffect, useRef } from "react";

export function useMount(callback: () => void) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    callback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
