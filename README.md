# screenshot-beautify

A CLI tool to beautify screenshots with macOS-style window frames, shadows, and gradient backgrounds.

## Installation

```bash
npm install -g screenshot-beautify
```

## Usage

### Single File

```bash
screenshot-beautify image.png
screenshot-beautify image.png --preset sunset
screenshot-beautify image.png --background ~/Pictures/wallpaper.jpg
screenshot-beautify image.png -o output.png --padding 100
```

### Watch Mode

Automatically beautify screenshots as they're added to a directory:

```bash
screenshot-beautify watch ~/Desktop ~/Desktop/beautified --preset ocean
```

### System Tray Mode (macOS)

Run in the background with a menu bar icon:

```bash
screenshot-beautify tray ~/Desktop ~/Desktop/beautified --preset sunset
```

The tray icon lets you:
- See status and processed count
- Start/Stop watching
- Open output folder
- Quit the app

## Options

| Option | Description |
|--------|-------------|
| `--preset <name>` | Use a built-in gradient preset |
| `--background <path>` | Use a custom image as background |
| `--padding <number>` | Padding around screenshot (default: 80) |
| `-o, --output <path>` | Output file path |
| `--delete-original` | Delete original after beautifying |
| `--foreground` | Run tray in foreground (for debugging) |

## Presets

List available presets:

```bash
screenshot-beautify presets
```

**Available presets:**

| Category | Presets |
|----------|---------|
| Warm | `sunset`, `sunrise`, `peach` |
| Cool | `ocean`, `sky`, `northern` |
| Dark | `charcoal`, `midnight`, `space` |
| Vibrant | `neon`, `fire`, `aurora` |
| Soft | `lavender`, `mint`, `rose` |

## Examples

```bash
# Basic usage
screenshot-beautify screenshot.png

# With sunset gradient
screenshot-beautify screenshot.png --preset sunset

# Watch Desktop and save to a subfolder
screenshot-beautify watch ~/Desktop ~/Desktop/beautified --preset ocean

# Run in system tray with custom wallpaper background
screenshot-beautify tray ~/Desktop ~/Desktop/beautified --background ~/wallpaper.jpg

# Custom padding
screenshot-beautify screenshot.png --padding 120 --preset midnight
```

## Output

The tool adds:
- macOS-style window frame with traffic light buttons
- Rounded corners
- Drop shadow
- Gradient or custom image background

## License

MIT
