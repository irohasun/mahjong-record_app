import os
import glob
from PIL import Image, ImageDraw, ImageFont

# Settings
bg_color = (0, 0, 0, 255)
frame_color = (255, 107, 53, 255) # FF6B35
target_size = (1242, 2688)

# Find a Japanese font
font_path = None
fonts = glob.glob('/System/Library/Fonts/*角*W6.ttc')
if not fonts:
    fonts = glob.glob('/System/Library/Fonts/*W6.ttc')
if fonts:
    font_path = fonts[0]
else:
    print("Warning: Could not find Hiragino W6 font, using default")

try:
    font_large = ImageFont.truetype(font_path, 120) if font_path else ImageFont.load_default()
    font_medium = ImageFont.truetype(font_path, 100) if font_path else ImageFont.load_default()
except Exception as e:
    print(f"Error loading font: {e}, falling back.")
    font_large = ImageFont.load_default()
    font_medium = ImageFont.load_default()

text_configs = {
    'add-game.png': [
        {"text": "サクサク簡単", "color": (255, 255, 255, 255), "font": font_large, "y": 150},
        {"text": "毎日の対局を", "color": (255, 255, 255, 255), "font": font_large, "y": 300},
        {"text": "記録", "color": frame_color, "font": font_large, "y": 300, "inline": True}
    ],
    'group-details.png': [
        {"text": "友達やグループで", "color": (255, 255, 255, 255), "font": font_large, "y": 150},
        {"text": "成績を", "color": (255, 255, 255, 255), "font": font_large, "y": 300},
        {"text": "共有", "color": frame_color, "font": font_large, "y": 300, "inline": True}
    ],
    'home.png': [
        {"text": "過去の対局も", "color": (255, 255, 255, 255), "font": font_large, "y": 150},
        {"text": "ひと目で", "color": (255, 255, 255, 255), "font": font_large, "y": 300},
        {"text": "振り返る", "color": frame_color, "font": font_large, "y": 300, "inline": True}
    ],
    'statistics.png': [
        {"text": "統計画面で", "color": (255, 255, 255, 255), "font": font_large, "y": 150},
        {"text": "雀力を", "color": (255, 255, 255, 255), "font": font_large, "y": 300},
        {"text": "見える化", "color": frame_color, "font": font_large, "y": 300, "inline": True}
    ],
    'account.png': [
        {"text": "シンプルで", "color": (255, 255, 255, 255), "font": font_large, "y": 150},
        {"text": "洗練された", "color": (255, 255, 255, 255), "font": font_large, "y": 300},
        {"text": "デザイン", "color": frame_color, "font": font_large, "y": 300, "inline": True}
    ]
}

def draw_text_center(draw, texts, w):
    for t_item in texts:
        if t_item.get('inline'):
            continue
        inline_items = [t for t in texts if t.get('y') == t_item['y'] and t.get('inline')]
        if not inline_items:
            left, top, right, bottom = draw.textbbox((0, 0), t_item['text'], font=t_item['font'])
            tw = right - left
            draw.text(((w - tw) // 2, t_item['y']), t_item['text'], font=t_item['font'], fill=t_item['color'])
        else:
            combined_w = 0
            base_bbox = draw.textbbox((0, 0), t_item['text'], font=t_item['font'])
            combined_w += (base_bbox[2] - base_bbox[0])
            for it in inline_items:
                i_bbox = draw.textbbox((0, 0), it['text'], font=it['font'])
                combined_w += (i_bbox[2] - i_bbox[0])

            start_x = (w - combined_w) // 2
            draw.text((start_x, t_item['y']), t_item['text'], font=t_item['font'], fill=t_item['color'])
            start_x += (base_bbox[2] - base_bbox[0])
            for it in inline_items:
                draw.text((start_x, it['y']), it['text'], font=it['font'], fill=it['color'])
                i_bbox = draw.textbbox((0, 0), it['text'], font=it['font'])
                start_x += (i_bbox[2] - i_bbox[0])

os.makedirs('screenshots/composited', exist_ok=True)

for filename, text_config in text_configs.items():
    raw_path = os.path.join('screenshots/raw', filename)
    if not os.path.exists(raw_path):
        print(f"Skipping {filename}, not found")
        continue

    img = Image.open(raw_path).convert("RGBA")
    
    sc_w = 1040
    sc_h = int(img.height * (sc_w / img.width))
    img_resized = img.resize((sc_w, sc_h), Image.Resampling.LANCZOS)
    
    bg = Image.new('RGBA', target_size, bg_color)
    draw = ImageDraw.Draw(bg)
    
    draw_text_center(draw, text_config, target_size[0])
    
    padding = 20
    frame_w = sc_w + padding * 2
    frame_h = sc_h + padding * 2
    
    frame_x = (target_size[0] - frame_w) // 2
    frame_y = 520
    
    draw.rounded_rectangle(
        [frame_x, frame_y, frame_x + frame_w, frame_y + frame_h],
        radius=60,
        fill=frame_color
    )
    
    mask = Image.new("L", (sc_w, sc_h), 0)
    draw_mask = ImageDraw.Draw(mask)
    draw_mask.rounded_rectangle([0, 0, sc_w, sc_h], radius=50, fill=255)
    
    bg.paste(img_resized, (frame_x + padding, frame_y + padding), mask)
    
    out_path = os.path.join('screenshots/composited', filename)
    bg.save(out_path)
    print(f"Saved {out_path}")
