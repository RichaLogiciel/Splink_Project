import { Router } from "express";

import storeV2Routes from "./storeV2";

import { authenticate } from "../middleware/authentication";
import { authorizeRoute } from "../middleware/authorize";
import { requestContextMiddleware } from "../middleware/requestContext";

const router = Router();

// Store v2 routes with same middlewares as v1 store routes
router.use(
  "/store",
  authenticate(),
  requestContextMiddleware,
  authorizeRoute(),
  storeV2Routes
);

export default router;
