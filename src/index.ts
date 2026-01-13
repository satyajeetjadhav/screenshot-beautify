#!/usr/bin/env node

import { Command } from "commander";
import { beautify } from "./beautify.js";
import { startTray } from "./tray.js";
import { listPresets } from "./presets.js";
import { resolve, basename, dirname, extname, join } from "path";
import chokidar from "chokidar";
import { existsSync, mkdirSync } from "fs";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

function isImageFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

function isAlreadyBeautified(filePath: string): boolean {
  return basename(filePath).includes("_beautified");
}

const program = new Command();

program
  .name("screenshot-beautify")
  .description("Beautify screenshots with window frames, backgrounds, and shadows")
  .version("1.0.0");

// List available presets
program
  .command("presets")
  .description("List available background presets")
  .action(() => {
    console.log("Available background presets:\n");
    console.log("  - auto (analyzes image and creates matching gradient)");
    const presets = listPresets().filter(p => p !== "auto");
    presets.forEach((name) => {
      console.log(`  - ${name}`);
    });
    console.log("\nUsage: screenshot-beautify <input> --preset sunset");
  });

// Watch command
program
  .command("watch <source> <output>")
  .description("Watch a directory and auto-beautify new screenshots")
  .option("--padding <number>", "Padding around the screenshot", "80")
  .option("--background <path>", "Background image path")
  .option("--preset <name>", "Background preset (run 'presets' to see options)")
  .option("--delete-original", "Delete original file after beautifying", false)
  .action(async (source: string, output: string, opts: {
    padding: string;
    background?: string;
    preset?: string;
    deleteOriginal: boolean;
  }) => {
    try {
      const sourcePath = resolve(source);
      const outputPath = resolve(output);
      const padding = parseInt(opts.padding, 10);
      const backgroundImage = opts.background ? resolve(opts.background) : undefined;
      const backgroundPreset = opts.preset;

      if (!existsSync(sourcePath)) {
        console.error(`Source directory does not exist: ${sourcePath}`);
        process.exit(1);
      }

      if (!existsSync(outputPath)) {
        mkdirSync(outputPath, { recursive: true });
        console.log(`Created output directory: ${outputPath}`);
      }

      console.log(`\n🔍 Watching for screenshots in: ${sourcePath}`);
      console.log(`📁 Beautified screenshots will be saved to: ${outputPath}`);
      console.log(`⚙️  Options: padding=${padding}${backgroundPreset ? `, preset=${backgroundPreset}` : ''}${backgroundImage ? `, background=${backgroundImage}` : ''}${opts.deleteOriginal ? ', delete-original=true' : ''}`);
      console.log(`\n✅ File watcher is now running...`);
      console.log(`   Press Ctrl+C to stop\n`);

      const watcher = chokidar.watch(sourcePath, {
        ignored: /(^|[\/\\])\../,
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 500,
          pollInterval: 100
        }
      });

      const timestamp = () => new Date().toLocaleTimeString();

      const processFile = async (filePath: string) => {
        if (!isImageFile(filePath) || isAlreadyBeautified(filePath)) {
          return;
        }

        const fileName = basename(filePath, extname(filePath));
        const beautifiedPath = join(outputPath, `${fileName}_beautified.png`);

        try {
          console.log(`[${timestamp()}] 📸 New screenshot detected: ${basename(filePath)}`);
          await beautify(filePath, beautifiedPath, { padding, backgroundImage, backgroundPreset });
          console.log(`[${timestamp()}] ✨ Beautified: ${basename(beautifiedPath)}`);

          if (opts.deleteOriginal) {
            const { unlink } = await import("fs/promises");
            await unlink(filePath);
            console.log(`[${timestamp()}] 🗑️  Deleted original: ${basename(filePath)}`);
          }
        } catch (err) {
          console.error(`[${timestamp()}] ❌ Failed to beautify ${basename(filePath)}:`, err instanceof Error ? err.message : err);
        }
      };

      watcher.on("ready", () => {
        console.log(`[${timestamp()}] 👀 Watching for new files...\n`);
      });

      watcher.on("add", processFile);

      watcher.on("error", (error) => {
        console.error(`[${timestamp()}] ❌ Watcher error:`, error);
      });

      process.on("SIGINT", () => {
        console.log("\n🛑 Stopping watcher...");
        watcher.close();
        process.exit(0);
      });

    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Tray command
program
  .command("tray <source> <output>")
  .description("Run as a system tray app with auto-beautify")
  .option("--padding <number>", "Padding around the screenshot", "80")
  .option("--background <path>", "Background image path")
  .option("--preset <name>", "Background preset (run 'presets' to see options)")
  .option("--delete-original", "Delete original file after beautifying", false)
  .option("--foreground", "Run in foreground (don't detach)", false)
  .option("--_daemon", "Internal: running as daemon", false)
  .action(async (source: string, output: string, opts: {
    padding: string;
    background?: string;
    preset?: string;
    deleteOriginal: boolean;
    foreground: boolean;
    _daemon: boolean;
  }) => {
    const padding = parseInt(opts.padding, 10);
    const backgroundImage = opts.background ? resolve(opts.background) : undefined;
    const backgroundPreset = opts.preset;

    // If not running as daemon and not in foreground mode, spawn background process
    if (!opts._daemon && !opts.foreground) {
      const { spawn } = await import("child_process");
      const args = [
        process.argv[1],
        "tray",
        source,
        output,
        "--padding", opts.padding,
        "--_daemon"
      ];
      if (backgroundImage) args.push("--background", backgroundImage);
      if (backgroundPreset) args.push("--preset", backgroundPreset);
      if (opts.deleteOriginal) args.push("--delete-original");

      const child = spawn(process.execPath, args, {
        detached: true,
        stdio: "ignore",
        env: process.env
      });
      child.unref();

      console.log("📷 Screenshot Beautify started in system tray");
      console.log(`   Watching: ${resolve(source)}`);
      console.log(`   Output: ${resolve(output)}`);
      console.log("\nThe app is now running in the background.");
      console.log("Click the tray icon to control it, or use 'Quit' to stop.");
      process.exit(0);
    }

    // Running as daemon or in foreground mode
    await startTray({
      sourcePath: source,
      outputPath: output,
      padding,
      backgroundImage,
      backgroundPreset,
      deleteOriginal: opts.deleteOriginal
    });
  });

// Default command for single file
program
  .command("file <input>", { isDefault: true })
  .description("Beautify a single screenshot")
  .option("-o, --output <path>", "Output file path")
  .option("--padding <number>", "Padding around the screenshot", "80")
  .option("--background <path>", "Background image path")
  .option("--preset <name>", "Background preset (run 'presets' to see options)")
  .option("--delete-original", "Delete original file after beautifying", false)
  .action(async (input: string, opts: {
    output?: string;
    padding: string;
    background?: string;
    preset?: string;
    deleteOriginal: boolean;
  }) => {
    try {
      const inputPath = resolve(input);
      const padding = parseInt(opts.padding || "80", 10);
      const backgroundImage = opts.background ? resolve(opts.background) : undefined;
      const backgroundPreset = opts.preset;

      const outputPath = opts.output
        ? resolve(opts.output)
        : join(
            dirname(inputPath),
            `${basename(inputPath, extname(inputPath))}_beautified.png`
          );

      console.log(`Beautifying: ${inputPath}`);

      await beautify(inputPath, outputPath, { padding, backgroundImage, backgroundPreset });

      console.log(`Saved to: ${outputPath}`);

      if (opts.deleteOriginal) {
        const { unlink } = await import("fs/promises");
        await unlink(inputPath);
        console.log(`🗑️  Deleted original: ${basename(inputPath)}`);
      }
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
