const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const authRouter = require("./routes/authRoutes");
const subscriptionRouter = require("./routes/subscriptions");
const authMiddleware = require("./middlewares/auth");

require("dotenv").config();
require("./config/db")();

const app = express();

app.use(bodyParser.json({ limit: "50mb" }));
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(cookieParser());

app.use("/auth", authRouter);
app.use("/subscription", authMiddleware, subscriptionRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`)
);
