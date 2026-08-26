#!/usr/bin/env python3
"""Builds the old-vs-new element atlas artifact from the two crop runs.
Usage: build-element-atlas.py <elements-old-dir> <elements-new-dir> <targets.json> <out.html>
"""
import base64, json, os, sys, html
from collections import defaultdict, OrderedDict
OLD, NEW, TARGETS, OUT = sys.argv[1:5]
old = json.load(open(os.path.join(OLD, 'index.json')))
new = json.load(open(os.path.join(NEW, 'index.json')))
targets = {t['id']: t for t in json.load(open(TARGETS))}

def b64(p):
    with open(p, 'rb') as f: return base64.b64encode(f.read()).decode()
def img(path, alt):
    return f'<img alt="{html.escape(alt)}" src="data:image/png;base64,{b64(path)}">' if os.path.exists(path) else '<div class="miss">not captured</div>'

# ---- OLD: group by id → theme → state ----
og = defaultdict(lambda: defaultdict(dict))
for r in old:
    if r.get('ok'): og[r['id']][r['theme']][r['state']] = r
# order: composites first, then signatures by frequency-ish (id order)
ids = sorted(og.keys(), key=lambda i: (0 if i.startswith('cmp-') else 1, i))
STATES = ['default', 'hover', 'focus', 'active', 'disabled']

def old_card(i):
    t = targets.get(i, {}); meta = t.get('meta', {})
    label = i.replace('cmp-', '').replace('-', ' ') if i.startswith('cmp-') else f"{meta.get('sig',['?'])[0]} · {meta.get('sig',['','?'])[1]}"
    where = html.escape((t.get('url','').replace('http://127.0.0.1:5173','dev').replace('https://tokenhealthscan.com','live')) + ' — ' + (meta.get('text') or t.get('selector','')[:50]))
    d = og[i].get('dark', {}).get('default', {}).get('computed', {})
    spec = ''
    if d:
        spec = f"<div class='spec mono'>{html.escape(d.get('font','?'))} {d.get('size','')}/{d.get('weight','')} · bg {d.get('bg','')} · fg {d.get('fg','')} · border {d.get('border','')} · r {d.get('radius','')}</div>"
    cells = ''
    for th in ('dark', 'light'):
        row = ''
        for st in STATES:
            r = og[i].get(th, {}).get(st)
            if not r: continue
            row += f"<figure><figcaption>{st}</figcaption>{img(os.path.join(OLD, r['file']), i+' '+th+' '+st)}</figure>"
        if row: cells += f"<div class='trow'><span class='th'>{th}</span><div class='states'>{row}</div></div>"
    n = sum(1 for _ in og[i]['dark'].values()) + sum(1 for _ in og[i]['light'].values())
    return f"<section class='el'><header><h3>{html.escape(label)}</h3><span class='where'>{where}</span>{spec}</header>{cells}</section>"

# ---- NEW: group by id → theme ----
ng = defaultdict(dict)
for r in new: ng[r['id']][r['theme']] = r
GROUPS = OrderedDict([('Buttons', 'btn-'), ('Badges & chips', 'badge-'), ('Inputs', ('input-','select-','textarea','askbar')),
  ('Cards & blocks', ('card-','instrument','score-card','overall-','gated','price-','token-card')),
  ('Navigation & structure', ('nav-','mark','tabs','accordion','ledger','footer-')), ('Feedback & system', ('skeleton','alert','progress','switch','toast','tooltip','stamp'))])
def new_sections():
    out = ''
    for gname, pref in GROUPS.items():
        pref = (pref,) if isinstance(pref, str) else pref
        items = [i for i in ng if i.startswith(pref)]
        if not items: continue
        cards = ''
        for i in items:
            d = ng[i].get('dark', {}); s = d.get('sample') or {}
            spec = f"<div class='spec mono'>{html.escape(s.get('font','') or '')} {s.get('size','')}/{s.get('weight','')} · bg {s.get('bg','')} · fg {s.get('fg','')} · r {s.get('radius','')}</div>" if s else ''
            cards += (f"<section class='el'><header><h3>{html.escape(d.get('label') or i)}</h3>{spec}</header>"
                      f"<div class='pair'><figure><figcaption>dark</figcaption>{img(os.path.join(NEW, i+'.dark.png'), i)}</figure>"
                      f"<figure><figcaption>light</figcaption>{img(os.path.join(NEW, i+'.light.png'), i)}</figure></div></section>")
        out += f"<h2>{gname}</h2><div class='grid'>{cards}</div>"
    return out

