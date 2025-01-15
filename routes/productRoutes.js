const express = require("express");
const { create, update } = require("../controllers/product");

const router = express.Router();

router.post("/", create);
router.post("/:productId", update);

module.exports = router;
