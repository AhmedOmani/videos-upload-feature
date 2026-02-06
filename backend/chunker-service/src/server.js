import express from "express";
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pipeline } from "stream/promises";
import { worker } from "./chunker.js";
import { jobQueue } from "./jobQueue.js";



const app = express();
app.use(express.json());

const s3Client = new S3Client({
    region: "me-south-1"
});

app.get("/jobs/:jobId" , (req , res) => {
    const job = jobQueue.getJobById(req.params.jobId);
    res.json({ status: job?.status || "not found" });
})

app.post("/jobs" , async(req , res) => {
    const { key } = req.body;

    const jobId = jobQueue.addJob({
        key
    });

    return res.status(200).json({
        message: "Job added successfully",
        jobId
    })
});


app.listen(3002 , () => {
    console.log("Chunker service is running on port 3002");
})