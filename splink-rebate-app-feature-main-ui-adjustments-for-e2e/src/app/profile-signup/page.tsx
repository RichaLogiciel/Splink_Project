import DistributorProfileSetup from "@/components/Form/ProfileSetup/Distributor";
import DistributorSalesRepProfileSignup from "@/components/Form/ProfileSetup/DistributorSalesRep";
import ManufacturerProfileSetup from "@/components/Form/ProfileSetup/Manufacturer";
import StoreProfileSetup from "@/components/Form/ProfileSetup/Store";
import { APP_ROUTES } from "@/configs/routes";
import { ProfileSetupProps } from "@/types/ProfileSetup";
import { StoreProfileDetails } from "@/types/StoreTypes";
import {
  isChain,
  isDistributor,
  isDistributorSalesRep,
  isManufacturerAccountManager,
  isManufacturerAdminAndExecutive,
  isStore
} from "@/utils/rolesConditions";
import { redirect } from "next/navigation";
import {
  fetchInvitationDetails,
  fetchStoreInvitationDetails,
  getInvitation
} from "./API";

async function ProfileSetup({ searchParams }: ProfileSetupProps) {
  const token = (searchParams?.token || "") as string;

  // Redirect to login page is token is not set
  if (!token) redirect(APP_ROUTES.login);

  // Get Invitation details from Server
  const invitationDetails = await getInvitation(token);

  if (invitationDetails == false) {
    return (
      <>
        <div className="text-lg text-center text-danger">
          The invitation link is no longer valid or may have expired.
        </div>
        <div className="text-[13px] text-center text-gray-500 mt-4">
          <p className="flex flex-col">
            <span>For further assistance, please reach out to us at</span>
            <a
              href="mailto:help@splinktechnologies.com"
              className="text-blue-500 underline"
            >
              help@splinktechnologies.com
            </a>
          </p>
        </div>
      </>
    );
  }

  // Extract details from Invitation data
  const { role, email, status, replace_email } = invitationDetails.data;

  if (status == "completed") {
    return (
      <div className="text-lg text-center text-danger">
        This invitation has already been accepted and cannot be used again.
      </div>
    );
  }

  if (isDistributorSalesRep(role)) {
    const salesRepDetails = invitationDetails?.data?.invited_user
      ? await fetchInvitationDetails(token)
      : { user: { email: invitationDetails?.data?.email } };

    return (
      <DistributorSalesRepProfileSignup
        token={token}
        email={email}
        salesRepDetails={salesRepDetails}
      />
    );
  }

  if (isChain(role)) {
    const chainDetails = invitationDetails?.data?.invited_user
      ? await fetchInvitationDetails(token)
      : { user: { email: invitationDetails?.data?.email } };
    return (
      <DistributorSalesRepProfileSignup
        token={token}
        email={email}
        salesRepDetails={chainDetails}
      />
    );
  }

  // Show Signup form for Distributors
  if (isDistributor(role)) {
    return (
      <DistributorProfileSetup
        token={token}
        email={replace_email || email}
        role={role}
      />
    );
  }

  // Show Signup form for Manufacturer
  if (
    isManufacturerAdminAndExecutive(role) ||
    isManufacturerAccountManager(role)
  ) {
    return (
      <ManufacturerProfileSetup
        token={token}
        email={replace_email || email}
        role={role}
      />
    );
  }

  // Show Signup form for Stores
  if (isStore(role)) {
    // Get Store details from Server
    const storeDetails: StoreProfileDetails | null =
      await fetchStoreInvitationDetails(token);

    return (
      <StoreProfileSetup
        token={token}
        email={email}
        storeDetails={storeDetails}
      />
    );
  }

  // Fallback return
  return <div className="empty"></div>;
}

export default ProfileSetup;
