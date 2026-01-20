import {
  fetchAuthorizedManufacturers,
  fetchDistributors
} from "@/app/app/DashboardAPIs";
import { getUserServer } from "@/utils/getUserServer";
import {
  isDistributorAdmin,
  isManufacturerAdmin
} from "@/utils/rolesConditions";
import CreateProgramForm from "./components/CreateProgramForm";

export const dynamic = "force-dynamic";

const transformData = (data: any[]) =>
  data.map((item) => ({
    label: item.name,
    value: item.associatedUserId
  }));

const CreateProgramPage = async () => {
  const user = getUserServer();
  const isDistributor = isDistributorAdmin(user?.role || "");
  const isManufacturer = isManufacturerAdmin(user?.role || "");

  const [distributors, manufacturers] = await Promise.all([
    isManufacturer ? fetchDistributors() : Promise.resolve([]),
    isDistributor ? fetchAuthorizedManufacturers() : Promise.resolve([])
  ]);

  return (
    <CreateProgramForm
      distributors={transformData(distributors)}
      manufacturers={isDistributor ? transformData(manufacturers) : undefined}
    />
  );
};

export default CreateProgramPage;
