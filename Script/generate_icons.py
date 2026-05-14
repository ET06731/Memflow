import os
import subprocess
import tempfile
from pathlib import Path

from PIL import Image


ICON_SIZES = [16, 32, 48, 128]
BROWSER_CANDIDATES = [
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
    Path(r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe")
]


def find_browser() -> Path:
    for candidate in BROWSER_CANDIDATES:
        if candidate.exists():
            return candidate
    raise FileNotFoundError("未找到可用的 Edge 或 Chrome 浏览器")


def render_svg_to_png(source_path: Path, temp_png_path: Path) -> None:
    browser_path = find_browser()
    icon_url = source_path.resolve().as_uri()

    html = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body {{
      margin: 0;
      width: 1024px;
      height: 1024px;
      overflow: hidden;
      background: transparent;
    }}

    body {{
      display: flex;
      align-items: stretch;
      justify-content: stretch;
    }}

    img {{
      width: 1024px;
      height: 1024px;
      display: block;
    }}
  </style>
</head>
<body>
  <img src="{icon_url}" alt="Memflow icon" />
</body>
</html>
"""

    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        suffix=".html",
        delete=False
    ) as html_file:
        html_file.write(html)
        html_path = Path(html_file.name)

    try:
        subprocess.run(
            [
                str(browser_path),
                "--headless",
                "--disable-gpu",
                "--hide-scrollbars",
                "--window-size=1024,1024",
                f"--screenshot={temp_png_path}",
                html_path.resolve().as_uri()
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
    finally:
        html_path.unlink(missing_ok=True)


def generate_icons(source_path: Path, target_dir: Path) -> None:
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as png_file:
        temp_png_path = Path(png_file.name)

    try:
        render_svg_to_png(source_path, temp_png_path)
        image = Image.open(temp_png_path).convert("RGBA")

        for size in ICON_SIZES:
            resized = image.resize((size, size), Image.Resampling.LANCZOS)
            target_path = target_dir / f"icon-{size}.png"
            resized.save(target_path)
            print(f"[ok] Generated {target_path}")

        image.resize((128, 128), Image.Resampling.LANCZOS).save(
            target_dir / "icon.png"
        )
        print(f"[ok] Generated {target_dir / 'icon.png'}")
    finally:
        temp_png_path.unlink(missing_ok=True)


if __name__ == "__main__":
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent
    source = project_root / "assets" / "icon.svg"
    assets_dir = project_root / "assets"
    generate_icons(source, assets_dir)
