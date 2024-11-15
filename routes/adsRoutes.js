const express = require("express");
const { submitAd, getAds, getAd, removeAd } = require("../controllers/ads");
const router = express.Router();

router.post("/submit", submitAd);
router.get("/", getAds);
router.get("/get/:id", getAd);
router.delete("/:id", removeAd);

module.exports = router;
