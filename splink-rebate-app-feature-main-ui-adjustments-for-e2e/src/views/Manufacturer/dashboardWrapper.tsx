import {
  fetchDistributors,
  fetchManufacturerProducts
} from "@/app/app/DashboardAPIs";
import Dashboard from "./dashboard";

interface DashboardWrapperProps {
  searchParams: {
    distributorId: string;
  };
}

const DashboardWrapper = async ({ searchParams }: DashboardWrapperProps) => {
  const distributors = await fetchDistributors();
  const products = await fetchManufacturerProducts();

  return (
    <Dashboard
      distributors={distributors}
      products={products}
      distributorId={searchParams?.distributorId}
    />
  );
};

export default DashboardWrapper;
