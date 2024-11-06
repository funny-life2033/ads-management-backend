const express = require("express");
const { submitAds, getAds, resetAds } = require("../controllers/ads");
const router = express.Router();

router.post("/submit", submitAds);
router.get("/", getAds);
router.get("/reset", resetAds);

module.exports = router;
