const express = require("express");
const { submitAds, getAds } = require("../controllers/ads");
const router = express.Router();

router.post("/submit", submitAds);
router.get("/", getAds);

module.exports = router;
