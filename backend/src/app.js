const express = require("express");
const cors = require("cors");
<<<<<<< HEAD

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
=======
const app = express();

const allowedOrigins = [
  'https://dhanasethu09-rj55rpxko-pranav-4337s-projects.vercel.app',
  'https://dhanasethu09.vercel.app',
  'http://localhost:3000'
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
app.options('*', cors(corsOptions));
>>>>>>> e59c53f77c3081fe6746be29489c71b7e23f2b18
app.use(express.json());

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/transactions", require("./routes/transaction.routes"));

module.exports = app;
