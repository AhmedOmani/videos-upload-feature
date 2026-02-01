const CHUNK_SIZE = 10 * 1024 * 1024;
const API_URL = "http://localhost:3000/api/upload";

const getFileFingerprint = (file) => {
    return `${file.name}_${file.size}_${file.lastModified}`;
}

const getUploadState = (fingerprint) => {
    const state = localStorage.getItem(`upload_${fingerprint}`);
    console.log("state:" , state);
    return state ? JSON.parse(state) : null;
}

const saveUploadState = (fingerprint , uploadId) => {
    console.log("UPLOAD ID:" , uploadId);
    localStorage.setItem(`upload_${fingerprint}` , JSON.stringify({uploadId}));
}

const clearUploadState = (fingerprint) => {
    localStorage.removeItem(`upload_${fingerprint}`);
}
const sliceFileIntoChunks = (file) => {
    const chunks = [];
    let start = 0;
    let partNumber = 1;

    while (start < file.size) {
        const blob = file.slice(start, start + CHUNK_SIZE);
        chunks.push({
            partNumber,
            blob,
            size: blob.size
        });
        start += CHUNK_SIZE;
        partNumber++;
    }
    return chunks;
}

const initializeUpload = async (file) => {
    const response = await fetch(`${API_URL}/init`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            filename: file.name,
            fileSize: file.size,
            contentType: file.type
        })
    });
    const data = await response.json();
    return data;
}

const resumeUpload = async (uploadId) => {
    console.log(uploadId);
    const response = await fetch(`${API_URL}/resume/${uploadId}`, {
            method: "GET",
            headers: {
                "Content-Type" : "application/json" 
            }
        });
    const data = await response.json();
    return data;
}

const completePart = async (uploadId , partNumber , etag) => {
    const response = await fetch(`${API_URL}/part-complete`, {
            method: "POST",
            headers: {
                "Content-Type" : "application/json" 
            },
            body: JSON.stringify({
                uploadId,
                partNumber,
                etag
            })
        });
    const data = await response.json();
    return data;
}

const uploadChunk = async (presignedUrl, chunk) => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.onload = () => {
            if (xhr.status === 200) {
                // Get ETag from response headers
                const etag = xhr.getResponseHeader('ETag');
                resolve({
                    partNumber: chunk.partNumber,
                    etag
                });
            } else {
                reject(new Error(`Chunk ${chunk.partNumber} failed with status ${xhr.status}`));
            }
        };

        xhr.onerror = () => {
            console.error(`Network error on chunk ${chunk.partNumber}`);
            console.error('Response:', xhr.responseText);  // ADD THIS
            console.error('Status:', xhr.status);          // ADD THIS
            reject(new Error(`Network error on chunk ${chunk.partNumber}`));
        };
        xhr.open('PUT', presignedUrl);
        // Don't set any headers - presigned URL handles everything!
        xhr.send(chunk.blob);
    });
}

const completeUpload = async (uploadId, key, completedParts) => {
    try {
    const response = await fetch(`${API_URL}/complete`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            uploadId,
            key,
            completedParts
        })
    });
    const data = await response.json();
    return data;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

const resumeHelper = async (file , uploadId) => {
    try {
        const resume = await resumeUpload(uploadId);
        console.log("RESUME: " , resume);
        //Chunk the original file ...
        const chunks = sliceFileIntoChunks(file);
        const totalParts = resume.totalParts;
        if (chunks.length !== totalParts) {
            console.log("File has been changed , starting new upload...");
            return initHelper(file);
        }
        
        const remainingUrls = resume.remainingUrls;
        const remainingChunks = [];
        for (let i = 1 ; i <= totalParts ; i++) {
            const url = remainingUrls.find(url => url.partNumber === i);
            if (url) {
                remainingChunks.push(chunks[i - 1]);
            }
        }
        
        return {chunks : remainingChunks , key: resume.key , presignedUrls : remainingUrls};

    } catch (error) {
        console.log("Failed to resume uploading: " , error);
        console.log("starting new upload...");
        clearUploadState(getFileFingerprint(file));
        return initHelper(file);
    }
}

const initHelper = async (file) => {
    const init = await initializeUpload(file);
    const uploadId = init.uploadId;
    const key = init.key;
    const presignedUrls = init.presignedUrls;
    const chunks = sliceFileIntoChunks(file);
    saveUploadState(getFileFingerprint(file) , uploadId);
    return {chunks , presignedUrls , uploadId , key}
}

