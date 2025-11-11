const mongoose = require("mongoose");

const connectDB = () => {
  const uri =
    process.env.MONGODB_URI ||
    "mongodb+srv://<username>:<password>@<cluster>/<dbname>?retryWrites=true&w=majority";
  return mongoose.connect(uri);
};

module.exports = connectDB;
