import sharp from "sharp";

export interface FrameOptions {
  width: number;
  height: number;
  titleBarHeight?: number;
  cornerRadius?: number;
  buttonSize?: number;
}

export async function createFrame(options: FrameOptions): Promise<Buffer> {
  const {
    width,
    height,
    titleBarHeight = 32,
    cornerRadius = 10,
    buttonSize = 12,
  } = options;

  const buttonY = titleBarHeight / 2;
  const buttonSpacing = 20;
  const firstButtonX = 16;

  // macOS button colors
  const closeColor = "#FF5F56";
  const minimizeColor = "#FFBD2E";
  const maximizeColor = "#27C93F";

  // Create SVG for the window frame (title bar + border)
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="roundedCorners">
          <rect x="0" y="0" width="${width}" height="${height}" rx="${cornerRadius}" ry="${cornerRadius}" />
        </clipPath>
      </defs>

      <!-- Window background with rounded corners -->
      <rect x="0" y="0" width="${width}" height="${height}" rx="${cornerRadius}" ry="${cornerRadius}" fill="#FFFFFF" />

      <!-- Title bar -->
      <rect x="0" y="0" width="${width}" height="${titleBarHeight}" rx="${cornerRadius}" ry="${cornerRadius}" fill="#E8E8E8" />
      <!-- Fill bottom corners of title bar -->
      <rect x="0" y="${cornerRadius}" width="${width}" height="${titleBarHeight - cornerRadius}" fill="#E8E8E8" />

      <!-- Window buttons -->
      <circle cx="${firstButtonX}" cy="${buttonY}" r="${buttonSize / 2}" fill="${closeColor}" />
      <circle cx="${firstButtonX + buttonSpacing}" cy="${buttonY}" r="${buttonSize / 2}" fill="${minimizeColor}" />
      <circle cx="${firstButtonX + buttonSpacing * 2}" cy="${buttonY}" r="${buttonSize / 2}" fill="${maximizeColor}" />
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

export function getTitleBarHeight(options?: { titleBarHeight?: number }): number {
  return options?.titleBarHeight ?? 32;
}
