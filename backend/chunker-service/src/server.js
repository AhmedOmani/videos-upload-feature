import express from "express";
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pipeline } from "stream/promises";
import { worker } from "./chunker.js";
import { jobQueue } from "./jobQueue.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const s3Client = new S3Client({
    region: "me-south-1"
});

app.post("/jobs" , async(req , res) => {
    const { key } = req.body;
    
    if (!fs.existsSync(path.join(__dirname, ".." , "temp"))) {
        fs.mkdirSync(path.join(__dirname, ".." , "temp"));
    }

    const filePath = path.join(__dirname, ".." , "temp" , `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.mp4`)
    
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key
        });

        const { Body } = await s3Client.send(command);

        const writeStream = fs.createWriteStream(filePath);

        await pipeline(Body , writeStream);
        console.log("Video downloaded successfully");

        //Add job to queue
        jobQueue.addJob({
            filePath,
            key
        });

        res.status(200).json({
            message: "Job created successfully , Processing started"
        });

    } catch(error) {
        console.error(error);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return res.status(500).json({
            message: "Failed to create job",
            error: error.message
        });
    }

});

app.listen(3002 , () => {
    console.log("Chunker service is running on port 3002");
})