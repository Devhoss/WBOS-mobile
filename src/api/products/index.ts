import client from "@/infrastructure/api/client";
import { apiUrl } from "@/infrastructure/api/config";
import type { ApiResponse, PaginatedResponse } from "@/infrastructure/api/types";
import type { Product, ProductSearchResult } from "./types";

export async function getProductByBarcode(
  barcode: string
): Promise<Product | null> {
  try {
    const response = await client.get<ApiResponse<Product>>(
      apiUrl(`/products/by-barcode/${encodeURIComponent(barcode)}`)
    );
    return response.data.data;
  } catch {
    return null;
  }
}

export async function searchProducts(
  query: string
): Promise<ProductSearchResult[]> {
  const response = await client.get<PaginatedResponse<ProductSearchResult>>(
    apiUrl("/products/search"),
    { params: { q: query } }
  );
  return response.data.data;
}

export async function getProductById(id: string): Promise<Product> {
  const response = await client.get<ApiResponse<Product>>(
    apiUrl(`/products/${id}`)
  );
  return response.data.data;
}
