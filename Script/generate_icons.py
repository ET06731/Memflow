from PIL import Image
import os

def generate_icons(source_path, target_dir):
    sizes = [16, 32, 48, 128]
    img = Image.open(source_path)
    
    # Generate sized icons
    for size in sizes:
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        target_path = os.path.join(target_dir, f"icon-{size}.png")
        resized.save(target_path)
        print(f"✅ Generated {target_path}")

    # Generate main icon.png (usually larger or 128)
    # We'll use 128 for icon.png as well
    img.resize((128, 128), Image.Resampling.LANCZOS).save(os.path.join(target_dir, "icon.png"))
    print(f"✅ Generated {os.path.join(target_dir, 'icon.png')}")

if __name__ == "__main__":
    source = "assets/Image 3.png"
    assets_dir = "assets"
    generate_icons(source, assets_dir)
