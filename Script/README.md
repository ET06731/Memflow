# Memflow Scripts

这个目录包含用于项目的自动化脚本。

## 脚本列表

### `generate_icons.py`

用于从源图像（如 `assets/Image 1.png`）生成浏览器扩展所需的多种尺寸图标。

**用途：**
生成 `icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png` 以及 `icon.png`。

**依赖：**
- Python 3
- Pillow (`pip install Pillow`)

**运行：**
```bash
python Script/generate_icons.py
```
