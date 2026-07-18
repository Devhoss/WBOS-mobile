export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  barcode: string | null;
  categoryId: string | null;
  categoryName: string | null;
  unitOfMeasure: string;
  price: number;
  cost: number;
  isActive: boolean;
  imageUrl: string | null;
}

export interface ProductSearchResult {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  unitOfMeasure: string;
}
