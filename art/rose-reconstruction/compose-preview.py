from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent
font = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
bold = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
canvas = Image.new('RGB', (1256, 2624), '#f7f4eb')
draw = ImageDraw.Draw(canvas)
draw.text((28, 20), '花园玫瑰 · 四品质重建预览', font=ImageFont.truetype(bold, 40), fill='#20382f')
draw.text((28, 82), '同光照、同角度  ·  左侧斜俯视 / 右侧侧视', font=ImageFont.truetype(font, 25), fill='#52685d')
for row, (grade, title) in enumerate([
    ('fine', '优良品质 · 螺旋高心'), ('rare', '精良品质 · 舒展莲座'),
    ('epic', '珍藏品质 · 卷边重瓣'), ('legendary', '传说品质 · 密瓣花心')]):
    y = 142 + row*614
    draw.text((28,y), title, font=ImageFont.truetype(bold,29), fill='#20382f')
    for col, view in enumerate(('above','side')):
        picture = Image.open(root/(grade+'-'+view+'.png')).convert('RGB')
        canvas.paste(picture, (24+col*608,y+46))
canvas.save(root/'garden-rose-four-qualities-rebuilt-preview.jpg', quality=94)
