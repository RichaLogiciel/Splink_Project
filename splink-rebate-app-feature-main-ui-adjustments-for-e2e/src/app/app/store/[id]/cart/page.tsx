import SalesRepCart from "@/components/Cart/SalesRepCart";
import NoAccess from "@/components/NoAccess";
import { USER_ROLES } from "@/configs/roles";
import { getUserServer } from "@/utils/getUserServer";

const CartPage = async ({ params }: { params: { id: string } }) => {
  const user = getUserServer();
  const { id } = params;

  if (user?.role === USER_ROLES.DISTRIBUTOR_SALES_REP) {
    return <SalesRepCart storeId={id} />;
  } else {
    return <NoAccess />;
  }
};

export default CartPage;
