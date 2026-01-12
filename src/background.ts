import sharp from "sharp";
import { createPresetBackground, GRADIENT_PRESETS, extractDominantColor } from "./presets.js";

export interface BackgroundOptions {
  width: number;
  height: number;
  imagePath?: string;
  preset?: string;
  gradientStart?: string;
  gradientEnd?: string;
  sourceImagePath?: string; // For "auto" preset to analyze colors
}

export async function createBackground(
  options: BackgroundOptions
): Promise<Buffer> {
  const {
    width,
    height,
    imagePath,
    preset,
    sourceImagePath,
    // Dark charcoal gradient as default
    gradientStart = "#2d3436",
    gradientEnd = "#636e72",
  } = options;

  // If an image path is provided, use it as background
  if (imagePath) {
    return sharp(imagePath)
      .resize(width, height, {
        fit: "cover",
        position: "center",
      })
      .png()
      .toBuffer();
  }

  // Handle "auto" preset - analyze image colors
  if (preset === "auto" && sourceImagePath) {
    const [autoStart, autoEnd] = await extractDominantColor(sourceImagePath);
    return createAutoBackground(width, height, autoStart, autoEnd);
  }

  // If a preset is specified, use it
  if (preset && GRADIENT_PRESETS[preset]) {
    return createPresetBackground(preset, width, height);
  }

  // Otherwise, create simple SVG gradient background
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${gradientStart};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${gradientEnd};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function createAutoBackground(
  width: number,
  height: number,
  gradientStart: string,
  gradientEnd: string
): Promise<Buffer> {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${gradientStart};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${gradientEnd};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
