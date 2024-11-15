const mongoose = require("mongoose");

const adsSchema = new mongoose.Schema({
  banner: {
    type: String,
  },
  link: {
    type: String,
    required: true,
  },
  isVertical: {
    type: Boolean,
    required: true,
  },
  companyId: {
    type: mongoose.Types.ObjectId,
    ref: "company",
    required: true,
  },
  isAvailable: {
    type: Boolean,
  },
  isShown: {
    type: Boolean,
    required: true,
    default: false,
  },
});

const Ads = mongoose.model("Ads", adsSchema);
module.exports = Ads;
