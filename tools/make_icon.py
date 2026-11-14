"""Render the 1024x1024 opaque app icon (isometric 3x3 cube on a dark gradient).

Usage: python3 tools/make_icon.py CubeTutor/Assets.xcassets/AppIcon.appiconset/icon-1024.png
"""
import math
import sys

from PIL import Image, ImageDraw, ImageFilter

SIZE = 1024
SS = 4  # supersampling factor
W = SIZE * SS

TOP = (255, 255, 255)
LEFT = (0, 155, 72)
RIGHT = (210, 30, 45)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c)


def background():
    img = Image.new("RGB", (W, W))
    px = img.load()
    c0, c1 = (28, 32, 52), (6, 7, 12)
    cx, cy = W * 0.5, W * 0.38
    maxd = math.hypot(W, W) * 0.62
    for y in range(0, W, SS):
        for x in range(0, W, SS):
            t = min(1.0, math.hypot(x - cx, y - cy) / maxd)
            col = lerp(c0, c1, t ** 0.9)
            for dy in range(SS):
                for dx in range(SS):
                    px[x + dx, y + dy] = col
    return img


def draw_cube(img):
    d = ImageDraw.Draw(img)
    cx, cy = W * 0.5, W * 0.5
    s = W * 0.19  # half-edge length in screen space
    c30 = math.cos(math.radians(30))
    ex = (c30 * s, 0.5 * s)   # +x axis (right-down)
    ez = (-c30 * s, 0.5 * s)  # +z axis (left-down)
    ey = (0, -s)              # +y axis (up)
    origin = (cx, cy - s * 0.05)

    def P(x, y, z):
        return (origin[0] + ex[0] * x + ez[0] * z + ey[0] * y,
                origin[1] + ex[1] * x + ez[1] * z + ey[1] * y)

    # soft shadow
    shadow = Image.new("L", (W, W), 0)
    sd = ImageDraw.Draw(shadow)
    sw, sh = s * 2.1, s * 0.55
    sy = cy + s * 1.45
    sd.ellipse([cx - sw, sy - sh, cx + sw, sy + sh], fill=150)
    shadow = shadow.filter(ImageFilter.GaussianBlur(W * 0.03))
    img.paste((0, 0, 0), mask=shadow)

    gap = 0.06

    def sticker(corner, u, v, color, k):
        a0, a1 = gap, 1 - gap
        quad = [(a0, a0), (a1, a0), (a1, a1), (a0, a1)]
        poly = [P(*(corner[i] + u[i] * a + v[i] * b for i in range(3))) for a, b in quad]
        d.polygon(poly, fill=shade(color, k))

    # plastic body
    body = (14, 14, 18)
    d.polygon([P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1)], fill=body)
    d.polygon([P(-1, 1, 1), P(1, 1, 1), P(1, -1, 1), P(-1, -1, 1)], fill=body)
    d.polygon([P(1, 1, -1), P(1, 1, 1), P(1, -1, 1), P(1, -1, -1)], fill=body)

    st = 2 / 3
    for i in range(3):
        for j in range(3):
            # top face y=+1, spans x,z
            sticker((-1 + i * st, 1, -1 + j * st), (st, 0, 0), (0, 0, st), TOP, 0.98 - 0.02 * (i + j))
            # left face z=+1, spans x,y
            sticker((-1 + i * st, 1 - j * st, 1), (st, 0, 0), (0, -st, 0), LEFT, 0.80 - 0.03 * j)
            # right face x=+1, spans z,y
            sticker((1, 1 - j * st, 1 - i * st), (0, 0, -st), (0, -st, 0), RIGHT, 0.66 - 0.03 * j)


def main(out):
    img = background()
    draw_cube(img)
    img = img.resize((SIZE, SIZE), Image.LANCZOS)
    img.save(out, "PNG")


if __name__ == "__main__":
    main(sys.argv[1])
