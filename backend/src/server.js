const mongoose = require("mongoose");
require("dotenv").config();

const app = require("./app");

(async () => {
  const uri =
    process.env.NODE_ENV === "production"
      ? process.env.MONGO_URI_ATLAS
      : process.env.MONGO_URI_LOCAL;

  try {
    await mongoose.connect(uri);
    console.log(`MongoDB connected → ${process.env.NODE_ENV || "development"}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
})();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
