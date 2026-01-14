import { getUserServer } from "@/utils/getUserServer";

import NoAccess from "@/components/NoAccess";
import { USER_ROLES } from "@/configs/roles";
import OrderDetail from "@/views/SalesRep/orderDetail";

interface OrderDetailPageProps {
  params: {
    orderId: string;
  };
}
const OrderDetailPage = async ({ params }: OrderDetailPageProps) => {
  const user = getUserServer();
  switch (user?.role) {
    case USER_ROLES.DISTRIBUTOR_SALES_REP:
      return <OrderDetail orderId={params.orderId} />;

    default:
      return (
        <>
          <b className="block pb-4">Role: {user?.role} - Order Detail</b>
          <NoAccess />
        </>
      );
  }
};
export default OrderDetailPage;
