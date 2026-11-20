from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent
font = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
bold = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
canvas = Image.new('RGB', (1256, 3238), '#f7f4eb')
draw = ImageDraw.Draw(canvas)
draw.text((28, 20), '茉莉 · 五种花型', font=ImageFont.truetype(bold, 40), fill='#20382f')
draw.text((28, 82), '同光照、同角度  ·  左侧斜俯视 / 右侧侧视', font=ImageFont.truetype(font, 25), fill='#52685d')
for row, (grade, title) in enumerate([
    ('common','普通品质 · 疏枝星瓣'), ('fine', '优良品质 · 风车旋瓣'), ('rare', '精良品质 · 双轮小簇'),
    ('epic', '珍藏品质 · 卷瓣重轮'), ('legendary', '传说品质 · 密簇重瓣')]):
    y = 142 + row*614
    draw.text((28,y), title, font=ImageFont.truetype(bold,29), fill='#20382f')
    for col, view in enumerate(('above','side')):
        picture = Image.open(root/(grade+'-'+view+'.png')).convert('RGB')
        canvas.paste(picture, (24+col*608,y+46))
canvas.save(root/'jasmine-five-grades-preview.jpg', quality=94)
