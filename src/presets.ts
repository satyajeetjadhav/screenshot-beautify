import sharp from "sharp";

export interface GradientPreset {
  name: string;
  colors: string[];
  angle?: number;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): RGB {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

export async function extractDominantColor(imagePath: string): Promise<string[]> {
  // Resize image to small size for faster color analysis
  const { data, info } = await sharp(imagePath)
    .resize(50, 50, { fit: "cover" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Collect all pixel colors and track saturation
  const colorCounts = new Map<string, { count: number; r: number; g: number; b: number }>();
  let totalSaturation = 0;
  let pixelCount = 0;

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Track average saturation across all pixels
    const pixelHsl = rgbToHsl(r, g, b);
    totalSaturation += pixelHsl.s;
    pixelCount++;

    // Quantize colors to reduce noise (group similar colors)
    const qr = Math.round(r / 32) * 32;
    const qg = Math.round(g / 32) * 32;
    const qb = Math.round(b / 32) * 32;
    const key = `${qr},${qg},${qb}`;

    const existing = colorCounts.get(key);
    if (existing) {
      existing.count++;
    } else {
      colorCounts.set(key, { count: 1, r: qr, g: qg, b: qb });
    }
  }

  // Sort by count and get the most dominant color
  const sorted = [...colorCounts.values()].sort((a, b) => b.count - a.count);
  const dominant = sorted[0];

  // Convert to HSL to create a gradient
  const hsl = rgbToHsl(dominant.r, dominant.g, dominant.b);

  // Check if the OVERALL image is neutral (average saturation is low)
  // This handles cases where small colorful elements exist in a mostly grey image
  const avgSaturation = totalSaturation / pixelCount;

  // Also check if RGB values are close to each other (direct grey check)
  const rgbRange = Math.max(dominant.r, dominant.g, dominant.b) - Math.min(dominant.r, dominant.g, dominant.b);
  const isGreyish = rgbRange < 40; // RGB values within 40 of each other = grey

  const isNeutral = avgSaturation < 25 || hsl.s < 15 || isGreyish;

  let color1Hsl, color2Hsl;

  if (isNeutral) {
    // For grey/neutral images, keep it grey - subtle lightness variation
    color1Hsl = {
      h: hsl.h,
      s: 0,
      l: Math.min(hsl.l + 8, 55)
    };
    color2Hsl = {
      h: hsl.h,
      s: 0,
      l: Math.max(hsl.l - 5, 20)
    };
  } else {
    // For colorful images, subtle gradient based on dominant color
    color1Hsl = {
      h: hsl.h,
      s: Math.min(hsl.s + 5, 60),
      l: Math.min(hsl.l + 10, 60)
    };
    color2Hsl = {
      h: (hsl.h + 15) % 360, // Slight hue shift
      s: hsl.s,
      l: Math.max(hsl.l - 5, 25)
    };
  }

  const color1 = hslToRgb(color1Hsl.h, color1Hsl.s, color1Hsl.l);
  const color2 = hslToRgb(color2Hsl.h, color2Hsl.s, color2Hsl.l);

  return [
    rgbToHex(color1.r, color1.g, color1.b),
    rgbToHex(color2.r, color2.g, color2.b)
  ];
}

// Beautiful gradient presets inspired by macOS wallpapers
export const GRADIENT_PRESETS: Record<string, GradientPreset> = {
  // Warm tones
  sunset: {
    name: "Sunset",
    colors: ["#ff9a9e", "#fecfef", "#fecfef", "#fad0c4"],
    angle: 135,
  },
  sunrise: {
    name: "Sunrise",
    colors: ["#f093fb", "#f5576c"],
    angle: 135,
  },
  peach: {
    name: "Peach",
    colors: ["#ffecd2", "#fcb69f"],
    angle: 135,
  },

  // Cool tones
  ocean: {
    name: "Ocean",
    colors: ["#667eea", "#764ba2"],
    angle: 135,
  },
  sky: {
    name: "Sky",
    colors: ["#a1c4fd", "#c2e9fb"],
    angle: 135,
  },
  northern: {
    name: "Northern Lights",
    colors: ["#43e97b", "#38f9d7"],
    angle: 135,
  },

  // Dark tones
  charcoal: {
    name: "Charcoal",
    colors: ["#2d3436", "#636e72"],
    angle: 135,
  },
  midnight: {
    name: "Midnight",
    colors: ["#232526", "#414345"],
    angle: 135,
  },
  space: {
    name: "Space",
    colors: ["#0f0c29", "#302b63", "#24243e"],
    angle: 135,
  },

  // Vibrant
  neon: {
    name: "Neon",
    colors: ["#fc00ff", "#00dbde"],
    angle: 135,
  },
  fire: {
    name: "Fire",
    colors: ["#f12711", "#f5af19"],
    angle: 135,
  },
  aurora: {
    name: "Aurora",
    colors: ["#00c6fb", "#005bea"],
    angle: 135,
  },

  // Soft/Muted
  lavender: {
    name: "Lavender",
    colors: ["#e0c3fc", "#8ec5fc"],
    angle: 135,
  },
  mint: {
    name: "Mint",
    colors: ["#d4fc79", "#96e6a1"],
    angle: 135,
  },
  rose: {
    name: "Rose",
    colors: ["#eecda3", "#ef629f"],
    angle: 135,
  },
};

export function listPresets(): string[] {
  return ["auto", ...Object.keys(GRADIENT_PRESETS)];
}

export async function createPresetBackground(
  presetName: string,
  width: number,
  height: number
): Promise<Buffer> {
  const preset = GRADIENT_PRESETS[presetName];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}. Available: ${listPresets().join(", ")}`);
  }

  const { colors, angle = 135 } = preset;

  // Convert angle to x1,y1,x2,y2 coordinates
  const angleRad = (angle * Math.PI) / 180;
  const x1 = Math.round(50 - Math.cos(angleRad) * 50);
  const y1 = Math.round(50 - Math.sin(angleRad) * 50);
  const x2 = Math.round(50 + Math.cos(angleRad) * 50);
  const y2 = Math.round(50 + Math.sin(angleRad) * 50);

  // Create gradient stops
  const stops = colors
    .map((color, i) => {
      const offset = (i / (colors.length - 1)) * 100;
      return `<stop offset="${offset}%" style="stop-color:${color};stop-opacity:1" />`;
    })
    .join("\n          ");

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
          ${stops}
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
