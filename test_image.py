from PIL import Image
import os

img = Image.open('/Users/kuriyamakoya/Desktop/スクリーンショット 2026-03-14 13.02.13.png')
print(f"Model ID: {img.size}, mode: {img.mode}")

for f in os.listdir('screenshots/raw'):
    if f.endswith('.png'):
        path = os.path.join('screenshots/raw', f)
        img = Image.open(path)
        print(f"Raw {f}: {img.size}")

for f in os.listdir('screenshots/composited'):
    if f.endswith('.png'):
        path = os.path.join('screenshots/composited', f)
        img = Image.open(path)
        print(f"Composited {f}: {img.size}")