old_ok = sum(1 for r in old if r.get('ok')); old_fail = len(old) - old_ok
page = f"""<title>THS Element Map · Old vs New</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
:root{{--g:#0A0C10;--s:#101318;--s2:#161A21;--h:rgba(255,255,255,.085);--ink:#F2F4F7;--i2:#98A1AE;--i3:#5D6673;--c:#3B66FF;--chi:#6E8CFF;--e:#FF7A45;--am:#FFC53D}}
*{{box-sizing:border-box}}html,body{{overflow-x:clip}}
body{{margin:0;background:var(--g);color:var(--ink);font-family:Archivo,Arial,sans-serif;font-size:14.5px;line-height:1.55}}
.w{{max-width:1280px;margin:0 auto;padding:0 24px 90px}}
.lab{{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:var(--i3)}}
.mono{{font-family:'JetBrains Mono',monospace}}
h1{{font-weight:300;font-size:clamp(2rem,5vw,3.1rem);letter-spacing:-.035em;line-height:1.03;margin:14px 0 0}}h1 b{{font-weight:500}}
h2{{font-weight:400;font-size:1.3rem;letter-spacing:-.02em;margin:40px 0 12px;padding-top:26px;border-top:1px solid var(--h)}}
header.top{{padding:60px 0 30px;border-bottom:1px solid var(--h)}}
p.sub{{color:var(--i2);max-width:68ch;margin:14px 0 0}}
.stats{{display:flex;flex-wrap:wrap;border:1px solid var(--h);margin-top:24px}}.st{{padding:11px 16px;border-right:1px solid var(--h);flex:1 1 auto;min-width:110px}}.st b{{display:block;font-family:'JetBrains Mono',monospace;font-weight:400;font-size:1.3rem;margin-top:3px}}
.switcher{{position:sticky;top:0;z-index:5;background:var(--g);border-bottom:1px solid var(--h);padding:12px 0;display:flex;gap:8px;margin-top:20px}}
.switcher button{{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;padding:8px 14px;border-radius:4px;border:1px solid var(--h);background:transparent;color:var(--i2);cursor:pointer}}
.switcher button.on{{border-color:var(--c);color:var(--ink);background:rgba(59,102,255,.1)}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:14px}}
section.el{{border:1px solid var(--h);background:var(--s);padding:14px}}
section.el header h3{{margin:0;font-weight:500;font-size:14px;letter-spacing:-.01em}}
.where{{display:block;font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--i3);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
.spec{{font-size:10.5px;color:var(--i2);margin-top:6px;line-height:1.5;word-break:break-all}}
.trow{{display:grid;grid-template-columns:44px 1fr;gap:10px;align-items:start;margin-top:12px}}
.th{{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--i3);padding-top:6px}}
.states{{display:flex;flex-wrap:wrap;gap:8px}}
figure{{margin:0;border:1px solid var(--h);background:var(--s2);padding:4px}}
figure img{{display:block;max-width:100%;max-height:220px;width:auto;height:auto}}
figcaption{{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--i3);margin-bottom:4px}}
.pair{{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}}
.pair figure img{{width:100%;max-height:none}}
.miss{{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--i3);padding:10px}}
#old,#new{{display:none}}body.show-old #old,body.show-new #new{{display:block}}
footer{{padding:30px 0 0;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--i3);line-height:1.8}}
@media(max-width:600px){{.pair{{grid-template-columns:1fr}}}}
</style>
<body class="show-old"><div class="w">
<header class="top"><p class="lab">Token Health Scan / element map / current vs Cobalt Signal</p>
<h1>Every element, <b>every state</b>, before and after.</h1>
<p class="sub">Left: today's UI, cropped from real renders of the live site and local build — every distinct visual signature found across the 216-page atlas, plus the app's composite components, each forced through hover / focus / active / disabled in both themes. Right: the same catalog regenerated from the Cobalt Signal foundation.</p>
<div class="stats"><div class="st"><span class="lab">Current signatures</span><b>{len(ids)}</b></div><div class="st"><span class="lab">Current state crops</span><b>{old_ok}</b></div><div class="st"><span class="lab">Uncapturable</span><b>{old_fail}</b></div><div class="st"><span class="lab">Regenerated elements</span><b>{len(ng)}</b></div><div class="st"><span class="lab">Regenerated crops</span><b>{len(new)}</b></div></div>
</header>
<div class="switcher"><button class="on" onclick="document.body.className='show-old';this.classList.add('on');this.nextElementSibling.classList.remove('on')">Current state</button><button onclick="document.body.className='show-new';this.classList.add('on');this.previousElementSibling.classList.remove('on')">Cobalt Signal</button></div>
<div id="old"><h2>Composite components</h2><div class="grid">{''.join(old_card(i) for i in ids if i.startswith('cmp-'))}</div>
<h2>Every distinct signature (auto-discovered)</h2><div class="grid">{''.join(old_card(i) for i in ids if not i.startswith('cmp-'))}</div></div>
<div id="new">{new_sections()}</div>
<footer>Crops at 2× device pixels / states forced via Playwright (hover, focus, mousedown, disabled attr) / computed styles read live per state / source: token-health-radar/design/tools/elements.mjs + elements-new.mjs</footer>
</div></body>"""
open(OUT, 'w').write(page)
print(f"wrote {OUT} {len(page)//1024}KB | old ids {len(ids)} crops {old_ok} fail {old_fail} | new {len(ng)} ids {len(new)} crops")
