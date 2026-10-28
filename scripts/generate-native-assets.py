#!/usr/bin/env python3
"""生成 Android / iOS 所需的图标和启动图。
源图标来自 www/icons/icon-1024.png，输出同时放到 resources/ 方便以后重新生成。
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ICON_SRC = ROOT / 'www' / 'icons' / 'icon-1024.png'
RES = ROOT / 'resources'
RES.mkdir(exist_ok=True)

CREAM = (246, 240, 227, 255)
CREAM_LIGHT = (251, 247, 238, 255)
CREAM_DARK = (234, 240, 225, 255)
INK = (48, 69, 54, 255)
INK_SOFT = (112, 125, 101, 255)
FONT_CN = Path('C:/Windows/Fonts/msyh.ttc')
FONT_CN_BOLD = Path('C:/Windows/Fonts/msyhbd.ttc')

icon = Image.open(ICON_SRC).convert('RGBA')
icon.save(RES / 'icon.png')


def load_font(path, size):
    if path.exists():
        return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def add_shadow(base, image, xy, shadow_alpha=44, blur=28):
    shadow = Image.new('RGBA', base.size, (0, 0, 0, 0))
    mask = Image.new('L', image.size, 0)
    radius = 44
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, image.size[0], image.size[1]), radius=radius, fill=255)
    dark = Image.new('RGBA', image.size, (55, 47, 33, shadow_alpha))
    shadow.paste(dark, xy, mask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(shadow)
    base.alpha_composite(image, xy)


def gradient_background(size):
    w, h = size
    bg = Image.new('RGBA', (w, h), CREAM)
    draw = ImageDraw.Draw(bg)
    for y in range(h):
        t = y / max(1, h - 1)
        top = CREAM_LIGHT
        bottom = CREAM_DARK
        color = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3)) + (255,)
        draw.line((0, y, w, y), fill=color)
    # 柔和的太阳光斑和草地暗示
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    r = int(min(w, h) * 0.24)
    gd.ellipse((w - r * 2.1, -r * 0.8, w + r * 0.1, r * 0.95), fill=(245, 217, 141, 48))
    glow = glow.filter(ImageFilter.GaussianBlur(r // 2))
    bg.alpha_composite(glow)
    return bg


def make_splash(size):
    w, h = size
    bg = gradient_background(size)
    draw = ImageDraw.Draw(bg)
    short = min(w, h)
    logo_size = int(short * 0.30)
    logo = icon.resize((logo_size, logo_size), Image.LANCZOS)
    x = int((w - logo_size) / 2)
    y = int(h * 0.36 - logo_size / 2)
    add_shadow(bg, logo, (x, y), shadow_alpha=36, blur=max(10, short // 110))

    title_font = load_font(FONT_CN_BOLD, max(20, int(short * 0.044)))
    subtitle_font = load_font(FONT_CN, max(10, int(short * 0.0175)))
    title = '小小花园'
    subtitle = '慢慢养，日日开'
    title_y = int(h * 0.575)
    draw.text((w / 2, title_y), title, font=title_font, fill=INK, anchor='ma')
    draw.text((w / 2, title_y + int(short * 0.073)), subtitle, font=subtitle_font, fill=INK_SOFT, anchor='ma')
    # 底部很轻的落款
    tiny = load_font(FONT_CN, max(8, int(short * 0.009)))
    draw.text((w / 2, h * 0.91), 'XIAOXIAO GARDEN', font=tiny, fill=(153, 157, 140, 190), anchor='ma')
    return bg.convert('RGB')


def make_foreground(size=432):
    """透明底的 daisy，用于 Android adaptive icon。"""
    scale = 4
    canvas_size = size * scale
    fg = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(fg)
    center = (canvas_size // 2, int(canvas_size * 0.44))
    # 茎
    draw.line(
        [(center[0], int(canvas_size * 0.78)), (center[0], int(canvas_size * 0.58))],
        fill=(99, 133, 88, 255),
        width=int(canvas_size * 0.027),
    )
    # 叶片
    leaf_color = (128, 160, 111, 255)
    leaf_dark = (103, 138, 92, 255)
    draw.ellipse(
        (
            center[0] - int(canvas_size * 0.20),
            int(canvas_size * 0.64),
            center[0] + int(canvas_size * 0.015),
            int(canvas_size * 0.72),
        ),
        fill=leaf_color,
    )
    draw.ellipse(
        (
            center[0] - int(canvas_size * 0.01),
            int(canvas_size * 0.70),
            center[0] + int(canvas_size * 0.17),
            int(canvas_size * 0.78),
        ),
        fill=leaf_dark,
    )
    # 十二片花瓣：每片在单独层上旋转
    petal_layer = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    pd = ImageDraw.Draw(petal_layer)
    petal_w = int(canvas_size * 0.13)
    petal_h = int(canvas_size * 0.30)
    pc = (canvas_size // 2, center[1] - int(canvas_size * 0.095))
    pd.ellipse(
        (pc[0] - petal_w // 2, pc[1] - petal_h // 2, pc[0] + petal_w // 2, pc[1] + petal_h // 2),
        fill=(255, 253, 246, 255),
        outline=(231, 220, 199, 255),
        width=max(1, canvas_size // 700),
    )
    for i in range(12):
        rotated = petal_layer.rotate(i * 30, center=pc, resample=Image.BICUBIC)
        fg.alpha_composite(rotated)
    # 花心
    r = int(canvas_size * 0.092)
    draw.ellipse((center[0] - r, center[1] - r, center[0] + r, center[1] + r), fill=(239, 194, 80, 255))
    r2 = int(r * 0.74)
    draw.ellipse((center[0] - r2, center[1] - r2, center[0] + r2, center[1] + r2), fill=(219, 166, 52, 255))
    r3 = int(r * 0.48)
    draw.ellipse((center[0] - r3, center[1] - r3, center[0] + r3, center[1] + r3), fill=(240, 198, 87, 255))
    return fg.resize((size, size), Image.LANCZOS)


def round_icon(size):
    base = icon.resize((size, size), Image.LANCZOS)
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(base, (0, 0), mask)
    return out


# 主图标 & 启动图
ios_splash = make_splash((2732, 2732))
ios_splash.save(RES / 'splash.png')

# iOS AppIcon / Splash
ios_icon = ROOT / 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
if ios_icon.parent.exists():
    # App Store 图标不能带 alpha 通道
    icon.convert('RGB').resize((1024, 1024), Image.LANCZOS).save(ios_icon)
    splash_dir = ROOT / 'ios/App/App/Assets.xcassets/Splash.imageset'
    for name in ('splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'):
        ios_splash.save(splash_dir / name)

# Android 图标
android_res = ROOT / 'android/app/src/main/res'
if android_res.exists():
    densities = {
        'mdpi': (48, 108),
        'hdpi': (72, 162),
        'xhdpi': (96, 216),
        'xxhdpi': (144, 324),
        'xxxhdpi': (192, 432),
    }
    fg_master = make_foreground(432)
    fg_master.save(RES / 'android-icon-foreground.png')
    for density, (legacy_size, fg_size) in densities.items():
        folder = android_res / ('mipmap-' + density)
        folder.mkdir(exist_ok=True)
        icon.resize((legacy_size, legacy_size), Image.LANCZOS).save(folder / 'ic_launcher.png')
        round_icon(legacy_size).save(folder / 'ic_launcher_round.png')
        fg = fg_master.resize((fg_size, fg_size), Image.LANCZOS)
        fg.save(folder / 'ic_launcher_foreground.png')

    # Android 启动图（按模板自带的尺寸替换）
    for path in android_res.glob('drawable*/splash.png'):
        with Image.open(path) as old:
            splash = make_splash(old.size)
        splash.save(path)

print('Native assets generated.')
