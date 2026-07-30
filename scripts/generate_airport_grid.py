import json
import math
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "report-media" / "image9.png"
OUTPUT = ROOT / "src" / "airport-grid.json"

COLS = 112
ROWS = 45


def main():
    source = Image.open(SOURCE).convert("L")
    contrast = ImageOps.autocontrast(source)
    mask = contrast.point(lambda value: 255 if value > 26 else 0)
    mask = mask.filter(ImageFilter.MaxFilter(13))
    bbox = mask.getbbox()
    if not bbox:
        raise RuntimeError("Could not extract airport mask")
    mask = mask.crop(bbox).resize((COLS, ROWS), Image.Resampling.BOX)

    cells = []
    for row in range(ROWS):
        for col in range(COLS):
            if mask.getpixel((col, row)) < 26:
                continue
            nx = col / (COLS - 1)
            nz = row / (ROWS - 1)
            x = (nx - 0.5) * 28.0
            z = (nz - 0.5) * 11.2

            ground = (
                2.85
                + 0.70 * math.sin(nx * math.pi * 5.1)
                + 0.43 * math.cos(nz * math.pi * 4.3)
                + 0.22 * math.sin((nx + nz) * math.pi * 7.0)
            )
            design = (
                0.92
                + 0.22 * math.sin(nx * math.pi * 2.2)
                - 0.16 * math.cos(nz * math.pi * 2.0)
                + 0.10 * (nx - 0.5)
            )
            bedrock = (
                1.72
                + 0.86 * math.sin(nx * math.pi * 4.0 + 0.6)
                + 0.52 * math.cos(nz * math.pi * 3.2)
                - 0.18 * math.sin((nx - nz) * math.pi * 6.0)
            )

            total = max(0.12, ground - design)
            if bedrock <= design:
                soil = total
            elif bedrock >= ground:
                soil = 0.0
            else:
                soil = ground - bedrock
            rock = total - soil

            if nx > 0.72:
                region = 0
            elif nz > 0.54:
                region = 1
            else:
                region = 2

            cells.append([
                round(x, 3), round(z, 3), round(ground, 3),
                round(design, 3), round(bedrock, 3),
                round(soil, 3), round(rock, 3), region,
            ])

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "cols": COLS,
        "rows": ROWS,
        "source": "report-media/image9.png",
        "cellSize": [28.0 / (COLS - 1), 11.2 / (ROWS - 1)],
        "cells": cells,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=True, separators=(",", ":")), encoding="utf-8")
    print(f"Generated {len(cells)} occupied cells -> {OUTPUT}")


if __name__ == "__main__":
    main()

