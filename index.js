const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const authRouter = require("./routes/authRoutes");
const subsRouter = require("./routes/subsRoutes");
const adsRouter = require("./routes/adsRoutes");
const authMiddleware = require("./middlewares/auth");
const { getRandomAds } = require("./controllers/ads");

require("dotenv").config();
require("./config/db")();

const app = express();

app.use(bodyParser.json({ limit: "50mb" }));
app.use(cors({ origin: "*", credentials: true }));
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/subscription", authMiddleware, subsRouter);
app.use("/api/ads", authMiddleware, adsRouter);
app.post("/api/randomAds", getRandomAds);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`)
);
