from PIL import Image

CELL_SIZE = 16
G_WIDTH = 129
G_HEIGHT = 97
LINE_COLOR = (255, 255, 255, 128)

im = Image.new("RGBA", (G_WIDTH * CELL_SIZE, G_HEIGHT * CELL_SIZE), (0, 0, 0, 0))

for x in range(0, G_WIDTH * CELL_SIZE, CELL_SIZE):
    for y in range((G_HEIGHT-1) * CELL_SIZE):
        im.putpixel((x, y), LINE_COLOR if x!=256*4 else (255, 255, 255, 255))
for y in range(0, G_HEIGHT * CELL_SIZE, CELL_SIZE):
    for x in range(0, (G_WIDTH-1) * CELL_SIZE):
        im.putpixel((x, y), LINE_COLOR if y!=192*4 else (255, 255, 255, 255))

im.save("out.png", "PNG")