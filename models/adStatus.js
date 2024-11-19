const mongoose = require("mongoose");

const adStatusSchema = new mongoose.Schema({
  adId: {
    type: mongoose.Types.ObjectId,
    ref: "ads",
    required: true,
  },
  views: [
    {
      views: {
        type: Number,
        required: true,
      },
      date: {
        type: Date,
        required: true,
        default: Date.now,
      },
    },
  ],
  clicks: [
    {
      clicks: {
        type: Number,
        required: true,
      },
      date: {
        type: Date,
        required: true,
        default: Date.now,
      },
    },
  ],
});

const AdStatus = mongoose.model("AdStatus", adStatusSchema);
module.exports = AdStatus;
