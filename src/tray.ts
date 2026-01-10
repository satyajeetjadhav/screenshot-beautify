#!/usr/bin/env node

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const SysTray = require("systray2").default;
import chokidar, { FSWatcher } from "chokidar";
import { resolve, basename, extname, join } from "path";
import { existsSync, mkdirSync } from "fs";
import { beautify } from "./beautify.js";
import { exec } from "child_process";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

function isImageFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

function isAlreadyBeautified(filePath: string): boolean {
  return basename(filePath).includes("_beautified");
}

// Simple camera icon as base64 PNG (16x16)
const ICON_BASE64 = `iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADRSURBVDiNpdMxSgNBGAXg7yaFWNhYWXgDj+ABPIClpY2F4AW8gIWVhYfwAB7AQrCwsLDYNRZZwnZnJ/FV/8ww7/3zD0P8VxZlw0WeHOMBjzjHNR5xgzMc4gon+Cj7XnC7hKnUk6g3eMZpOfsJL/GOR0xwjndM8YYtPCVcYR+neMAGFlJ3GGCxGqLUTQxwgW28JlxhF/N4rvQzxvgswQSbWMU8hqk7mOA7/tRd1HELu5jFXaV/KfV9/E1D/FTqBna6CfewjnvsYpBqgjq2sI1l/ANfJj0VB3rKpwAAAABJRU5ErkJggg==`;

interface TrayConfig {
  sourcePath: string;
  outputPath: string;
  padding?: number;
  backgroundImage?: string;
  backgroundPreset?: string;
  deleteOriginal?: boolean;
}

let watcher: FSWatcher | null = null;
let processedCount = 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let systray: any = null;
let trayReady = false;
let config: TrayConfig;

async function processFile(filePath: string): Promise<void> {
  if (!isImageFile(filePath) || isAlreadyBeautified(filePath)) {
    return;
  }

  const fileName = basename(filePath, extname(filePath));
  const beautifiedPath = join(config.outputPath, `${fileName}_beautified.png`);

  try {
    await beautify(filePath, beautifiedPath, {
      padding: config.padding || 80,
      backgroundImage: config.backgroundImage,
      backgroundPreset: config.backgroundPreset,
    });
    processedCount++;
    updateMenu();

    if (config.deleteOriginal) {
      const { unlink } = await import("fs/promises");
      await unlink(filePath);
    }
  } catch {
    // Silently fail in daemon mode
  }
}

function startWatching(): void {
  if (watcher) {
    return;
  }

  watcher = chokidar.watch(config.sourcePath, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  });

  watcher.on("ready", () => {
    updateMenu();
  });

  watcher.on("add", processFile);

  watcher.on("error", () => {
    // Silently handle errors in daemon mode
  });
}

function stopWatching(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
    updateMenu();
  }
}

function openOutputFolder(): void {
  const cmd = process.platform === "darwin"
    ? `open "${config.outputPath}"`
    : process.platform === "win32"
    ? `explorer "${config.outputPath}"`
    : `xdg-open "${config.outputPath}"`;

  exec(cmd);
}

function updateMenu(): void {
  if (!systray || !trayReady) return;

  const isWatching = watcher !== null;

  try {
    systray.sendAction({
      type: "update-item",
      item: {
        title: isWatching ? `✓ Watching (${processedCount} processed)` : "○ Not watching",
        enabled: false
      },
      seq_id: 0
    });

    systray.sendAction({
      type: "update-item",
      item: {
        title: isWatching ? "Stop Watching" : "Start Watching",
        enabled: true
      },
      seq_id: 1
    });
  } catch {
    // Ignore errors if tray is not ready
  }
}

async function createTray(): Promise<void> {
  systray = new SysTray({
    menu: {
      icon: ICON_BASE64,
      title: "",
      tooltip: "Screenshot Beautify",
      items: [
        {
          title: "○ Not watching",
          enabled: false
        },
        {
          title: "Start Watching",
          enabled: true
        },
        {
          title: "Open Output Folder",
          enabled: true
        },
        SysTray.separator,
        {
          title: "Quit",
          enabled: true
        }
      ]
    },
    debug: false,
    copyDir: true
  });

  // Wait for systray to be ready
  await systray.ready();
  trayReady = true;

  systray.onClick((action: { seq_id: number }) => {
    switch (action.seq_id) {
      case 1: // Toggle watching
        if (watcher) {
          stopWatching();
        } else {
          startWatching();
        }
        break;
      case 2: // Open output folder
        openOutputFolder();
        break;
      case 4: // Quit
        stopWatching();
        systray?.kill(false);
        process.exit(0);
        break;
    }
  });

  // Auto-start watching after tray is ready
  startWatching();
}

export async function startTray(options: TrayConfig): Promise<void> {
  config = {
    sourcePath: resolve(options.sourcePath),
    outputPath: resolve(options.outputPath),
    padding: options.padding || 80,
    backgroundImage: options.backgroundImage,
    backgroundPreset: options.backgroundPreset,
    deleteOriginal: options.deleteOriginal || false
  };

  if (!existsSync(config.sourcePath)) {
    console.error(`Source directory does not exist: ${config.sourcePath}`);
    process.exit(1);
  }

  if (!existsSync(config.outputPath)) {
    mkdirSync(config.outputPath, { recursive: true });
  }

  await createTray();
}
