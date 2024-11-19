const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const authRouter = require("./routes/authRoutes");
const subsRouter = require("./routes/subsRoutes");
const adsRouter = require("./routes/adsRoutes");
const authMiddleware = require("./middlewares/auth");
const {
  getRandomAd,
  increaseViews,
  increaseClicks,
} = require("./controllers/ads");

require("dotenv").config();
require("./config/db")();

const app = express();

const allowedOrigins = [
  "https://vinylbayads.com",
  "https://vinylbay777.com",
  // "http://localhost:3000",
];

app.use(bodyParser.json({ limit: "1024mb" }));
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl requests)
      console.log(JSON.stringify(origin, null, 2));
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, origin);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/subscription", authMiddleware, subsRouter);
app.use("/api/ads", authMiddleware, adsRouter);
app.get("/api/randomAd", getRandomAd);
app.get("/api/increaseViews/:id", increaseViews);
app.get("/api/increaseClicks/:id", increaseClicks);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`)
);
