module.exports = {
    apps: [
        {
            name: "api-gateway",
            cwd: "./backend/api-gateway",
            script: "src/server.js",
            env: {
                NODE_ENV: "production",
                PORT: 3000
            }
        },
        {
            name: "upload-service",
            cwd: "./backend/upload-service",
            script: "src/s"
        },
        {
            name: "chunker-service",
            cwd: "./backend/chunker-service",
            script: "src/server.js",
            env: {
                NODE_ENV: "production",
                PORT: 3002
            }
        }
    ]
};