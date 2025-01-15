const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
  },
  price: {
    type: String,
    required: true,
  },
  interval: {
    type: String,
    default: "monthly",
  },
  color: {
    type: String,
    default: "#3f51b5",
  },
  ads: {
    type: Number,
    default: 1,
  },
});

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
