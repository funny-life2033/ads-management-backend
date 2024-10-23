const express = require("express");
const { getPlans } = require("../controllers/subscription");

const router = express.Router();

router.get("/plans", getPlans);

module.exports = router;
