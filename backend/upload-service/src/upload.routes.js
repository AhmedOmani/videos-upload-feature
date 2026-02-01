import express from "express";

const router = express.Router();
import { uploadVideo , resumeUpload , completeUpload , partComplete } from "./upload.controller.js";

// GET requests...
router.get("/resume/:uploadId", resumeUpload);

// POST requests...
router.post("/init", uploadVideo);
router.post("/part-complete", partComplete)
router.post("/complete" , completeUpload);

export {
    router as uploadRoutes
}