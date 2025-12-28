const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: ["http://localhost:5173", "https://dhanasethu09.vercel.app"],
    credentials: true,
  })
);

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/transactions", require("./routes/transaction.routes"));
app.use("/api/loans", require("./routes/loan.routes"));

module.exports = app;
