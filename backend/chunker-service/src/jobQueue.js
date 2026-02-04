import EventEmitter from "events";
import fs from "fs/promises";

class JobQueue extends EventEmitter {
    constructor(options = {}) {
        super();
        this.queue = [];
        this.processing = new Set();
        this.maxConcurrentJobs = options.maxConcurrentJobs || 3;
        this.retryAttempts = options.retryAttempts || 3;
    }

    addJob(job) {
        const jobMetaData = {
            ...job,
            id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            attempts: 0,
            addedAt: Date.now(),
            status: "QUEUED",
        }

        this.queue.push(jobMetaData);
        console.log(`Job ${jobMetaData.id} added to queue. Queue length: ${this.queue.length}`);
        
        this.emit("job-added");
        return jobMetaData.id;
    }

    isEmpty() {
        return this.queue.length === 0;
    }

    canProcess() {
        return this.processing.size < this.maxConcurrentJobs;
    }

    getNextJob() {
        if (this.isEmpty()) return null;
        return this.queue.shift();
    }

    async processJob(job) {
        const { id, filePath , key, attempts } = job;
        this.processing.add(id);
        job.status = "PROCESSING";
        job.startedAt = Date.now();

        console.log(`Processing job ${id} (attempt ${attempts + 1}/${this.retryAttempts})`);
        
        try {
            await this.processVideo(filePath , key);

            console.log(`Job ${id} completed successfully`);
            job.status = "COMPLETED";
            job.completedAt = Date.now();

            await this.cleanup(filePath);
        } catch(error) {
            console.error(`Job ${id} failed with error: ${error.message}`);
            job.attempts++;
            if (job.attempts < this.retryAttempts) {
                console.log(`Job ${id} failed. Retrying...`);
                this.queue.push(job);
            }  else {
                console.log(`Job ${id} failed after ${this.retryAttempts} attempts. Marking as failed`);
                job.status = "FAILED";
                job.failedAt = Date.now();
            }
        } finally {
            this.processing.delete(id);
            this.emit("worker-available");
        }

    
    }

    async processVideo(filePath , key) {
        //FFmpeg logic
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.9) { // 10% failure rate for testing
                    reject(new Error('Simulated processing error'));
                } else {
                    resolve();
                }
            }, 8000);
        });
    }

    async cleanup(filePath) {
        try {
            await fs.unlink(filePath);
            console.log(`File ${filePath} deleted successfully`);
        } catch(error) {
            console.error(`Failed to delete file ${filePath}: ${error.message}`);
        }
    }

    getStats() {
        return {
            queueLength: this.queue.length,
            processingCount: this.processing.size,
            maxConcurrentJobs: this.maxConcurrentJobs,
            retryAttempts: this.retryAttempts
        }
    }
}

const jobQueue = new JobQueue({
    maxConcurrentJobs: 3,
    retryAttempts: 3
});


export {
    jobQueue
}