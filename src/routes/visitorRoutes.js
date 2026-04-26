import { Router } from "express";
import async from "async";
import { generateCheckInID } from "../utils/generateCheckInID.js";
import {
  checkInVisitor,
  checkOutVisitor,
  getActiveVisitors,
} from "../controllers/visitorController.js";

const router = Router();

router.post("/check-in", checkInVisitor);
router.post("/check-out", checkOutVisitor);
router.get("/visitors/active", getActiveVisitors);

export default router;
