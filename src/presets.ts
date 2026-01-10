import sharp from "sharp";

export interface GradientPreset {
  name: string;
  colors: string[];
  angle?: number;
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
  return Object.keys(GRADIENT_PRESETS);
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
