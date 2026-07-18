import { useQuery } from "@tanstack/react-query";
import { getStockByBarcode, getStockLevel } from "@/api/inventory";

export function useStockLookupByBarcode(barcode: string | null, warehouseId: string) {
  return useQuery({
    queryKey: ["stock", "barcode", barcode, warehouseId],
    queryFn: () => getStockByBarcode(barcode!, warehouseId),
    enabled: !!barcode,
    retry: 1,
    staleTime: 30 * 1000,
  });
}

export function useStockLookup(productId: string, warehouseId: string) {
  return useQuery({
    queryKey: ["stock", "product", productId, warehouseId],
    queryFn: () => getStockLevel(warehouseId, productId),
    enabled: !!productId && !!warehouseId,
    staleTime: 30 * 1000,
  });
}
