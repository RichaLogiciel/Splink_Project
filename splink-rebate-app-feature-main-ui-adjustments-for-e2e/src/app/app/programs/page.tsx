import MixpanelTracker from "@/components/MixpanelTracker";
import NoAccess from "@/components/NoAccess";
import { USER_ROLES } from "@/configs/roles";
import { APP_ROUTES } from "@/configs/routes";
import { getUserServer } from "@/utils/getUserServer";
import ProgramsDistributor from "@/views/Distributor/programs";
import ProgramsManufacturer from "@/views/Manufacturer/programs";
import { redirect } from "next/navigation";
// import { redirect } from "next/navigation";

const ProgramsPage = async ({ searchParams }: any) => {
  const user = getUserServer();

  if (user?.role == USER_ROLES.DISTRIBUTOR_SALES_REP) {
    redirect(APP_ROUTES.storePrograms);
  }

  return (
    <>
      <MixpanelTracker
        eventName="Programs View"
        properties={{
          userRole: user?.role,
          timestamp: new Date().toISOString()
        }}
      />

      {(() => {
        switch (user?.role) {
          case USER_ROLES.MANUFACTURER:
          case USER_ROLES.MANUFACTURER_EXECUTIVE:
          case USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER:
            return <ProgramsManufacturer searchParams={searchParams} />;

          case USER_ROLES.DISTRIBUTOR_ADMIN:
          case USER_ROLES.DISTRIBUTOR_EXECUTIVE:
          case USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER:
            return <ProgramsDistributor searchParams={searchParams} />;

          default:
            return (
              <>
                <b className="block pb-4">Role: {user?.role} - Programs</b>
                <NoAccess />
              </>
            );
        }
      })()}
    </>
  );
};
export default ProgramsPage;
