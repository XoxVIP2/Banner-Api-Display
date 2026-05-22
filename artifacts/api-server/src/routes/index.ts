import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bannersRouter from "./banners";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bannersRouter);

export default router;
