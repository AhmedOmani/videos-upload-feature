import fs from "fs/promises";
import { jobQueue } from "./jobQueue.js";

class Worker {
    constructor(queue) {
        this.queue = queue;
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        console.log("Worker started and running");

        this.queue.on("job-added" , () => this.processNext());
        this.queue.on("worker-available" , () => this.processNext());

        this.processNext();
    }

    async processNext() {
        if (!this.isRunning) return;
        if (!this.queue.canProcess()) return;

        const job = this.queue.getNextJob();
        if (!job) return;

        console.log("Worker fetches new job from queue: ", job.id);

        //Process job asynchronously (dont wait fot it)
        this.queue.processJob(job).then(() => {
            //After job finishes, try to process more
            this.processNext();
        });

        if (this.queue.canProcess()) {
            setImmediate(() => this.processNext());
        }
    }

    stop() {
        this.isRunning = false;
        console.log("Worker stopped");
    }
}

const worker = new Worker(jobQueue);
worker.start();

process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully...");
    worker.stop();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    worker.stop();
    process.exit(0);
});

setInterval(() => {
    const stats = jobQueue.getStats();
    console.log('Queue stats:', stats);
}, 30000);

export { worker };