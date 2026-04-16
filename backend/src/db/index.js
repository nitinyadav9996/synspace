import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";   
 const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.DATABASE_URL}${DB_NAME}`, ), 
        console.log("Connected to MongoDB");
    }
    catch (error) {
        console.error("\n Error connecting to MongoDB:", error);
        process.exit(1);
    }
}
export default connectDB;