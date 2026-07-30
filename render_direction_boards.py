from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageOps

ROOT = Path(__file__).parent
ASSETS = ROOT / "assets" / "report-media"
W, H = 1920, 1080
FONT = Path(r"C:\Windows\Fonts\msyh.ttc")
FONT_BOLD = Path(r"C:\Windows\Fonts\msyhbd.ttc")


def font(size, bold=False):
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT), size)


def text(draw, xy, value, size, color, bold=False, anchor=None):
    draw.text(xy, value, font=font(size, bold), fill=color, anchor=anchor)


def fit_image(name, box, contain=True, grayscale=False, tint=None, alpha=255):
    image = Image.open(ASSETS / name).convert("RGB")
    if grayscale:
        image = ImageOps.grayscale(image).convert("RGB")
    if tint:
        color = Image.new("RGB", image.size, tint)
        image = Image.blend(image, color, 0.34)
    x0, y0, x1, y1 = box
    size = (x1 - x0, y1 - y0)
    image = ImageOps.contain(image, size) if contain else ImageOps.fit(image, size)
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    layer.alpha_composite(image.convert("RGBA").putalpha(alpha) or image.convert("RGBA"), ((size[0]-image.width)//2, (size[1]-image.height)//2))
    return layer, (x0, y0)


def paste_asset(canvas, name, box, contain=True, grayscale=False, tint=None, alpha=255):
    image = Image.open(ASSETS / name).convert("RGB")
    if grayscale:
        image = ImageOps.grayscale(image).convert("RGB")
    if tint:
        image = Image.blend(image, Image.new("RGB", image.size, tint), 0.34)
    x0, y0, x1, y1 = box
    size = (x1 - x0, y1 - y0)
    image = ImageOps.contain(image, size) if contain else ImageOps.fit(image, size)
    image = image.convert("RGBA")
    image.putalpha(alpha)
    canvas.alpha_composite(image, (x0 + (size[0]-image.width)//2, y0 + (size[1]-image.height)//2))


def footer(draw, mood, reference, palette, dark=False):
    color = "#c5cbc6" if dark else "#414a45"
    muted = "#818983" if dark else "#707873"
    text(draw, (88, 1014), mood, 19, color, True)
    x = 970
    for swatch in palette:
        draw.rectangle((x, 1021, x + 58, 1029), fill=swatch)
        x += 68
    text(draw, (1832, 1014), reference, 17, muted, anchor="ra")


def board_a():
    canvas = Image.new("RGBA", (W, H), "#e9ece8")
    draw = ImageDraw.Draw(canvas)
    for x in range(0, W, 64):
        draw.line((x, 0, x, 780), fill="#dfe4e0", width=1)
    for y in range(0, 780, 64):
        draw.line((0, y, W, y), fill="#dfe4e0", width=1)
    text(draw, (88, 54), "方向 A · 透明地层剖切", 19, "#d85d32", True)
    text(draw, (88, 95), "看见每一立方米", 58, "#17201d", True)
    text(draw, (88, 165), "是怎样被切出来的", 58, "#17201d", True)
    text(draw, (88, 246), "把总挖方定义为一个可观察、可解释的封闭空间", 24, "#56635e")
    text(draw, (1745, 68), "03", 48, "#243a31", True, "ra")
    text(draw, (1832, 122), "形成开挖体", 18, "#56635e", True, "ra")
    paste_asset(canvas, "image7.png", (88, 350, 580, 650), False)
    draw.rectangle((88, 350, 580, 650), outline="#9ca7a1", width=2)
    draw.rectangle((105, 600, 318, 637), fill="#16201c")
    text(draw, (120, 610), "报告模型 · 原始地表", 16, "white")
    text(draw, (88, 730), "原始地表 − 设计开挖面", 25, "#273a32")
    text(draw, (88, 775), "= 封闭开挖体", 42, "#d85d32", True)
    text(draw, (88, 838), "随后沿基岩顶面分离土体与岩体", 18, "#66716d")
    x0, x1 = 660, 1745
    xs = [x0 + i * (x1-x0)//9 for i in range(10)]
    top = [425,390,430,350,420,335,410,355,405,365]
    design = [610,585,622,575,625,590,618,572,604,590]
    rock = [705,660,730,675,750,680,724,668,712,680]
    bottom = 900
    soil_poly = list(zip(xs, top)) + list(zip(reversed(xs), reversed(rock)))
    rock_poly = list(zip(xs, rock)) + [(x1,bottom),(x0,bottom)]
    excav_poly = list(zip(xs, top)) + list(zip(reversed(xs), reversed(design)))
    draw.polygon(rock_poly, fill="#777e7c", outline="#444c49")
    draw.polygon(soil_poly, fill="#b86c43", outline="#814a30")
    draw.polygon(excav_poly, fill="#e96d3c", outline="#b9401c")
    draw.line(list(zip(xs, top)), fill="#3d594b", width=7, joint="curve")
    draw.line(list(zip(xs, design)), fill="#f6a21a", width=10, joint="curve")
    draw.line(list(zip(xs, rock)), fill="#d9e0dc", width=5, joint="curve")
    for y in range(740, bottom, 42):
        draw.line((x0,y,x1,y), fill="#8f9692", width=1)
    for x in range(x0, x1, 60):
        draw.line((x,705,x,bottom), fill="#8f9692", width=1)
    labels = [(1780, 405, "原始地表", "#334b40"),(1780, 590, "设计开挖面", "#c84d25"),(1780, 690, "基岩顶面", "#48534e")]
    for x,y,label,c in labels:
        draw.line((1715,y+14,x-12,y+14), fill=c, width=2)
        text(draw, (x,y), label, 18, c, True)
    footer(draw, "气质：工程剖面模型 · 可信、清楚、适合逐步讲解", "参照：地质博物馆剖面模型 × 工程审查图", ["#728f80","#b86c43","#777e7c","#f6a21a"])
    canvas.convert("RGB").save(ROOT / "direction-a-cutaway.png", quality=95)


def board_b():
    canvas = Image.new("RGBA", (W, H), "#0b0d0c")
    draw = ImageDraw.Draw(canvas)
    text(draw, (88, 54), "方向 B · 数字孪生扫描", 19, "#ff6a35", True)
    text(draw, (88, 96), "从离散点到", 60, "#f0f2ee", True)
    text(draw, (88, 167), "可计算的机场", 60, "#f0f2ee", True)
    text(draw, (88, 250), "真实项目模型与原理动画同屏对应，突出三维建模能力", 23, "#9da59e")
    text(draw, (1832, 61), "DATASET / CSIA_EXPANSION", 16, "#8f9790", anchor="ra")
    text(draw, (1832, 89), "MODEL STATUS · SOLVING", 16, "#56d5c4", anchor="ra")
    draw.line((145, 370, 145, 910), fill="#414843", width=2)
    steps = [(390,"01","高程点"),(530,"02","连续地表"),(670,"03","开挖包络"),(810,"04","土岩剖分")]
    for y,n,label in steps:
        active = n == "03"
        draw.rectangle((139,y,151,y+12), fill="#ff6a35" if active else "#0b0d0c", outline="#ff6a35" if active else "#727b74", width=2)
        text(draw, (178,y-10), n, 31, "#f3f4f0", True)
        text(draw, (178,y+30), label, 18, "#ff6a35" if active else "#747c75")
    paste_asset(canvas, "image13.png", (370, 320, 1740, 850), True, tint="#ff6a35", alpha=205)
    paste_asset(canvas, "image11.png", (430, 390, 1680, 875), True, tint="#44d8c3", alpha=90)
    draw.polygon([(470,575),(1640,575),(1520,790),(590,790)], outline="#56d5c4", fill="#173a34")
    draw.line((470,575,1640,575), fill="#71f0dd", width=6)
    for x in range(540, 1600, 80):
        draw.line((x,585,x-20,770), fill="#2e6d64", width=1)
    draw.rectangle((1390, 760, 1808, 925), fill="#0e1210", outline="#565d58", width=1)
    text(draw, (1420, 790), "当前提取 · 总开挖包络体", 16, "#a8afa9")
    text(draw, (1420, 830), "22,249,200", 48, "#ffffff", True)
    text(draw, (1420, 892), "m3 · 全项目范围", 17, "#56d5c4")
    footer(draw, "气质：数字孪生扫描 · 技术感、规模感、证据感", "参照：工业数字孪生控制室 × 点云扫描可视化", ["#0b0d0c","#ff6a35","#5ce2cf","#d8ddd7"], True)
    canvas.convert("RGB").save(ROOT / "direction-b-digital-twin.png", quality=95)


def board_c():
    canvas = Image.new("RGBA", (W, H), "#f4f2ed")
    draw = ImageDraw.Draw(canvas)
    text(draw, (88, 54), "方向 C · 方量守恒实验台", 19, "#bd4d30", True)
    text(draw, (88, 95), "一个总体积", 58, "#171916", True)
    text(draw, (88, 164), "两类介质，三个区域", 58, "#171916", True)
    text(draw, (735, 135), "开挖体不消失，只在同一镜头中被分层、分区和计量，", 21, "#5f645e")
    text(draw, (735, 169), "让每个结果都能追溯回实体。", 21, "#5f645e")
    text(draw, (1832, 74), "全项目总挖方", 16, "#6e726c", anchor="ra")
    text(draw, (1832, 106), "22,249,200", 55, "#171916", True, "ra")
    text(draw, (1832, 170), "m3", 18, "#bd4d30", anchor="ra")
    draw.line((88, 226, 1832, 226), fill="#c9c8c2", width=2)
    text(draw, (88, 700), "体积守恒校核", 18, "#60655f")
    text(draw, (88, 744), "土 + 岩", 48, "#171916")
    text(draw, (88, 814), "11,138,600 + 11,110,600", 18, "#777b76")
    text(draw, (88, 846), "= 22,249,200 m3", 18, "#777b76")
    paste_asset(canvas, "image11.png", (360, 310, 1240, 600), True, grayscale=True, alpha=90)
    paste_asset(canvas, "image12.png", (390, 460, 1210, 725), True, tint="#bd5b3a", alpha=220)
    paste_asset(canvas, "image15.png", (410, 650, 1190, 900), True, grayscale=True, alpha=230)
    draw.line((770, 430, 770, 860), fill="#aaa79e", width=2)
    for y,label,color in [(330,"原始地表","#66706a"),(555,"土方 · 上部开挖体","#ad4d2f"),(752,"岩方 · 下部开挖体","#555a57")]:
        draw.rectangle((715,y,965,y+43), fill="#ffffff", outline="#d8d5cd")
        text(draw, (735,y+10), label, 17, color, True)
    draw.line((1300, 285, 1300, 925), fill="#c9c8c2", width=2)
    text(draw, (1350, 296), "方量拆分 / VOLUME LEDGER", 19, "#282b27", True)
    rows = [(365,"土方量","11,138,600","m3 · 50.06%","#bd5b3a",.5006),(570,"石方量","11,110,600","m3 · 49.94%","#646b67",.4994),(775,"区域拆分","3","一标段 / 二标段 / 航站楼","#171916",.82)]
    for y,label,value,meta,color,pct in rows:
        text(draw, (1350,y), label, 18, "#686c66")
        text(draw, (1815,y+28), value, 39, "#171916", True, "ra")
        text(draw, (1350,y+84), meta, 15, "#898c87")
        draw.rectangle((1350,y+125,1815,y+131), fill="#dedbd4")
        draw.rectangle((1350,y+125,1350+int(465*pct),y+131), fill=color)
        draw.line((1350,y+155,1815,y+155), fill="#d5d3cd", width=1)
    footer(draw, "气质：方量守恒实验台 · 理性、克制、便于核对结果", "参照：科学实验台 × 编辑部数据图形", ["#f4f2ed","#bd5b3a","#646b67","#171916"])
    canvas.convert("RGB").save(ROOT / "direction-c-volume-lab.png", quality=95)


if __name__ == "__main__":
    board_a()
    board_b()
    board_c()
    print("Rendered 3 direction boards at 1920x1080")
