import { useQuery } from "@tanstack/react-query";
import { resolveBarcode } from "@/api/scanner";

export function useBarcodeResult(barcode: string | null) {
  return useQuery({
    queryKey: ["barcode", barcode],
    queryFn: () => resolveBarcode(barcode!),
    enabled: !!barcode,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
}
