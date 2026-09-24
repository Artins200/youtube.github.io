#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Генератор проекта MIT App Inventor (.aia) — игра "СПРАЙТ-РАШ" (SpriteRush).

Суть игры
---------
* На экране только Canvas и спрайты (никаких кнопок/лейблов).
* Стартовая картинка-спрайт запускает игру.
* После старта на холсте появляется множество одинаковых спрайтов (target.png).
* У каждого появившегося спрайта своё время жизни (5 секунд на 1 уровне).
  Если за это время по нему не нажали — игра окончена, таймер останавливается.
* Если нажали — спрайт исчезает на 3 секунды, потом появляется в новом месте.
* Игра бесконечная: чем дольше играете, тем выше уровень:
  больше одновременных целей, меньше времени на нажатие, спрайты начинают двигаться.

Запуск:
    python3 tools/build_aia.py            # собрать в каталог project/ + SpriteRush.aia
    python3 tools/build_aia.py --check    # собрать и напечатать отчёт самопроверки
"""

import json
import math
import os
import random
import struct
import sys
import zipfile
import zlib

# ---------------------------------------------------------------------------
# НАСТРОЙКИ ИГРЫ (правь здесь и перезапускай скрипт)
# ---------------------------------------------------------------------------

PROJECT = "SpriteRush"          # имя проекта в App Inventor (латиница, без пробелов)
APP_TITLE = "Спрайт-Раш"        # заголовок приложения
USER_DIR = "ai_spriterush"      # каталог "пользователя" внутри src (не важен, AI2 всё равно перепишет)

POOL = 24                       # сколько всего спрайтов лежит на холсте (пул)
START_ACTIVE = 3                # сколько целей одновременно на 1 уровне
LEVEL_UP_MS = 8000              # новый уровень каждые 8 секунд
ACTIVE_PER_LEVEL = 1            # +1 цель за уровень
BASE_LIFE_MS = 5000             # 5 секунд на нажатие (1 уровень)
LIFE_STEP_MS = 250              # столько мс убирается из жизни цели за каждый уровень
MIN_LIFE_MS = 1500              # меньше этого времени на цель не даём
RESPAWN_MS = 3000               # спрайт пропадает на 3 секунды после нажатия
SPEED_STEP = 0.8                # прирост скорости спрайтов за уровень
MAX_SPEED = 10                  # предел скорости
SPRITE_PX = 64                  # размер спрайта (пиксели)
START_PX = 180                  # размер стартовой кнопки-спрайта
HUD_TOP_PX = 64                 # сколько пикселей сверху отдано под текст (туда спрайты не спавнятся)
TICK_MS = 100                   # период таймера

ASSET_TARGET = "target.png"     # картинка цели (заменишь на свою)
ASSET_START = "start.png"       # картинка стартовой кнопки
ASSET_BACK = "back.png"         # фон холста

SPRITES = ["Sprite%d" % i for i in range(1, POOL + 1)]
START_SPRITE = "SpriteStart"

# имя компонента -> тип компонента (нужно для блоков)
CTYPE = {"Screen1": "Form", "Canvas1": "Canvas", "Clock1": "Clock", "TinyDB1": "TinyDB"}
CTYPE[START_SPRITE] = "ImageSprite"
for _s in SPRITES:
    CTYPE[_s] = "ImageSprite"

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "project")
AIA = os.path.join(ROOT, PROJECT + ".aia")

# ---------------------------------------------------------------------------
# МИНИ-Writer PNG (в чистом Python, без внешних библиотек)
# ---------------------------------------------------------------------------


def _chunk(tag, data):
    return (struct.pack(">I", len(data)) + tag + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))


def write_png(path, w, h, pixfn, alpha=True):
    """pixfn(x, y) -> (r, g, b) или (r, g, b, a)"""
    color_type = 6 if alpha else 2
    raw = bytearray()
    for y in range(h):
        raw.append(0)  # filter type 0
        for x in range(w):
            px = pixfn(x, y)
            raw += bytes(px)
    png = b"\x89PNG\r\n\x1a\n"
    png += _chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, color_type, 0, 0, 0))
    png += _chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += _chunk(b"IEND", b"")
    with open(path, "wb") as fh:
        fh.write(png)
    return png


def make_target(path, size=128):
    """Мишень: концентрические кольца на прозрачном фоне."""
    c = (size - 1) / 2.0
    red = (239, 83, 80)
    dark = (183, 28, 28)
    white = (255, 255, 255)

    def px(x, y):
        d = math.hypot(x - c, y - c) / c
        a = max(0.0, min(1.0, (1.0 - d) * size / 2.0))
        if d > 1.0:
            return (0, 0, 0, 0)
        if d > 0.86:
            col = dark
        elif d > 0.66:
            col = white
        elif d > 0.44:
            col = red
        elif d > 0.22:
            col = white
        else:
            col = red
        # лёгкая тень по краю
        if d > 0.94:
            col = tuple(int(v * 0.75) for v in col)
        return (col[0], col[1], col[2], int(255 * a))

    write_png(path, size, size, px)


def make_start(path, size=256):
    """Зелёная круглая кнопка с белым треугольником 'play'."""
    c = (size - 1) / 2.0
    green = (67, 160, 71)
    dark = (27, 94, 32)

    def px(x, y):
        d = math.hypot(x - c, y - c) / c
        a = max(0.0, min(1.0, (1.0 - d) * size / 2.0))
        if d > 1.0:
            return (0, 0, 0, 0)
        col = dark if d > 0.9 else green
        # треугольник play
        tx = (x - c) / c
        ty = (y - c) / c
        if -0.30 <= tx <= 0.42 and abs(ty) <= 0.42:
            # левая граница наклонная
            half = 0.42 * (1.0 - (tx + 0.30) / 0.72)
            if abs(ty) <= half:
                col = (255, 255, 255)
        return (col[0], col[1], col[2], int(255 * a))

    write_png(path, size, size, px)


def make_back(path, w=480, h=800):
    """Тёмный градиентный фон."""
    top = (16, 26, 56)
    bot = (4, 6, 14)

    def px(x, y):
        t = y / float(h - 1)
        r = int(top[0] + (bot[0] - top[0]) * t)
        g = int(top[1] + (bot[1] - top[1]) * t)
        b = int(top[2] + (bot[2] - top[2]) * t)
        # мягкое светлое пятно сверху по центру
        d = math.hypot((x - w / 2.0) / (w / 2.0), (y - h * 0.18) / (h * 0.30))
        glow = max(0.0, 1.0 - d) ** 2 * 26
        r = min(255, int(r + glow))
        g = min(255, int(g + glow * 1.1))
        b = min(255, int(b + glow * 1.4))
        return (r, g, b)

    write_png(path, w, h, px, alpha=False)


# ---------------------------------------------------------------------------
# ПОСТРОЕНИЕ БЛОКОВ (Blockly XML, формат App Inventor)
# ---------------------------------------------------------------------------

_IDS = set()
_RNG = random.Random(20240924)
_ID_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"


def nid():
    while True:
        s = "".join(_RNG.choice(_ID_CHARS) for _ in range(20))
        if s not in _IDS:
            _IDS.add(s)
            return s


def esc(v):
    return (str(v).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;"))


class Blk(object):
    """Один блок Blockly."""

    def __init__(self, btype, mut=None, mutxml=None, x=None, y=None):
        self.type = btype
        self.mut = mut
        self.mutxml = mutxml
        self.fields = []
        self.values = []
        self.statements = []
        self.nxt = None
        self.x = x
        self.y = y

    def f(self, name, val):
        self.fields.append((name, val))
        return self

    def v(self, name, blk):
        self.values.append((name, blk))
        return self

    def s(self, name, blk):
        self.statements.append((name, blk))
        return self

    def nx(self, blk):
        self.nxt = blk
        return self

    def xml(self):
        a = ' type="%s" id="%s"' % (self.type, nid())
        if self.x is not None:
            a += ' x="%d" y="%d"' % (self.x, self.y)
        out = ["<block" + a + ">"]
        if self.mutxml is not None:
            out.append(self.mutxml)
        elif self.mut:
            out.append("<mutation " + " ".join(
                '%s="%s"' % (k, esc(v)) for k, v in self.mut.items()) + "/>")
        for name, val in self.fields:
            out.append('<field name="%s">%s</field>' % (name, esc(val)))
        for name, blk in self.values:
            out.append('<value name="%s">%s</value>' % (name, blk.xml()))
        for name, blk in self.statements:
            out.append('<statement name="%s">%s</statement>' % (name, blk.xml()))
        if self.nxt is not None:
            out.append("<next>" + self.nxt.xml() + "</next>")
        out.append("</block>")
        return "".join(out)


def chain(blocks):
    """Соединяет блоки последовательно (через <next>)."""
    bs = [b for b in blocks if b is not None]
    for a, b in zip(bs, bs[1:]):
        a.nx(b)
    return bs[0] if bs else None


# --- примитивы -------------------------------------------------------------

def num(v):
    return Blk("math_number").f("NUM", v)


def txt(v):
    return Blk("text").f("TEXT", v)


def boole(v):
    return Blk("logic_boolean").f("BOOL", "TRUE" if v else "FALSE")


def g(name):
    """чтение глобальной переменной"""
    return Blk("lexical_variable_get").f("VAR", "global " + name)


def gset(name, val):
    """присваивание глобальной переменной"""
    return Blk("lexical_variable_set").f("VAR", "global " + name).v("VALUE", val)


def lget(name):
    """чтение локальной переменной (аргумент процедуры / счётчик цикла)"""
    return Blk("lexical_variable_get").f("VAR", name)


def add(a, b):
    return Blk("math_add", mut={"items": 2}).v("NUM0", a).v("NUM1", b)


def sub(a, b):
    return Blk("math_subtract").v("A", a).v("B", b)


def mul(a, b):
    return Blk("math_multiply", mut={"items": 2}).v("NUM0", a).v("NUM1", b)


def div(a, b):
    return Blk("math_division").v("A", a).v("B", b)


def rnd(lo, hi):
    return Blk("math_random_int").v("FROM", lo).v("TO", hi)


def eq(a, b):
    """Блок '=' из раздела Logic — только для логических (true/false) значений."""
    return Blk("logic_compare").f("OP", "EQ").v("A", a).v("B", b)


def _ncmp(op, a, b):
    """Блоки сравнения чисел из раздела Math (=, <, >, <=, >=)."""
    return Blk("math_compare").f("OP", op).v("A", a).v("B", b)


def numeq(a, b):
    return _ncmp("EQ", a, b)


def lt(a, b):
    return _ncmp("LT", a, b)


def gt(a, b):
    return _ncmp("GT", a, b)


def ge(a, b):
    return _ncmp("GTE", a, b)


def andb(a, b):
    return Blk("logic_operation").f("OP", "AND").v("A", a).v("B", b)


def ifdo(cond, *body):
    return Blk("controls_if").v("IF0", cond).s("DO0", chain(body))


def ifelse(cond, body_do, body_else):
    return (Blk("controls_if", mut={"else": 1})
            .v("IF0", cond).s("DO0", chain(body_do)).s("ELSE", chain(body_else)))


def emptylist():
    return Blk("lists_create_with", mut={"items": 0})


def item(listblk, idx):
    return Blk("lists_select_item").v("LIST", listblk).v("NUM", idx)


def replace(listblk, idx, val):
    return Blk("lists_replace_item").v("LIST", listblk).v("NUM", idx).v("ITEM", val)


def additem(listblk, val):
    return Blk("lists_add_items", mut={"items": 1}).v("LIST", listblk).v("ITEM0", val)


def join(*parts):
    b = Blk("text_join", mut={"items": len(parts)})
    for i, p in enumerate(parts):
        b.v("ADD%d" % i, p)
    return b


def forrange(var, start, end, step, *body):
    return (Blk("controls_forRange").f("VAR", var)
            .v("START", start).v("END", end).v("STEP", step)
            .s("DO", chain(body)))


def procdef(name, args, body, x, y):
    mx = "<mutation>" + "".join('<arg name="%s"></arg>' % esc(a) for a in args) + "</mutation>"
    b = Blk("procedures_defnoreturn", mutxml=mx, x=x, y=y).f("NAME", name)
    for i, a in enumerate(args):
        b.f("VAR%d" % i, a)
    return b.s("STACK", chain(body))


def procall(name, args=(), argblocks=()):
    mx = '<mutation name="%s">%s</mutation>' % (
        esc(name), "".join('<arg name="%s"></arg>' % esc(a) for a in args))
    b = Blk("procedures_callnoreturn", mutxml=mx).f("PROCNAME", name)
    for i, ab in enumerate(argblocks):
        b.v("ARG%d" % i, ab)
    return b


# --- компоненты ------------------------------------------------------------

def cget(comp, prop):
    t = CTYPE[comp]
    return (Blk("component_set_get", mut={"component_type": t, "set_or_get": "get",
                                          "property_name": prop, "is_generic": "false",
                                          "instance_name": comp})
            .f("COMPONENT_SELECTOR", comp).f("PROP", prop))


def cset(comp, prop, val):
    t = CTYPE[comp]
    return (Blk("component_set_get", mut={"component_type": t, "set_or_get": "set",
                                          "property_name": prop, "is_generic": "false",
                                          "instance_name": comp})
            .f("COMPONENT_SELECTOR", comp).f("PROP", prop).v("VALUE", val))


def cmethod(comp, method, *args):
    t = CTYPE[comp]
    b = (Blk("component_method", mut={"component_type": t, "method_name": method,
                                      "is_generic": "false", "instance_name": comp})
         .f("COMPONENT_SELECTOR", comp))
    for i, a in enumerate(args):
        b.v("ARG%d" % i, a)
    return b


def event(comp, ev, x, y, *body):
    t = CTYPE[comp]
    return (Blk("component_event", x=x, y=y,
                mut={"component_type": t, "is_generic": "false",
                     "instance_name": comp, "event_name": ev})
            .f("COMPONENT_SELECTOR", comp).s("DO", chain(body)))


def W():
    return cget("Canvas1", "Width")


def H():
    return cget("Canvas1", "Height")


def CX():
    return div(W(), num(2))


# ---------------------------------------------------------------------------
# ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
# ---------------------------------------------------------------------------

GLOBALS = [
    ("playing", boole(False)),     # идёт игра?
    ("over", boole(False)),        # был game over (для текста на холсте)
    ("score", num(0)),             # очки
    ("best", num(0)),              # рекорд
    ("gameTime", num(0)),          # миллисекунды с начала игры
    ("secCounter", num(0)),        # целых секунд прошло
    ("tickInSec", num(0)),         # счётчик тиков внутри секунды
    ("level", num(1)),             # уровень сложности
    ("levelUpAt", num(LEVEL_UP_MS)),  # когда следующий уровень
    ("lifeTime", num(BASE_LIFE_MS)),  # сколько мс живёт цель
    ("respawnDelay", num(RESPAWN_MS)),  # пауза после нажатия
    ("maxActive", num(START_ACTIVE)),   # сколько целей одновременно
    ("speed", num(0)),             # скорость спрайтов
    ("active", num(0)),            # сколько целей сейчас на экране
    ("poolSize", num(POOL)),       # размер пула спрайтов
    ("visibleList", emptylist()),  # виден ли спрайт i
    ("bornList", emptylist()),     # когда появился спрайт i
    ("respawnList", emptylist()),  # когда спрайту i можно появиться снова
]

PROCS = {}   # имя -> список аргументов (заполняется при сборке)


def build_globals():
    out = []
    x = 30
    y = 30
    for name, val in GLOBALS:
        out.append(Blk("global_declaration", x=x, y=y).f("NAME", name).v("VALUE", val))
        y += 62
    return out


# ---------------------------------------------------------------------------
# ПРОЦЕДУРЫ
# ---------------------------------------------------------------------------

def proc_init_lists(x, y):
    PROCS["InitLists"] = []
    body = []
    for gl in ("visibleList", "bornList", "respawnList"):
        zero = boole(False) if gl == "visibleList" else num(0)
        body.append(gset(gl, emptylist()))
        body.append(forrange("i", num(1), g("poolSize"), num(1), additem(g(gl), zero)))
    return procdef("InitLists", [], body, x, y)


def proc_hide_all(x, y):
    PROCS["HideAll"] = []
    body = [cset(s, "Visible", boole(False)) for s in SPRITES]
    return procdef("HideAll", [], body, x, y)


def proc_set_all_speed(x, y):
    PROCS["SetAllSpeed"] = []
    body = [cset(s, "Speed", g("speed")) for s in SPRITES]
    return procdef("SetAllSpeed", [], body, x, y)


def proc_spawn(x, y):
    """Показать спрайт с номером index в случайном месте."""
    PROCS["Spawn"] = ["index"]
    body = []
    for k, s in enumerate(SPRITES, start=1):
        branch = [
            cmethod(s, "MoveTo",
                    rnd(num(0), sub(W(), cget(s, "Width"))),
                    rnd(num(HUD_TOP_PX), sub(H(), cget(s, "Height")))),
            cset(s, "Heading", rnd(num(0), num(359))),
            cset(s, "Speed", g("speed")),
            cset(s, "Visible", boole(True)),
        ]
        body.append(ifdo(numeq(lget("index"), num(k)), *branch))
    return procdef("Spawn", ["index"], body, x, y)


def proc_update_difficulty(x, y):
    PROCS["UpdateDifficulty"] = []
    body = [
        ifdo(ge(g("gameTime"), g("levelUpAt")),
             gset("level", add(g("level"), num(1))),
             gset("levelUpAt", add(g("levelUpAt"), num(LEVEL_UP_MS))),
             # целей одновременно = START_ACTIVE + (уровень - 1) * ACTIVE_PER_LEVEL
             gset("maxActive", add(num(START_ACTIVE),
                                   mul(sub(g("level"), num(1)), num(ACTIVE_PER_LEVEL)))),
             ifdo(gt(g("maxActive"), g("poolSize")), gset("maxActive", g("poolSize"))),
             gset("lifeTime", sub(num(BASE_LIFE_MS),
                                  mul(sub(g("level"), num(1)), num(LIFE_STEP_MS)))),
             ifdo(lt(g("lifeTime"), num(MIN_LIFE_MS)), gset("lifeTime", num(MIN_LIFE_MS))),
             gset("speed", mul(sub(g("level"), num(1)), num(SPEED_STEP))),
             ifdo(gt(g("speed"), num(MAX_SPEED)), gset("speed", num(MAX_SPEED))),
             procall("SetAllSpeed")),
    ]
    return procdef("UpdateDifficulty", [], body, x, y)


def proc_game_over(x, y):
    PROCS["GameOver"] = []
    body = [
        gset("playing", boole(False)),
        cset("Clock1", "TimerEnabled", boole(False)),
        procall("HideAll"),
        cset(START_SPRITE, "Visible", boole(True)),
        gset("over", boole(True)),
        ifdo(gt(g("score"), g("best")),
             gset("best", g("score")),
             cmethod("TinyDB1", "StoreValue", txt("best"), g("best"))),
        procall("DrawHUD"),
    ]
    return procdef("GameOver", [], body, x, y)


def proc_start_game(x, y):
    PROCS["StartGame"] = []
    body = [
        gset("score", num(0)),
        gset("gameTime", num(0)),
        gset("secCounter", num(0)),
        gset("tickInSec", num(0)),
        gset("level", num(1)),
        gset("levelUpAt", num(LEVEL_UP_MS)),
        gset("lifeTime", num(BASE_LIFE_MS)),
        gset("maxActive", num(START_ACTIVE)),
        gset("speed", num(0)),
        gset("active", num(0)),
        gset("over", boole(False)),
        forrange("i", num(1), g("poolSize"), num(1),
                 replace(g("visibleList"), lget("i"), boole(False)),
                 replace(g("bornList"), lget("i"), num(0)),
                 replace(g("respawnList"), lget("i"), num(0))),
        procall("HideAll"),
        cset(START_SPRITE, "Visible", boole(False)),
        gset("playing", boole(True)),
        cset("Clock1", "TimerEnabled", boole(True)),
        procall("DrawHUD"),
    ]
    return procdef("StartGame", [], body, x, y)


def proc_draw_hud(x, y):
    """Рисует весь интерфейс прямо на холсте."""
    PROCS["DrawHUD"] = []

    def fs(v):
        return cset("Canvas1", "FontSize", num(v))

    def draw(textblk, yblk):
        return cmethod("Canvas1", "DrawText", textblk, CX(), yblk)

    playing_hud = [
        fs(18),
        draw(join(txt("ОЧКИ: "), g("score"), txt("   УРОВЕНЬ: "), g("level")), num(26)),
        draw(join(txt("ВРЕМЯ: "), g("secCounter"), txt(" с   ЦЕЛИ: "), g("active"),
                  txt("/"), g("maxActive")), num(52)),
    ]

    over_hud = [
        fs(26),
        draw(txt("ИГРА ОКОНЧЕНА"), sub(div(H(), num(2)), num(110))),
        fs(20),
        draw(join(txt("ОЧКИ: "), g("score")), sub(div(H(), num(2)), num(70))),
        draw(join(txt("РЕКОРД: "), g("best")), sub(div(H(), num(2)), num(40))),
    ]

    start_hud = [
        fs(26),
        draw(txt("СПРАЙТ-РАШ"), sub(div(H(), num(2)), num(110))),
        fs(18),
        draw(join(txt("РЕКОРД: "), g("best")), sub(div(H(), num(2)), num(75))),
        draw(txt("ЖМИТЕ ПО ЦЕЛЯМ"), sub(div(H(), num(2)), num(48))),
    ]

    start_btn_y = add(div(H(), num(2)), num(10))
    btn_h = cget(START_SPRITE, "Height")

    idle_hud = [
        ifelse(g("over"), over_hud, start_hud),
        cmethod(START_SPRITE, "MoveTo",
                sub(CX(), div(cget(START_SPRITE, "Width"), num(2))), start_btn_y),
        fs(18),
        draw(txt("НАЖМИТЕ КНОПКУ"), add(add(start_btn_y, btn_h), num(34))),
    ]

    body = [
        cmethod("Canvas1", "Clear"),
        cset("Canvas1", "TextAlignment", num(1)),
        ifelse(g("playing"), playing_hud, idle_hud),
    ]
    return procdef("DrawHUD", [], body, x, y)


# ---------------------------------------------------------------------------
# СОБЫТИЯ
# ---------------------------------------------------------------------------

def ev_initialize(x, y):
    return event("Screen1", "Initialize", x, y,
                 procall("InitLists"),
                 gset("best", cmethod("TinyDB1", "GetValue", txt("best"), num(0))),
                 procall("HideAll"),
                 procall("DrawHUD"))


def ev_timer(x, y):
    return event("Clock1", "Timer", x, y,
                 ifdo(g("playing"),
                      gset("gameTime", add(g("gameTime"), cget("Clock1", "TimerInterval"))),
                      gset("tickInSec", add(g("tickInSec"), num(1))),
                      ifdo(ge(g("tickInSec"), num(10)),
                           gset("tickInSec", num(0)),
                           gset("secCounter", add(g("secCounter"), num(1)))),
                      procall("UpdateDifficulty"),
                      gset("active", num(0)),
                      forrange("i", num(1), g("poolSize"), num(1),
                               ifdo(eq(item(g("visibleList"), lget("i")), boole(True)),
                                    gset("active", add(g("active"), num(1))))),
                      forrange("i", num(1), g("poolSize"), num(1),
                               ifdo(g("playing"),
                                    ifelse(eq(item(g("visibleList"), lget("i")), boole(True)),
                                           # цель видна — проверяем, не истекло ли время
                                           [ifdo(gt(sub(g("gameTime"),
                                                       item(g("bornList"), lget("i"))),
                                                    g("lifeTime")),
                                                 procall("GameOver"))],
                                           # цель скрыта — пора ли появиться снова
                                           [ifdo(andb(ge(g("gameTime"),
                                                         item(g("respawnList"), lget("i"))),
                                                      lt(g("active"), g("maxActive"))),
                                                 procall("Spawn", ["index"], [lget("i")]),
                                                 replace(g("visibleList"), lget("i"),
                                                         boole(True)),
                                                 replace(g("bornList"), lget("i"),
                                                         g("gameTime")),
                                                 gset("active", add(g("active"),
                                                                    num(1))))])))),
                 procall("DrawHUD"))


def ev_start_touched(x, y):
    return event(START_SPRITE, "Touched", x, y,
                 ifdo(eq(g("playing"), boole(False)), procall("StartGame")))


def ev_sprite_touched(s, k, x, y):
    """Нажатие по спрайту: прячем его, через 3 секунды он появится снова."""
    return event(s, "Touched", x, y,
                 ifdo(g("playing"),
                      ifdo(eq(item(g("visibleList"), num(k)), boole(True)),
                           cset(s, "Visible", boole(False)),
                           replace(g("visibleList"), num(k), boole(False)),
                           replace(g("respawnList"), num(k),
                                   add(g("gameTime"), g("respawnDelay"))),
                           gset("score", add(g("score"), num(1))))))


# ---------------------------------------------------------------------------
# СБОРКА .BKY
# ---------------------------------------------------------------------------

def build_bky():
    blocks = []
    blocks.extend(build_globals())

    # процедуры — второй столбец (высоты подобраны, чтобы блоки не налезали друг на друга)
    px, py = 330, 30
    procs = [(proc_init_lists, 330), (proc_hide_all, 700), (proc_set_all_speed, 700),
             (proc_spawn, 2600), (proc_update_difficulty, 480), (proc_draw_hud, 800),
             (proc_game_over, 420), (proc_start_game, 800)]
    for fn, h in procs:
        blocks.append(fn(px, py))
        py += h

    # события — третий столбец
    ex = 900
    ey = 30
    blocks.append(ev_initialize(ex, ey))
    ey += 260
    blocks.append(ev_timer(ex, ey))
    ey += 1600
    blocks.append(ev_start_touched(ex, ey))
    ey += 220
    for k, s in enumerate(SPRITES, start=1):
        blocks.append(ev_sprite_touched(s, k, ex, ey))
        ey += 260

    xml = ['<xml xmlns="https://developers.google.com/blockly/xml">']
    for b in blocks:
        xml.append(b.xml())
    xml.append("</xml>")
    return "".join(xml)


# ---------------------------------------------------------------------------
# СБОРКА .SCM (дизайнер: компоненты и их свойства)
# ---------------------------------------------------------------------------

def _uuid():
    return str(random.randint(-2000000000, 2000000000))


def build_scm():
    sprites = []
    for s in SPRITES:
        sprites.append({
            "$Name": s,
            "$Type": "ImageSprite",
            "$Version": "10",
            "Picture": ASSET_TARGET,
            "Width": str(SPRITE_PX),
            "Height": str(SPRITE_PX),
            "Speed": "0.0",
            "Heading": "0.0",
            "Rotates": "False",
            "Visible": "False",
            "X": "0.0",
            "Y": "0.0",
            "Uuid": _uuid(),
        })

    canvas = {
        "$Name": "Canvas1",
        "$Type": "Canvas",
        "$Version": "15",
        "BackgroundImage": ASSET_BACK,
        "BackgroundColor": "&HFF000000",
        "PaintColor": "&HFFFFFFFF",
        "FontSize": "18.0",
        "LineWidth": "2.0",
        "TextAlignment": "1",
        "ExtendMovesBeyondCanvas": "False",
        "Height": "-2",     # -2 = Fill parent
        "Width": "-2",
        "Uuid": _uuid(),
        "$Components": sprites + [{
            "$Name": START_SPRITE,
            "$Type": "ImageSprite",
            "$Version": "10",
            "Picture": ASSET_START,
            "Width": str(START_PX),
            "Height": str(START_PX),
            "Speed": "0.0",
            "Heading": "0.0",
            "Rotates": "False",
            "Visible": "True",
            "X": "0.0",
            "Y": "0.0",
            "Z": "10.0",
            "Uuid": _uuid(),
        }],
    }

    props = {
        "$Name": "Screen1",
        "$Type": "Form",
        "$Version": "31",
        "ActionBar": "False",
        "AlignHorizontal": "3",
        "AlignVertical": "2",
        "AppName": PROJECT,
        "BackgroundColor": "&HFF000000",
        "ScreenOrientation": "portrait",
        "Scrollable": "False",
        "Sizing": "Fixed",
        "Theme": "Classic",
        "Title": APP_TITLE,
        "TitleVisible": "False",
        "Uuid": "0",
        "VersionCode": "1",
        "VersionName": "1.0",
        "$Components": [
            canvas,
            {"$Name": "Clock1", "$Type": "Clock", "$Version": "4",
             "TimerEnabled": "True", "TimerInterval": str(TICK_MS), "Uuid": _uuid()},
            {"$Name": "TinyDB1", "$Type": "TinyDB", "$Version": "3", "Uuid": _uuid()},
        ],
    }

    doc = {
        "authURL": ["ai2.appinventor.mit.edu"],
        "YaVersion": "233",
        "Source": "Form",
        "Properties": props,
    }
    return "#|\n$JSON\n" + json.dumps(doc, ensure_ascii=False,
                                      separators=(",", ":")) + "\n|#\n"


# ---------------------------------------------------------------------------
# project.properties
# ---------------------------------------------------------------------------

def build_properties():
    return (
        "#\n"
        "#Wed Sep 24 12:00:00 UTC 2025\n"
        "sizing=Fixed\n"
        "color.primary.dark=&HFF303F9F\n"
        "color.primary=&HFF3F51B5\n"
        "color.accent=&HFFFF4081\n"
        "aname=%(p)s\n"
        "defaultfilescope=App\n"
        "main=appinventor.ai_user.%(p)s.Screen1\n"
        "source=../src\n"
        "actionbar=False\n"
        "useslocation=False\n"
        "assets=../assets\n"
        "build=../build\n"
        "name=%(p)s\n"
        "showlistsasjson=True\n"
        "theme=Classic\n"
        "versioncode=1\n"
        "versionname=1.0\n" % {"p": PROJECT}
    )


# ---------------------------------------------------------------------------
# СБОРКА .AIA
# ---------------------------------------------------------------------------

def build_all():
    assets = os.path.join(OUT, "assets")
    src_dir = os.path.join(OUT, "src", "appinventor", USER_DIR, PROJECT)
    ya_dir = os.path.join(OUT, "youngandroidproject")
    for d in (assets, src_dir, ya_dir):
        if not os.path.isdir(d):
            os.makedirs(d)

    make_target(os.path.join(assets, ASSET_TARGET))
    make_start(os.path.join(assets, ASSET_START))
    make_back(os.path.join(assets, ASSET_BACK))

    bky = build_bky()
    scm = build_scm()
    with open(os.path.join(src_dir, "Screen1.bky"), "w", encoding="utf-8") as fh:
        fh.write(bky)
    with open(os.path.join(src_dir, "Screen1.scm"), "w", encoding="utf-8") as fh:
        fh.write(scm)
    with open(os.path.join(ya_dir, "project.properties"), "w", encoding="utf-8") as fh:
        fh.write(build_properties())

    entries = [
        ("youngandroidproject/project.properties",
         os.path.join(OUT, "youngandroidproject", "project.properties")),
        ("src/appinventor/%s/%s/Screen1.bky" % (USER_DIR, PROJECT),
         os.path.join(src_dir, "Screen1.bky")),
        ("src/appinventor/%s/%s/Screen1.scm" % (USER_DIR, PROJECT),
         os.path.join(src_dir, "Screen1.scm")),
        ("assets/" + ASSET_TARGET, os.path.join(assets, ASSET_TARGET)),
        ("assets/" + ASSET_START, os.path.join(assets, ASSET_START)),
        ("assets/" + ASSET_BACK, os.path.join(assets, ASSET_BACK)),
    ]
    with zipfile.ZipFile(AIA, "w", zipfile.ZIP_DEFLATED) as z:
        for arc, path in entries:
            z.write(path, arc)
    return bky, scm


# ---------------------------------------------------------------------------
# САМОПРОВЕРКА
# ---------------------------------------------------------------------------

def check(bky, scm):
    import xml.etree.ElementTree as ET
    problems = []

    root = ET.fromstring(bky)
    for el in root.iter():
        if isinstance(el.tag, str) and "}" in el.tag:
            el.tag = el.tag.split("}", 1)[1]

    blocks = list(root.iter("block"))
    ids = [b.get("id") for b in blocks]
    if len(set(ids)) != len(ids):
        problems.append("duplicate block ids")

    types = {}
    for b in blocks:
        types[b.get("type")] = types.get(b.get("type"), 0) + 1

    globals_declared = set(n for n, _ in GLOBALS)
    locals_allowed = {"i", "index"}
    for b in blocks:
        t = b.get("type")
        if t == "global_declaration":
            globals_declared.add(b.find("field[@name='NAME']").text)
        elif t == "lexical_variable_get":
            v = b.find("field[@name='VAR']").text
            if v.startswith("global "):
                if v[len("global "):] not in globals_declared:
                    problems.append("unknown global: %s" % v)
            elif v not in locals_allowed:
                problems.append("unknown local: %s" % v)
        elif t == "lexical_variable_set":
            v = b.find("field[@name='VAR']").text
            if not v.startswith("global ") or v[len("global "):] not in globals_declared:
                problems.append("set unknown var: %s" % v)
        elif t in ("component_set_get", "component_method", "component_event"):
            inst = b.find("mutation").get("instance_name")
            if inst not in CTYPE:
                problems.append("unknown component: %s" % inst)
        elif t == "procedures_callnoreturn":
            name = b.find("field[@name='PROCNAME']").text
            nargs = len(b.find("mutation").findall("arg"))
            if name not in PROCS:
                problems.append("call to unknown procedure: %s" % name)
            elif len(PROCS[name]) != nargs:
                problems.append("wrong arg count for %s" % name)

    for name in ("InitLists", "HideAll", "SetAllSpeed", "Spawn", "UpdateDifficulty",
                 "DrawHUD", "GameOver", "StartGame"):
        if name not in PROCS:
            problems.append("missing procedure %s" % name)

    # scm: валидный JSON + все картинки есть
    payload = scm[scm.index("$JSON\n") + 6: scm.rindex("\n|#")]
    doc = json.loads(payload)

    def walk(comps):
        for c in comps:
            yield c
            for cc in walk(c.get("$Components", [])):
                yield cc

    used_assets = set()
    for c in walk(doc["Properties"].get("$Components", [])):
        for key in ("Picture", "BackgroundImage", "BackgroundImageinBase64"):
            if key in c and c[key]:
                used_assets.add(c[key])
    for a in used_assets:
        if not os.path.isfile(os.path.join(OUT, "assets", a)):
            problems.append("missing asset %s" % a)

    print("Блоков всего: %d" % len(blocks))
    print("Типов блоков: %d" % len(types))
    print("Компонентов в дизайнере: %d" % len(list(walk(doc["Properties"]["$Components"]))))
    print("Спрайтов в пуле: %d (+1 стартовый)" % POOL)
    print("Ассеты: %s" % ", ".join(sorted(used_assets)))
    print("ТОП блоков: %s" % sorted(types.items(), key=lambda kv: -kv[1])[:8])
    if problems:
        print("\n!!! ПРОБЛЕМЫ:")
        for p in sorted(set(problems)):
            print("  -", p)
        return 1
    print("\nПроверки пройдены ✅")
    return 0


def main():
    bky, scm = build_all()
    print("Собрано:")
    print("  %s" % os.path.relpath(AIA, ROOT))
    print("  %s (распакованный проект)" % os.path.relpath(OUT, ROOT))
    print()
    if "--check" in sys.argv:
        return check(bky, scm)
    return 0


if __name__ == "__main__":
    sys.exit(main())
