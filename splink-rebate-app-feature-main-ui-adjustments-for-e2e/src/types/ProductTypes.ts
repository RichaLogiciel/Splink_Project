// Import Types
import { ManufacturerProduct } from "@/types/StoreTypes";

export interface WishlistProducts {
  id: number;
  product_name: string;
  product_id: number;
  distributor_id: number;
  status: boolean;
  manufacturer_name: string;
  manufacturer_logo: string;
  updated_at: string;
  internal_code?: string;
}

export interface WishlistProductsPageProps {
  products: WishlistProducts[];
  showWishlists?: boolean;
  STORE_ID: number;
}

export interface WishlistProductsListProps {
  products: WishlistProducts[];
  storeID?: number;
  showWishlists?: boolean;
  isInPopup?: boolean;
  removeWishlistProduct?: (val: any) => any;
  bulkSelectedItems?: number[];
  setBulkSelectedItems?: (val: any) => any;
}

export interface ProductsListProps {
  products: ManufacturerProduct[];
  showWishlists?: boolean;
  canUpdate?: boolean;
  isInPopup?: boolean;
  showDistributorCode?: boolean;
  showUpcCode?: boolean;
  emptyListMessage?: string;
  showProductsIcon?: boolean;
  showAddIcon?: boolean;
  storeId?: string;
  manufacturerId?: string;
  isShowGreyBg?: boolean;
}
