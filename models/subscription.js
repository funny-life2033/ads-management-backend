const mongoose = require("mongoose");
const products = require("../config/products");

const SubscriptionSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
    unique: true,
  },
  plan: {
    type: String,
    enum: products.map((product) => product.id),
    required: true,
  },
  subscriptionId: { type: String, required: true },
});

module.exports = mongoose.model("Subscription", SubscriptionSchema);
