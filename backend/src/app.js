const express = require("express");
const cors = require("cors");

const app = express();

const cors = require("cors");

app.use(
  cors({
    origin: "https://dhanasethu09.vercel.app",
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/transactions", require("./routes/transaction.routes"));

module.exports = app;
