import {
  fetchAuthorizedManufacturers,
  fetchManagerWarehouseList,
  fetchManufacturerProducts
} from "@/app/app/DashboardAPIs";
import { getUserServer } from "@/utils/getUserServer";
import { isWarehouseFeatureEnabled } from "@/utils/helper";
import {
  isDistributorAdmin,
  isDistributorAdminAndExecutive,
  isDistributorGeneralManager
} from "@/utils/rolesConditions";
import ProductInsightsDashboard from "./productInsightsDashboard";

const ProductInsightsDashboardWrapper = async ({ searchParams }: any) => {
  const user = getUserServer();

  const isManager = isDistributorGeneralManager(user.role);
  const isAdminOrExecutive = isDistributorAdminAndExecutive(user.role);
  const distributorId = isDistributorAdmin(user.role)
    ? user?.associatedUserId
    : user?.parentEntityId;

  const manufacturerId = searchParams?.manufacturerId;
  const warehouseId = searchParams?.warehouseId;
  const authorizedManufacturers = await fetchAuthorizedManufacturers();
  const products = await fetchManufacturerProducts(manufacturerId);

  const warehouses =
    isWarehouseFeatureEnabled(distributorId) &&
    (isManager || isAdminOrExecutive)
      ? await fetchManagerWarehouseList()
      : undefined;

  return (
    <ProductInsightsDashboard
      selectableEntities={authorizedManufacturers}
      products={products}
      manufacturerId={manufacturerId}
      warehouseId={warehouseId}
      warehouses={warehouses}
    />
  );
};

export default ProductInsightsDashboardWrapper;
