/**
 * @omm/cli - Command parsing, validation, server startup, preview orchestration.
 */

export { previewCommand } from "./preview.js";
export { startPreviewServer } from "./preview-server.js";
export type { PreviewServerOptions } from "./preview-server.js";
export type { PreviewPayload, PreviewOptions } from "./types.js";
export { CliExitCode } from "./types.js";

/**
 * Run the CLI with the given argv.
 *
 * @param argv  Typically `process.argv`.
 * @returns     Exit code. Also sets `process.exitCode`.
 */
export async function runCli(argv: string[]): Promise<number> {
  const command = argv[2] ?? "help";

  switch (command) {
    case "help": {
      console.log("omm <command>");
      console.log("");
      console.log("Commands:");
      console.log("  preview <file>  Validate and hand off to local preview server");
      console.log("  validate <file> Validate agent-list or .omm file");
      console.log("  help            Show this help message");
      return 0;
    }

    case "preview": {
      const { previewCommand } = await import("./preview.js");
      // Pass argv starting from "preview" so the preview command can parse
      // subcommand-level flags.
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
  runCli(process.argv).then((code) => {
    process.exitCode = code;
  });
}
