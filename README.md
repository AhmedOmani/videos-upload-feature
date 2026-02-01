# Video Upload Feature

This repository implements a chunked video upload system with S3 multipart uploads.

![Architecture](./architecture.png)

## Features

- Chunked multipart upload to S3
- Parallel upload workers
- Presigned URLs (browser uploads directly to S3)
- Resume interrupted uploads
