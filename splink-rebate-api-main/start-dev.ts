import { spawn } from "child_process";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Check if USE_SSH_TUNNEL is set to "true"
const useSshTunnel =
  (process.env.USE_SSH_TUNNEL ?? "").toLocaleLowerCase() === "true";

let tunnelProcess: ReturnType<typeof spawn> | undefined;

/**
 * Function to spawn a process
 * @param command - The command to execute
 * @param args - Arguments for the command
 */
function runCommand(command: string, args: string[]): ReturnType<typeof spawn> {
  const childProcess = spawn(command, args, { stdio: "inherit", shell: true });

  // Handle process exit
  childProcess.on("close", (code) => {
    if (code !== 0) {
      console.error(`Process exited with code ${code}`);
      process.exit(code);
    }
  });

  return childProcess;
}

// Start the SSH tunnel if USE_SSH_TUNNEL is true
if (useSshTunnel) {
  console.log("Starting SSH tunnel...");
  tunnelProcess = runCommand("yarn", ["run", "tunnel"]);
}

// Start the main application
console.log("Starting main application...");

const appProcess: ReturnType<typeof spawn> = runCommand("yarn", [
  "run",
  "dev:app"
]);

// Handle SIGINT (Signal Interrupt) (Ctrl+C)
process.on("SIGINT", () => {
  console.log("Shutting down processes...");
  if (tunnelProcess) {
    tunnelProcess.kill(); // Terminate the SSH tunnel process
    console.log("tunnelProcess killed");
  }
  appProcess?.kill(); // Terminate the main application process
  console.log("appProcess killed");
  process.exit(0); // Exit the main Node.js process
});
