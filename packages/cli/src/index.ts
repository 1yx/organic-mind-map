/**
 * @omm/cli - Command parsing, validation, server startup, preview orchestration.
 */

export async function runCli(argv: string[]): Promise<number> {
  const command = argv[2] ?? "help";

  switch (command) {
    case "help":
      console.log("omm <command>");
      console.log("");
      console.log("Commands:");
      console.log("  preview <file>  Start local preview server");
      console.log("  validate <file> Validate agent-list or .omm file");
      console.log("  help            Show this help message");
      return 0;

    case "preview":
      console.log("Preview mode — not yet implemented");
      return 1;

    case "validate":
      console.log("Validate mode — not yet implemented");
      return 1;

    default:
      console.error(`Unknown command: ${command}`);
      return 1;
  }
}

// Direct execution: tsx src/index.ts <args>
const isDirectRun = import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  runCli(process.argv).then((code) => {
    process.exitCode = code;
  });
}
