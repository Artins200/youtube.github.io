#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Мини-интерпретатор блоков из Screen1.bky.

Нужен, чтобы проверить логику игры не запуская MIT App Inventor:
скрипт читает сгенерированные блоки и "проигрывает" партию —
с хорошим игроком и с игроком, который ничего не нажимает.

    python3 tools/simulate.py
"""

import os
import re
import sys
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
BKY = os.path.join(HERE, "..", "project", "src", "appinventor",
                   "ai_spriterush", "SpriteRush", "Screen1.bky")


# ---------------------------------------------------------------------------
class Comp(object):
    """Имитация компонента App Inventor."""

    def __init__(self, name, ctype, **props):
        self.name = name
        self.ctype = ctype
        self.props = props

    def get(self, p):
        return self.props[p]

    def set(self, p, v):
        self.props[p] = v


class Stop(Exception):
    pass


class Ctx(object):
    def __init__(self, prog, log):
        self.prog = prog
        self.log = log
        self.vars = {}

    def getvar(self, name):
        if name.startswith("global "):
            return self.prog.globals[name[len("global "):]]
        return self.vars[name]

    def setvar(self, name, val):
        if name.startswith("global "):
            self.prog.globals[name[len("global "):]] = val
        else:
            self.vars[name] = val


# ---------------------------------------------------------------------------
def fld(b, n):
    for x in b.findall("field"):
        if x.get("name") == n:
            return x.text
    return None


def val(b, n):
    v = b.find("value[@name='%s']" % n)
    return v.find("block") if v is not None else None


def stm(b, n):
    v = b.find("statement[@name='%s']" % n)
    return v.find("block") if v is not None else None


def nxt(b):
    n = b.find("next")
    return n.find("block") if n is not None else None


def mut(b):
    return b.find("mutation")


def args_of(b):
    return [val(b, "ARG%d" % i) for i in range(8)]


# --- выражения -------------------------------------------------------------

def ev(b, ctx):
    if b is None:
        raise Stop("пустой сокет")
    t = b.get("type")
    m = mut(b)
    if t == "math_number":
        n = fld(b, "NUM")
        return float(n) if "." in n else int(n)
    if t == "text":
        return fld(b, "TEXT")
    if t == "logic_boolean":
        return fld(b, "BOOL") == "TRUE"
    if t == "lexical_variable_get":
        return ctx.getvar(fld(b, "VAR"))
    if t == "component_set_get":
        comp = ctx.prog.comps[m.get("instance_name")]
        if m.get("set_or_get") == "get":
            return comp.get(m.get("property_name"))
        raise Stop("getter/setter путаница")
    if t == "component_method":
        return ev_method(b, ctx)
    if t == "math_add":
        return ev(val(b, "NUM0"), ctx) + ev(val(b, "NUM1"), ctx)
    if t == "math_multiply":
        return ev(val(b, "NUM0"), ctx) * ev(val(b, "NUM1"), ctx)
    if t == "math_subtract":
        return ev(val(b, "A"), ctx) - ev(val(b, "B"), ctx)
    if t == "math_division":
        return ev(val(b, "A"), ctx) / ev(val(b, "B"), ctx)
    if t == "math_random_int":
        lo = ev(val(b, "FROM"), ctx)
        hi = ev(val(b, "TO"), ctx)
        if lo > hi:
            raise Stop("случайное число из пустого диапазона %s..%s" % (lo, hi))
        return (lo + hi) // 2
    if t in ("math_compare", "logic_compare"):
        a = ev(val(b, "A"), ctx)
        c = ev(val(b, "B"), ctx)
        op = fld(b, "OP")
        return {"EQ": a == c, "NEQ": a != c, "LT": a < c,
                "LTE": a <= c, "GT": a > c, "GTE": a >= c}[op]
    if t == "logic_operation":
        a = ev(val(b, "A"), ctx)
        c = ev(val(b, "B"), ctx)
        return (a and c) if fld(b, "OP") == "AND" else (a or c)
    if t == "logic_negate":
        return not ev(val(b, "BOOL"), ctx)
    if t == "lists_select_item":
        lst = ev(val(b, "LIST"), ctx)
        i = int(ev(val(b, "NUM"), ctx))
        if i < 1 or i > len(lst):
            raise Stop("индекс %d вне списка длиной %d" % (i, len(lst)))
        return lst[i - 1]
    if t == "lists_create_with":
        items = int(m.get("items"))
        return [ev(val(b, "ADD%d" % i), ctx) for i in range(items)]
    if t == "text_join":
        items = int(m.get("items"))
        out = ""
        for i in range(items):
            v = ev(val(b, "ADD%d" % i), ctx)
            out += ("%g" % v) if isinstance(v, float) else str(v)
        return out
    if t == "lists_length":
        return len(ev(val(b, "LIST"), ctx))
    raise Stop("неизвестное выражение " + t)


def ev_method(b, ctx):
    m = mut(b)
    comp = ctx.prog.comps[m.get("instance_name")]
    name = m.get("method_name")
    a = [ev(x, ctx) for x in args_of(b) if x is not None]
    if name == "GetValue":
        return ctx.prog.tinydb.get(a[0], a[1])
    if name == "StoreValue":
        ctx.prog.tinydb[a[0]] = a[1]
        return None
    if name == "MoveTo":
        comp.set("X", a[0])
        comp.set("Y", a[1])
        return None
    if name == "Clear":
        ctx.log["clears"] = ctx.log.get("clears", 0) + 1
        return None
    if name == "DrawText":
        ctx.log.setdefault("text", []).append(a[0])
        return None
    raise Stop("неизвестный метод " + name)


# --- операторы -------------------------------------------------------------

def run(b, ctx):
    while b is not None:
        b = exec_stmt(b, ctx)


def exec_stmt(b, ctx):
    t = b.get("type")
    m = mut(b)
    if t == "lexical_variable_set":
        ctx.setvar(fld(b, "VAR"), ev(val(b, "VALUE"), ctx))
    elif t == "component_set_get":
        if m.get("set_or_get") != "set":
            raise Stop("ожидался setter")
        ctx.prog.comps[m.get("instance_name")].set(m.get("property_name"),
                                                   ev(val(b, "VALUE"), ctx))
    elif t == "component_method":
        ev_method(b, ctx)
    elif t == "lists_replace_item":
        lst = ev(val(b, "LIST"), ctx)
        i = int(ev(val(b, "NUM"), ctx))
        if i < 1 or i > len(lst):
            raise Stop("замена элемента %d вне списка длиной %d" % (i, len(lst)))
        lst[i - 1] = ev(val(b, "ITEM"), ctx)
    elif t == "lists_add_items":
        lst = ev(val(b, "LIST"), ctx)
        k = int(m.get("items"))
        for i in range(k):
            lst.append(ev(val(b, "ITEM%d" % i), ctx))
    elif t == "controls_if":
        if ev(val(b, "IF0"), ctx):
            run(stm(b, "DO0"), ctx)
        else:
            el = stm(b, "ELSE")
            if el is not None:
                run(el, ctx)
    elif t == "controls_forRange":
        var = fld(b, "VAR")
        start = int(ev(val(b, "START"), ctx))
        end = int(ev(val(b, "END"), ctx))
        step = int(ev(val(b, "STEP"), ctx))
        body = stm(b, "DO")
        v = start
        while v <= end:
            ctx.setvar(var, v)
            run(body, ctx)
            v += step
    elif t == "procedures_callnoreturn":
        name = fld(b, "PROCNAME")
        proc = ctx.prog.procs[name]
        vals = [ev(x, ctx) for x in args_of(b) if x is not None]
        inner = Ctx(ctx.prog, ctx.log)
        for an, av in zip(proc["args"], vals):
            inner.setvar(an, av)
        run(proc["body"], inner)
    else:
        raise Stop("неизвестный оператор " + t)
    return nxt(b)


# ---------------------------------------------------------------------------
class Program(object):
    def __init__(self, path):
        src = open(path, encoding="utf-8").read()
        self.root = ET.fromstring(re.sub(r'\sxmlns="[^"]+"', "", src, count=1))
        self.globals = {}
        self.procs = {}
        self.events = {}
        self.comps = {}
        self.tinydb = {}
        self._load()

    def _load(self):
        for b in self.root.findall("block"):
            t = b.get("type")
            if t == "global_declaration":
                self.globals[fld(b, "NAME")] = ev(val(b, "VALUE"), Ctx(self, {}))
            elif t == "procedures_defnoreturn":
                self.procs[fld(b, "NAME")] = {
                    "args": [a.get("name") for a in mut(b).findall("arg")],
                    "body": stm(b, "STACK"),
                }
            elif t == "component_event":
                key = (mut(b).get("instance_name"), mut(b).get("event_name"))
                self.events[key] = stm(b, "DO")

        # компоненты (зеркало дизайнера)
        self.comps["Canvas1"] = Comp("Canvas1", "Canvas", Width=360, Height=640,
                                     FontSize=18.0, TextAlignment=1, PaintColor=-1)
        for i in range(1, 25):
            n = "Sprite%d" % i
            self.comps[n] = Comp(n, "ImageSprite", Width=64, Height=64, X=0, Y=0,
                                 Visible=False, Speed=0.0, Heading=0.0)
        self.comps["SpriteStart"] = Comp("SpriteStart", "ImageSprite", Width=180,
                                         Height=180, X=0, Y=0, Visible=True,
                                         Speed=0.0, Heading=0.0)
        self.comps["Clock1"] = Comp("Clock1", "Clock", TimerEnabled=True,
                                    TimerInterval=100)
        self.comps["TinyDB1"] = Comp("TinyDB1", "TinyDB")

    def fire(self, comp, event, log=None, extra=None):
        ctx = Ctx(self, log if log is not None else {})
        if extra:
            for k, v in extra.items():
                ctx.vars[k] = v
        body = self.events.get((comp, event))
        if body is None:
            raise Stop("нет обработчика %s.%s" % (comp, event))
        run(body, ctx)
        return ctx

    def visible_sprites(self):
        return [n for n in ("Sprite%d" % i for i in range(1, 25))
                if self.comps[n].get("Visible")]


# ---------------------------------------------------------------------------
def main():
    prog = Program(BKY)
    log = {}
    print("Процедур: %d, обработчиков: %d, глобальных: %d"
          % (len(prog.procs), len(prog.events), len(prog.globals)))

    # --- старт экрана
    prog.fire("Screen1", "Initialize", log)
    print("После Initialize: видимых спрайтов %d, рекорд %s, список %d шт."
          % (len(prog.visible_sprites()), prog.globals["best"],
             len(prog.globals["visibleList"])))
    print("  текст на холсте:", log.get("text"))

    # --- запуск игры
    prog.fire("SpriteStart", "Touched", log)
    assert prog.globals["playing"] is True
    print("После нажатия СТАРТ: playing=%s, кнопка видна=%s"
          % (prog.globals["playing"], prog.comps["SpriteStart"].get("Visible")))

    # --- сценарий 1: игрок ничего не нажимает -> игра должна кончиться через ~5 сек
    ticks = 0
    while prog.globals["playing"] and ticks < 200:
        prog.fire("Clock1", "Timer", log)
        ticks += 1
    print("\n[ленивый игрок] тиков до конца: %d (gameTime=%s мс), очки: %s"
          % (ticks, prog.globals["gameTime"], prog.globals["score"]))
    print("  видимых спрайтов после GameOver: %d, кнопка видна: %s, таймер: %s"
          % (len(prog.visible_sprites()),
             prog.comps["SpriteStart"].get("Visible"),
             prog.comps["Clock1"].get("TimerEnabled")))
    print("  экран:", log.get("text")[-3:])
    assert 45 < ticks < 60, "игра должна кончаться примерно через 5 секунд"
    assert prog.globals["best"] == 0

    # --- сценарий 2: виртуальный игрок жмёт по всем целям
    prog.fire("SpriteStart", "Touched", log)
    ticks = 0
    while prog.globals["playing"] and ticks < 1200:   # до 2 минут игры
        prog.fire("Clock1", "Timer", log)
        ticks += 1
        # жмём по каждой видимой цели, которой осталось жить меньше 40% времени
        for name in list(prog.visible_sprites()):
            idx = int(name[6:])
            born = prog.globals["bornList"][idx - 1]
            life = prog.globals["lifeTime"]
            age = prog.globals["gameTime"] - born
            if age > life * 0.35:
                prog.fire(name, "Touched", log, extra={"x": 10, "y": 10})
        if ticks % 200 == 0:
            print("  t=%5d мс  уровень=%s  целей=%s/%s  очки=%s  жизнь=%s мс  скорость=%.1f"
                  % (prog.globals["gameTime"], prog.globals["level"],
                     prog.globals["active"], prog.globals["maxActive"],
                     prog.globals["score"], prog.globals["lifeTime"],
                     prog.globals["speed"]))
    print("\n[живой игрок] продержался %d тиков (%.1f с), очки %s, уровень %s"
          % (ticks, prog.globals["gameTime"] / 1000.0,
             prog.globals["score"], prog.globals["level"]))
    print("  рекорд сохранён в TinyDB:", prog.tinydb)
    print("  очисток холста:", log.get("clears"))
    assert prog.globals["score"] > 50, "игрок должен был набрать очки"
    assert prog.globals["level"] > 1, "уровень должен расти"
    print("\nСимуляция прошла ✅")
    return 0


if __name__ == "__main__":
    sys.exit(main())
