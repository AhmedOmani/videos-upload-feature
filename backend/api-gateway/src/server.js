import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

app.use(cors({
    origin: true,  // Allow all origins for development
    credentials: true
}));

app.use("/api/upload", createProxyMiddleware({
    target: "http://localhost:3001",
    changeOrigin: true,
    pathRewrite: {
        '^/': '/upload/'  // Path received is /init, rewrite to /upload/init
    },
}));

app.listen(3000, () => {
    console.log("API Gateway is running on port 3000");
});

