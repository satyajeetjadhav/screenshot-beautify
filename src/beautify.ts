import sharp from "sharp";
import { createBackground } from "./background.js";
import { createFrame, getTitleBarHeight } from "./frame.js";

export interface BeautifyOptions {
  padding?: number;
  cornerRadius?: number;
  titleBarHeight?: number;
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
    cornerRadius = 12,
    titleBarHeight = 40,
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
  const canvasWidth = framedWidth + padding * 2;
  const canvasHeight = framedHeight + padding * 2;

  // Create background
  const background = await createBackground({
    width: canvasWidth,
    height: canvasHeight,
    imagePath: backgroundImage,
    preset: backgroundPreset,
    gradientStart,
    gradientEnd,
    sourceImagePath: backgroundPreset === "auto" ? inputPath : undefined,
  });

  // Create the window frame
  const frame = await createFrame({
    width: framedWidth,
    height: framedHeight,
    titleBarHeight,
    cornerRadius,
  });

  // Position calculations (centered)
  const frameX = padding;
  const frameY = padding;
  const screenshotX = frameX;
  const screenshotY = frameY + titleBarHeight;

  // Create shadow for auto preset (helps distinguish from similar background)
  let shadow: Buffer | null = null;
  if (backgroundPreset === "auto") {
    const shadowBlur = 30;
    const shadowOffsetX = 0;
    const shadowOffsetY = 8;
    const shadowOpacity = 0.4;

    // Shadow needs extra space for blur
    const shadowWidth = framedWidth + shadowBlur * 2;
    const shadowHeight = framedHeight + shadowBlur * 2;

    const shadowSvg = `
      <svg width="${shadowWidth}" height="${shadowHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="${shadowBlur / 2}" />
          </filter>
        </defs>
        <rect
          x="${shadowBlur}"
          y="${shadowBlur}"
          width="${framedWidth}"
          height="${framedHeight}"
          rx="${cornerRadius}"
          ry="${cornerRadius}"
          fill="rgba(0, 0, 0, ${shadowOpacity})"
          filter="url(#shadow)"
        />
      </svg>
    `;
    shadow = await sharp(Buffer.from(shadowSvg)).png().toBuffer();
  }

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

  // Build composite layers
  const layers: sharp.OverlayOptions[] = [];

  // Add shadow first (behind everything) for auto preset
  if (shadow) {
    const shadowBlur = 30;
    const shadowOffsetY = 8;
    layers.push({
      input: shadow,
      left: Math.round(frameX - shadowBlur),
      top: Math.round(frameY - shadowBlur + shadowOffsetY),
    });
  }

  // Window frame
  layers.push({
    input: frame,
    left: Math.round(frameX),
    top: Math.round(frameY),
  });

  // Screenshot
  layers.push({
    input: roundedScreenshot,
    left: Math.round(screenshotX),
    top: Math.round(screenshotY),
  });

  // Compose everything together
  await sharp(background)
    .composite(layers)
    .png()
    .toFile(outputPath);
}
