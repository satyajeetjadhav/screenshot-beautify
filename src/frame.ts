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
    titleBarHeight = 40,
    cornerRadius = 12,
    buttonSize = 14,
  } = options;

  const buttonY = titleBarHeight / 2;
  const buttonSpacing = 22;
  const firstButtonX = 20;

  // macOS button colors - vibrant and clear
  const closeColor = "#FF5F57";
  const minimizeColor = "#FEBC2E";
  const maximizeColor = "#28C840";

  // Dark title bar color (like modern dark mode apps)
  const titleBarColor = "#3C3C3C";
  const contentBgColor = "#2D2D2D";

  // Create SVG for the window frame (title bar + border)
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="roundedCorners">
          <rect x="0" y="0" width="${width}" height="${height}" rx="${cornerRadius}" ry="${cornerRadius}" />
        </clipPath>
      </defs>

      <!-- Window background with rounded corners -->
      <rect x="0" y="0" width="${width}" height="${height}" rx="${cornerRadius}" ry="${cornerRadius}" fill="${contentBgColor}" />

      <!-- Title bar -->
      <rect x="0" y="0" width="${width}" height="${titleBarHeight}" rx="${cornerRadius}" ry="${cornerRadius}" fill="${titleBarColor}" />
      <!-- Fill bottom corners of title bar -->
      <rect x="0" y="${cornerRadius}" width="${width}" height="${titleBarHeight - cornerRadius}" fill="${titleBarColor}" />

      <!-- Window buttons with subtle inner shadows for depth -->
      <circle cx="${firstButtonX}" cy="${buttonY}" r="${buttonSize / 2}" fill="${closeColor}" />
      <circle cx="${firstButtonX + buttonSpacing}" cy="${buttonY}" r="${buttonSize / 2}" fill="${minimizeColor}" />
      <circle cx="${firstButtonX + buttonSpacing * 2}" cy="${buttonY}" r="${buttonSize / 2}" fill="${maximizeColor}" />
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

export function getTitleBarHeight(options?: { titleBarHeight?: number }): number {
  return options?.titleBarHeight ?? 40;
}
