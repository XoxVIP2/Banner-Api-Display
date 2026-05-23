import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bannersRouter from "./banners";
import storeRouter from "./store";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bannersRouter);
router.use(storeRouter);

export default router;
