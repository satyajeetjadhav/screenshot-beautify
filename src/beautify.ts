import sharp from "sharp";
import { createBackground } from "./background.js";
import { createFrame, getTitleBarHeight } from "./frame.js";
import { createShadow } from "./shadow.js";

export interface BeautifyOptions {
  padding?: number;
  cornerRadius?: number;
  titleBarHeight?: number;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  backgroundImage?: string;
  backgroundPreset?: string;
  gradientStart?: string;
  gradientEnd?: string;
}

export async function beautify(
  inputPath: string,
  outputPath: string,
  options: BeautifyOptions = {}
): Promise<void> {
  const {
    padding = 80,
    cornerRadius = 10,
    titleBarHeight = 32,
    shadowBlur = 30,
    shadowOffsetX = 0,
    shadowOffsetY = 20,
    backgroundImage,
    backgroundPreset,
    gradientStart = "#2d3436",
    gradientEnd = "#636e72",
  } = options;

  // Load the input screenshot
  const inputImage = sharp(inputPath);
  const metadata = await inputImage.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Could not determine image dimensions");
  }

  const imgWidth = metadata.width;
  const imgHeight = metadata.height;

  // Calculate dimensions
  const framedWidth = imgWidth;
  const framedHeight = imgHeight + titleBarHeight;
  const totalWidth = framedWidth + padding * 2;
  const totalHeight = framedHeight + padding * 2;

  // Extra space for shadow blur and offset
  const shadowPadding = shadowBlur * 2 + Math.abs(shadowOffsetY);
  const canvasWidth = totalWidth + shadowPadding;
  const canvasHeight = totalHeight + shadowPadding;

  // Create background
  const background = await createBackground({
    width: canvasWidth,
    height: canvasHeight,
    imagePath: backgroundImage,
    preset: backgroundPreset,
    gradientStart,
    gradientEnd,
  });

  // Create the window frame
  const frame = await createFrame({
    width: framedWidth,
    height: framedHeight,
    titleBarHeight,
    cornerRadius,
  });

  // Create shadow
  const shadow = await createShadow({
    width: framedWidth,
    height: framedHeight,
    blur: shadowBlur,
    cornerRadius,
  });

  // Position calculations (centered with shadow padding offset)
  const frameX = padding + shadowPadding / 2;
  const frameY = padding + shadowPadding / 2;
  const shadowX = frameX + shadowOffsetX - shadowBlur / 2;
  const shadowY = frameY + shadowOffsetY - shadowBlur / 2;
  const screenshotX = frameX;
  const screenshotY = frameY + titleBarHeight;

  // Create a mask for rounded bottom corners on the screenshot
  const cornerMask = Buffer.from(`
    <svg width="${imgWidth}" height="${imgHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="0"
        y="0"
        width="${imgWidth}"
        height="${imgHeight}"
        rx="${cornerRadius}"
        ry="${cornerRadius}"
        fill="white"
      />
      <!-- Fill top corners to make them square (only bottom should be rounded) -->
      <rect x="0" y="0" width="${cornerRadius}" height="${cornerRadius}" fill="white"/>
      <rect x="${imgWidth - cornerRadius}" y="0" width="${cornerRadius}" height="${cornerRadius}" fill="white"/>
    </svg>
  `);

  // Apply rounded corners to screenshot
  const roundedScreenshot = await sharp(inputPath)
    .ensureAlpha()
    .composite([
      {
        input: await sharp(cornerMask).png().toBuffer(),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  // Compose everything together
  await sharp(background)
    .composite([
      // Shadow layer
      {
        input: shadow,
        left: Math.round(shadowX),
        top: Math.round(shadowY),
      },
      // Window frame
      {
        input: frame,
        left: Math.round(frameX),
        top: Math.round(frameY),
      },
      // Screenshot
      {
        input: roundedScreenshot,
        left: Math.round(screenshotX),
        top: Math.round(screenshotY),
      },
    ])
    .png()
    .toFile(outputPath);
}
