import sharp from "sharp";

export interface ShadowOptions {
  width: number;
  height: number;
  blur?: number;
  opacity?: number;
  offsetX?: number;
  offsetY?: number;
  cornerRadius?: number;
}

export async function createShadow(options: ShadowOptions): Promise<Buffer> {
  const {
    width,
    height,
    blur = 30,
    opacity = 0.5,
    cornerRadius = 10,
  } = options;

  // Make shadow slightly larger than the frame for better effect
  const shadowWidth = width + blur;
  const shadowHeight = height + blur;
  const offsetForSize = blur / 2;

  // Create a rounded rectangle for the shadow shape
  const svg = `
    <svg width="${shadowWidth}" height="${shadowHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="${offsetForSize}"
        y="${offsetForSize}"
        width="${width}"
        height="${height}"
        rx="${cornerRadius}"
        ry="${cornerRadius}"
        fill="rgba(0, 0, 0, ${opacity})"
      />
    </svg>
  `;

  // Create the shadow shape and blur it
  return sharp(Buffer.from(svg))
    .blur(blur)
    .png()
    .toBuffer();
}
