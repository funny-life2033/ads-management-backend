const express = require("express");
const {
  getPlans,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  checkSubcription,
} = require("../controllers/subscription");

const router = express.Router();

router.get("/", getPlans);
router.post("/", createSubscription);
router.put("/", updateSubscription);
router.delete("/", cancelSubscription);
router.get("/check", checkSubcription);

module.exports = router;
