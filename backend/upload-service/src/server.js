import express from "express";
import mongoose from "mongoose";

import { uploadRoutes } from "./upload.routes.js";

const app = express();

app.use(express.json());

app.use("/upload" , uploadRoutes);

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log(`Database connected successfully`);
    }catch (error) {
        console.log(error);
    }
}
app.listen(3001 , async () => {
    await connectDB();
    console.log(`Upload service is running on port 3001`);
});
