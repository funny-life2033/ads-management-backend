const mongoose = require("mongoose");

const adsSchema = new mongoose.Schema({
  banner: {
    type: String,
    required: true,
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
    unique: true,
  },
  isAvailable: {
    type: Boolean,
  },
});

const Ads = mongoose.model("Ads", adsSchema);
module.exports = Ads;
