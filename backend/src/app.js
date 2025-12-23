const express = require("express");
const cors = require("cors");

const app = express();

const corsOptions = {
  origin(origin, callback) {
    // Allow tools like Postman / server-to-server
    if (!origin) return callback(null, true);

    // Allow production frontend
    if (origin === "https://dhanasethu09.vercel.app") {
      return callback(null, true);
    }

    // Allow local development
    if (origin === "http://localhost:3000") {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/transactions", require("./routes/transaction.routes"));

module.exports = app;