const uploadVideo = async (file) => {

    const fingerprint = getFileFingerprint(file);
    const existingState = getUploadState(fingerprint);
    console.log(existingState);

    let chunks = [];
    let presignedUrls;
    let uploadId; 
    let key;
 
    if (existingState) {
        console.log("Resume uploading...");
        const resume = await resumeHelper(file , existingState.uploadId);
        // data needed
        uploadId = existingState.uploadId;
        key = resume.key;
        chunks = resume.chunks;
        presignedUrls = resume.presignedUrls;
    } else {
        console.log("Start new uploading...");
        const init = await initHelper(file);
        // data needed
        uploadId = init.uploadId;
        key = init.key;
        chunks = init.chunks;
        presignedUrls = init.presignedUrls;
    }
    console.log(uploadId);
    console.log(key);
    console.log(chunks);
    console.log(presignedUrls);
    
    // All-at-once pattern
    /*
    const uploadPromises = [];

    for (let i = 0 ; i < chunks.length ; i++) {
        const chunk = chunks[i];
        const presignedUrl = presignedUrls[i].presignedUrl;
        uploadPromises.push(
            uploadChunk(presignedUrl , chunk)
            .then(result => ({
                partNumber: chunk.partNumber,
                etag: result.etag
            }))
            .catch(error => {
                console.log(`Error uploading chunk ${chunk.partNumber}` , error);
                throw error;
            })
        )
    }

    const completedParts = await Promise.all(uploadPromises);
    completedParts.sort((a , b) => a.partNumber - b.partNumber);    

    */

    // Batching pattern
    /*
    const BATCHING_SIZE = 3;
    const completedParts = [];
    for (let i = 0 ; i < chunks.length ; i += BATCHING_SIZE) {
        const batch = chunks.slice(i , i + BATCHING_SIZE);
        const batchPromises = [];
        for (let j = 0 ; j < batch.length ; j++) {
            const chunk = batch[j];
            const presignedUrl = presignedUrls[i + j].presignedUrl;
            batchPromises.push(
                uploadChunk(presignedUrl , chunk)
                .then(result => ({
                    partNumber: chunk.partNumber,
                    etag: result.etag
                }))
                .catch(error => {
                    console.log(`Error uploading chunk ${chunk.partNumber}` , error);
                    throw error;
                })
            )
        }
        const completedBatch = await Promise.all(batchPromises);
        completedParts.push(...completedBatch);
    }
    completedParts.sort((a , b) => a.partNumber - b.partNumber);
    return {
        uploadId,
        key,
        completedParts
    }
    */


    // Worker pattern
    const WORKER_SIZE = 6;
    const completedParts = [];
    const queue = [...chunks];
    const urlMap = new Map(presignedUrls.map(p => [p.partNumber, p.presignedUrl]));

    const worker = async () => {
        while (queue.length > 0) {
            const chunk = queue.shift();
            const presignedUrl = urlMap.get(chunk.partNumber);
            try {
                const startTime = Date.now();
                console.log(`Uploading chunk ${chunk.partNumber}... (size: ${(chunk.size / 1024 / 1024).toFixed(2)}MB)`);
                
                const response = await uploadChunk(presignedUrl, chunk);
                await completePart(uploadId , chunk.partNumber , response.etag);
                
                const endTime = Date.now();
                const durationSec = ((endTime - startTime) / 1000).toFixed(2);
                const speedMbps = ((chunk.size * 8) / (endTime - startTime) / 1000).toFixed(2);

                completedParts.push({
                    PartNumber: response.partNumber,
                    ETag: response.etag
                });
                console.log(`Chunk ${chunk.partNumber} done in ${durationSec}s (${speedMbps} Mbps). ${queue.length} urls left!`);
            }
            catch (error) {
                console.error(`Chunk ${chunk.partNumber} failed`, error);
                throw error;
            }
        }
    }

    const workers = Array(WORKER_SIZE).fill(null).map(() => worker());
    await Promise.all(workers);
    completedParts.sort((a, b) => a.PartNumber - b.PartNumber);

    const result = await completeUpload(uploadId, key, completedParts);
    clearUploadState(fingerprint);
    return result;
}

export {
    uploadVideo
}