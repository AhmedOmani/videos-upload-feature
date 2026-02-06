module.exports = {
    apps: [
        {
            name: "api-gateway",
            cwd: "./backend/api-gateway",
            script: "node",
            args: "-r dotenv/config src/server.js",
            env: {
                NODE_ENV: "production",
                PORT: 3000
            }
        },
        {
            name: "upload-service",
            cwd: "./backend/upload-service",
            script: "node",
            args: "-r dotenv/config src/server.js",
            env: {
                NODE_ENV: "production",
                PORT: 3001
            }
        },
        {
            name: "chunker-service",
            cwd: "./backend/chunker-service",
            script: "node",
            args: "-r dotenv/config src/server.js",
            env: {
                NODE_ENV: "production",
                PORT: 3002
            }
        }
    ]
};