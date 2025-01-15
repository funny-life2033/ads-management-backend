const express = require("express");
const {
  getCompanyList,
  block,
  unblock,
  remove,
  getAds,
  blockAd,
  unblockAd,
} = require("../controllers/company");
const router = express.Router();

router.get("/", getCompanyList);
router.get("/:companyId/block", block);
router.get("/:companyId/unblock", unblock);
router.get("/:companyId/ads", getAds);
router.get("/ad/:adId/block", blockAd);
router.get("/ad/:adId/unblock", unblockAd);
router.delete("/:companyId/remove", remove);

module.exports = router;
