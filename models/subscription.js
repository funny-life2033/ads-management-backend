const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  plan: { type: String, required: true },
  status: { type: String, default: "active" },
  subscriptionId: { type: String, required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
});

module.exports = mongoose.model("Subscription", SubscriptionSchema);
