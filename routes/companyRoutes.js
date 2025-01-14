const express = require("express");
const {
  getCompanyList,
  block,
  unblock,
  remove,
} = require("../controllers/company");
const router = express.Router();

router.get("/", getCompanyList);
router.get("/:companyId/block", block);
router.get("/:companyId/unblock", unblock);
router.delete("/:companyId/remove", remove);

module.exports = router;
