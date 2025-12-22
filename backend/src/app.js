const express = require("express");
const cors = require("cors");

const app = express();

const allowedOrigins = [
  'https://dhanasethu09.vercel.app',
  'https://dhanasethu09-rj55rpxko-pranav-4337s-projects.vercel.app',
  'http://localhost:3000' // if you use local dev
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origin not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // ensure preflight is handled
app.use(express.json());

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/transactions", require("./routes/transaction.routes"));

module.exports = app;
