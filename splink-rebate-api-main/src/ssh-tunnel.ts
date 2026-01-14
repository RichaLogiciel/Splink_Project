import { spawn } from "child_process";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Define SSH configuration
const sshConfig = {
  host: process.env.SSH_HOST || "",
  port: 22, // Default SSH port
  username: process.env.SSH_USERNAME || "",
  keyPath: process.env.SSH_KEY_PATH || "",
  dbHost: process.env.DB_HOST || "",
  dbPort: Number(process.env.DB_PORT || "5432"), // Remote database port
  localPort: Number(process.env.DB_SSH_LOCAL_PORT || "5433") // Local port for the tunnel
};

// Build the SSH command arguments
const sshArgs = [
  "-i",
  sshConfig.keyPath,
  "-L",
  `${sshConfig.localPort}:${sshConfig.dbHost}:${sshConfig.dbPort}`,
  "-N",
  "-p",
  String(sshConfig.port),
  `${sshConfig.username}@${sshConfig.host}`
];

// Spawn the SSH process
console.info("Opening SSH tunnel...");
const tunnelProcess = spawn("ssh", sshArgs);

// Handle output and errors
tunnelProcess.stdout?.on("data", (data) => {
  console.info(`SSH stdout: ${data}`);
});

tunnelProcess.stderr?.on("data", (data) => {
  console.error(`SSH stderr: ${data}`);
});

tunnelProcess.on("close", (code) => {
  console.info(`SSH tunnel closed with code ${code}`);
});

// Keep the process alive until interrupted
process.on("SIGINT", () => {
  console.info("\nClosing SSH tunnel...");
  tunnelProcess.kill();
  process.exit();
});
