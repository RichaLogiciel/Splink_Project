import { Router } from "express";

import agreementRoutes from "./agreement";
import authRoutes from "./auth";
import cartRoutes from "./cartRoutes";
import chainRoutes from "./chain";
import dashboardRoutes from "./dashboard";
import distributorRoutes from "./distributor";
import distributorAdminRoutes from "./distributorAdmin";
import enrollmentRequestRoutes from "./enrollmentRequest";
import manufacturerRoutes from "./manufacturer";
import orderRoutes from "./orderRoutes";
import programRoutes from "./program";
import programApprovalRoutes from "./programApproval";
import salesRepRoutes from "./salesRep";
import storeRoutes from "./store";
import userRoutes from "./user";
import wishlistRoutes from "./wishlist";

import { Request, RequestHandler, Response } from "express";
import AwsController from "../controllers/AwsController";
import { authenticate } from "../middleware/authentication";
import { authorizeRoute } from "../middleware/authorize";
import { requestContextMiddleware } from "../middleware/requestContext";

const router = Router();

router.use("/auth", authRoutes);

// Protected routes with authenticate & authorizeRoute middleware
router.use(
  "/dashboard",
  authenticate(),
  requestContextMiddleware,
  authorizeRoute(),
  dashboardRoutes
);
router.use(
  "/cart",
  authenticate(),
  requestContextMiddleware,
  authorizeRoute(),
  cartRoutes
);
router.use(
  "/manufacturer",
  authenticate(),
  requestContextMiddleware,
  authorizeRoute(),
  manufacturerRoutes
);
router.use(
  "/distributor",
  authenticate(),
  requestContextMiddleware,
  authorizeRoute(),
  distributorRoutes
);
router.use(
  "/distributor-admin",
  authenticate(),
  requestContextMiddleware,
  authorizeRoute(),
  distributorAdminRoutes
);
router.use(
  "/programs",
  authenticate(),
  requestContextMiddleware,
  authorizeRoute(),
  programRoutes
);
router.use(
  "/program-approvals",
  authenticate(),
  requestContextMiddleware,
  authorizeRoute(),
  programApprovalRoutes
);
router.use(
  "/sales-rep",
  authenticate(),
  requestContextMiddleware,
  authorizeRoute(),
  salesRepRoutes
);
router.use(
  "/store",
  authenticate(),
  requestContextMiddleware,
  authorizeRoute(),
  storeRoutes
);
router.use(
  "/user",
  authenticate(),
  requestContextMiddleware,
  authorizeRoute(),
  userRoutes
);
router.use(
  "/wishlist",
  authenticate(),
  requestContextMiddleware,
  authorizeRoute(),
  wishlistRoutes
);
router.use(
  "/chain",
  authenticate(),
  requestContextMiddleware,
  authorizeRoute(),
  chainRoutes
);
router.use(
  "/orders",
  authenticate(),
  requestContextMiddleware,
  authorizeRoute(),
  orderRoutes
);
router.use(
  "/agreements",
  authenticate(),
  requestContextMiddleware,
  authorizeRoute(),
  agreementRoutes
);
router.use(
  "/enrollment-requests",
  authenticate(),
  requestContextMiddleware,
  authorizeRoute(),
  enrollmentRequestRoutes
);

router.post(
  "/upload-file",
  AwsController.getUploadMiddleware().single("file"),
  (async (req: Request, res: Response) => {
    await AwsController.uploadFileS3(req, res);
  }) as RequestHandler
);

// router.post(
//   "/upload-file-s3",
//   AwsController.getUploadMiddleware().single("file"),
//   (async (req: Request, res: Response) => {
//     await AwsController.uploadFileS3(req, res);
//   }) as RequestHandler
// );

export default router;
