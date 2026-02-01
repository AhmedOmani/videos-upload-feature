import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Video } from "../db/models/video.model.js";

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB on bytes

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
});

const createMultipartUpload = async (fileKey, contentType) => {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileKey,
        ContentType: contentType
    }

    try {
        const command = new CreateMultipartUploadCommand(params);
        const response = await s3Client.send(command);
        return response;
    } catch (error) {
        throw error;
    }
}

const generatePresignedUrls = async (bucketName, fileKey, uploadId, totalParts) => {
    const urlsPromises = [];
    for (let i = 1; i <= totalParts; i++) {
        const command = new UploadPartCommand({
            Bucket: bucketName,
            Key: fileKey,
            UploadId: uploadId,
            PartNumber: i
        });
        urlsPromises.push(
            getSignedUrl(s3Client, command, { expiresIn: 24 * 60 * 60 })
                .then(url => ({ partNumber: i, presignedUrl: url }))
        )
    }
    const presignedUrls = await Promise.all(urlsPromises);
    presignedUrls.sort((a, b) => a.partNumber - b.partNumber);
    return presignedUrls;
}

const uploadVideo = async (req, res) => {
    try {
        const { filename, fileSize, contentType } = req.body;
        console.log(filename, fileSize, contentType);
        const fileKey = `videos/${Date.now()}-${filename}`;

        // Create multipart upload from S3 
        const multipartUploadResponse = await createMultipartUpload(fileKey, contentType);

        // Data needed to get presigned urls
        const bucketName = process.env.S3_BUCKET_NAME;
        const uploadId = multipartUploadResponse.UploadId;

        const totalParts = Math.ceil(fileSize / CHUNK_SIZE);

        // Get presigned urls for each part
        const presignedUrls = await generatePresignedUrls(bucketName, fileKey, uploadId, totalParts);

        //Save video metadata
        const video = await Video.create({
            name: filename,
            size: fileSize,
            uploadId: uploadId,
            key: fileKey,
            totalParts: totalParts,
            presignedUrls: presignedUrls,
            status: "IN_PROGRESS",
            completedParts: []
        });

        return res.status(200).json({
            uploadId,
            key: fileKey,
            presignedUrls
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to upload video",
            error: error.message
        });
    }
}

const resumeUpload = async (req, res) => {
    try {
        const { uploadId } = req.params;
        console.log("uploadId ->>" , uploadId);
        const video = await Video.findOne({ uploadId });
        if (!video) {
            return res.status(400).json({
                message: "Video not found"
            });
        }
        
        const presignedUrls = video.presignedUrls;
        const completedParts = video.completedParts;
        const totalParts = video.totalParts;
        console.log("KEY -> " , video.key);
        console.log("completedParts -> " , completedParts);
        const remainingUrls = [];
        for (let i = 1 ; i <= totalParts ; i++) {
            const isPartCompleted = completedParts.some(part => part.partNumber === i);
            if (!isPartCompleted) {
                const url = presignedUrls.find(url => url.partNumber === i);
                remainingUrls.push(url);
            }
        }
        console.log("remainingUrls ->>" , remainingUrls);
        return res.status(200).json({
            totalParts,
            key: video.key,
            remainingUrls
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to resume upload",
            error: error.message
        });
    }
}

const completeUpload = async (req, res) => {
    try {
        const { uploadId, key, completedParts } = req.body;
        console.log("Completing upload:", { uploadId, key, partsCount: completedParts?.length });

        // Call S3 to assemble all parts into the final file
        const command = new CompleteMultipartUploadCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
            UploadId: uploadId,
            MultipartUpload: {
                Parts: completedParts  // Array of { PartNumber, ETag }
            }
        });

        const response = await s3Client.send(command);
        console.log("Upload completed! Location:", response.Location);

        // Update video status in database
        await Video.findOneAndUpdate(
            { uploadId },
            { status: "completed", s3Location: response.Location }
        );

        return res.status(200).json({
            message: "Upload completed successfully",
            location: response.Location,
            bucket: response.Bucket,
            key: response.Key
        });

    } catch (error) {
        console.error("Complete upload error:", error);
        return res.status(500).json({
            message: "Failed to complete upload",
            error: error.message
        });
    }
}

const partComplete = async (req, res) => {
    try {
        const {uploadId , partNumber , etag} = req.body;
        const updateCompletedParts = await Video.findOneAndUpdate(
            { uploadId } ,
            { $push: { completedParts: { partNumber , etag }}}
        );
        return res.status(200).json({
            message: `Part ${partNumber} pushed successfully`
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to complete part upload",
            error: error.message
        });
    }
}

export {
    uploadVideo,
    resumeUpload,
    completeUpload,
    partComplete
}
