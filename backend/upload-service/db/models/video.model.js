import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    size: { // in bytes
        type: Number,
        required: true
    },
    uploadId: {
        type: String ,
        required: true,
    },
    key: {
        type: String,
        required: true,
    },
    totalParts: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        default: "IN_PROGRESS",
    },
    completedParts: [{
        partNumber: { type: Number, required: true },
        etag: { type: String, required: true },
    }],
    s3Location: {
        type: String,
    },
    presignedUrls: [{
        partNumber: { type: Number, required: true },
        presignedUrl: { type: String, required: true },
    }]
} , { strict: false});

const Video = mongoose.model("Video", videoSchema);

export {
    Video
}