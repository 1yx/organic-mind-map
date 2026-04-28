/**
 * \@omm/cli - Command parsing, validation, server startup, preview orchestration.
 */

export async function runCli(argv: string[]): Promise<number> {
  const command = argv[2] ?? "help";

  switch (command) {
    case "help":
      console.log("omm <command>");
      console.log("");
      console.log("Commands:");
      console.log("  preview <file>  Start local preview server");
      console.log("  validate <file> Validate organic-tree or .omm file");
      console.log("  help            Show this help message");
      return 0;

    case "preview": {
      const { previewCommand } = await import("./preview.js");
      return previewCommand(argv.slice(3));
    }

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
  void runCli(process.argv).then((code) => {
    process.exitCode = code;
  });
}
