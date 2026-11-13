# process-images.py: turn the generated renders and the client's own media into shippable WebP, with labels.
#   python3 -I tools/process-images.py
# Generated stills (private/gen/out/<job>-0.png): WebP q90 at the render's full width plus smaller variants, IPTC digital
# source type trainedAlgorithmicMedia embedded as XMP. Cut-outs keep their alpha, trimmed to the object.
# Upscaled client photos (Topaz, no content change): IPTC compositeWithTrainedAlgorithmicMedia, ai = "edited".
# Client media (assets/source, downloaded from the live site): the largest variant of every image a captured page uses,
# resized only (never AI-altered). Writes src/assets/img/*.webp and src/content/images.json.
import json, os, re
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
GEN = os.path.join(ROOT, 'private/gen/out')
OUT = os.path.join(ROOT, 'src/assets/img'); os.makedirs(OUT, exist_ok=True)
REG = os.path.join(ROOT, 'src/content/images.json')
INV = os.path.join(ROOT, 'audit/image-inventory.json')

def xmp(kind):
    return ('<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF '
            'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" '
            'xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/" '
            'Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/%s"/>'
            '</rdf:RDF></x:xmpmeta><?xpacket end="w"?>' % kind).encode()

reg = {'img': {}, 'media': {}}

def save(im, name, widths, q=90, label=None, alpha=False, method=6):
    files = []
    for w in sorted(set(widths), reverse=True):
        if w >= im.width: w = im.width
        h = round(im.height * w / im.width)
        r = im if w == im.width else im.resize((w, h), Image.LANCZOS)
        fn = '%s-%d.webp' % (name, w)
        kw = dict(quality=q, method=method)
        if alpha: kw['alpha_quality'] = 92
        if label: kw['xmp'] = xmp(label)
        r.save(os.path.join(OUT, fn), 'WEBP', **kw)
        files.append({'file': 'img/' + fn, 'w': w, 'h': h, 'bytes': os.path.getsize(os.path.join(OUT, fn))})
    files.sort(key=lambda f: f['w'])
    return files

def gen(name, alt, widths, src=None, cut=False):
    p = os.path.join(GEN, (src or name) + '-0.png')
    im = Image.open(p)
    if cut:
        im = im.convert('RGBA'); box = im.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox()
        if box: im = im.crop(box)
    else:
        im = im.convert('RGB')
    reg['img'][name] = {'alt': alt, 'ai': 'generated', 'w': im.width, 'h': im.height, 'files': save(im, name, widths, label='trainedAlgorithmicMedia', alpha=cut), 'source': 'private/gen/out/' + (src or name) + '.result.json'}

def upscaled(name, alt, widths, src):
    im = Image.open(os.path.join(GEN, src + '-0.png')).convert('RGB')
    reg['img'][name] = {'alt': alt, 'ai': 'edited', 'w': im.width, 'h': im.height, 'files': save(im, name, widths, q=88, label='compositeWithTrainedAlgorithmicMedia'), 'source': 'private/gen/out/' + src + '.result.json (Topaz High Fidelity V2 upscale of the client photo, no content change)'}

# ---- generated (mood and category illustration only; never the store, staff, customers, products or a real place) ----
gen('wall-mural', 'Abstract graffiti mural in lime, mint and teal under a spotlight on a dark wall', (2752, 1600, 900), src='wall-mural-b')
gen('wall-mural-wide', 'A long dark brick wall with an abstract graffiti mural in lime and teal at night', (3136, 1600, 900), src='wall-mural-a')
gen('alley', 'A wet city alley at night with lime and teal light on the pavement', (3136, 1600, 900), src='alley-night')
gen('turntable', 'A silver turntable with a lime-labelled vinyl record on black', (2752, 1600, 900))
for n, alt in [('flower', 'A frosty cannabis flower with orange pistils on black'), ('prerolls', 'Three cannabis pre-roll cones on black slate'),
               ('edibles', 'Sugar-dusted fruit chews on a black dish'), ('vapes', 'A vape pen and an amber oil cartridge on black'),
               ('concentrates', 'Amber cannabis shatter and live resin on parchment'), ('tinctures', 'An amber dropper bottle with a falling golden drop'),
               ('beverages', 'A blank black drink can with ice and a cannabis leaf'), ('accessories', 'A black herb grinder and a glass hand pipe on slate'),
               ('cbd', 'Hemp flower and leaves on a white dish beside a jar of golden oil'), ('topicals', 'A hemp leaf on a river stone beside a jar of balm')]:
    gen('cat-' + n, alt, (1400, 800, 480), src={'prerolls': 'cat-prerolls-b', 'cbd': 'cat-cbd-b', 'topicals': 'cat-cbd'}.get(n, 'cat-' + n))
gen('obj-bud-a', 'A frosty cannabis bud', (1200, 640, 360), src='cut-bud-a', cut=True)
gen('obj-bud-b', 'A small purple-tinged cannabis nug', (1200, 640, 360), src='cut-bud-b', cut=True)
gen('obj-spraycan', 'A black spray paint can with a lime cap and drips', (1000, 560, 320), src='cut-spraycan', cut=True)
gen('obj-boombox', 'A chrome and black boombox', (1400, 800, 480), src='cut-boombox', cut=True)

# ---- the client's own photos, upscaled 2-4x (Topaz, no content change) ----
upscaled('skyline', 'The Albany skyline at night reflected in the Hudson River', (3000, 1920, 1200, 760), 'up-skyline')
upscaled('store-mural', 'Inside Capital District Cannabis & Wellness: the graffiti mural wall and the product shelves', (3200, 1920, 1200, 760), 'up-mural')
upscaled('store-albany', 'Inside the Albany dispensary: the graffiti mural behind the counter', (1528, 900, 520), 'up-albany')

# ---- client media from the live site: largest variant of each image, resized only ----
inv = json.load(open(INV))['images']
SIZE_RE = re.compile(r'-(\d+)x(\d+)(?=\.\w+$)|-scaled(?=\.\w+$)|-e\d{9,}(?=\.\w+$)')
def base_key(url):
    # "<yyyy>/<mm>/<file>" without the WordPress size suffix: two uploads can share a file name in different months
    u = re.sub(r'/+', '/', url.split('?')[0].split('/wp-content/', 1)[-1])
    m = re.search(r'uploads/(\d{4}/\d{2}/)?([^/]+)$', u)
    tail = (m.group(1) or '') + m.group(2) if m else u.rsplit('/', 1)[-1]
    return SIZE_RE.sub('', tail).lower()
groups = {}
for it in inv:
    src = it.get('src') or ''
    lf = it.get('localFile')
    if it.get('external') or not lf or '/uploads/' not in src: continue
    if not re.search(r'\.(jpe?g|png|webp|avif|gif)$', src.split('?')[0], re.I): continue
    groups.setdefault(base_key(src), []).append(it)

def client_media(key):
    items = groups[key]
    best = max(items, key=lambda i: (i.get('intrinsicWidth') or 0) * (i.get('intrinsicHeight') or 0))
    p = best['localFile'] if os.path.isabs(best['localFile']) else os.path.join(ROOT, best['localFile'])
    try:
        im = Image.open(p); alpha = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
        im = im.convert('RGBA' if alpha else 'RGB')
    except Exception as e:
        return key, None, str(e)
    name = 'm-' + re.sub(r'[^a-z0-9]+', '-', key.rsplit('.', 1)[0])[:60].strip('-')
    widths = [w for w in (1600, 960, 540) if w < im.width] + [min(im.width, 1600)]
    files = save(im, name, widths, q=86, alpha=alpha, method=4)
    alts = [a for a in (best.get('alts') or []) if a]
    return key, {'name': name, 'w': im.width, 'h': im.height, 'files': files, 'alt': alts[0] if alts else '', 'urls': sorted(set(i['src'] for i in items))}, None

with ThreadPoolExecutor(max_workers=8) as ex:
    for key, rec, err in ex.map(client_media, list(groups)):
        if err or not rec: print('skip', key, err); continue
        reg['img'][rec['name']] = {'alt': rec['alt'], 'ai': False, 'w': rec['w'], 'h': rec['h'], 'files': rec['files'], 'source': rec['urls'][0]}
        for u in rec['urls']: reg['media'][base_key(u)] = rec['name']

json.dump(reg, open(REG, 'w'), indent=1)
tot = sum(f['bytes'] for v in reg['img'].values() for f in v['files'])
print(len(reg['img']), 'images,', sum(len(v['files']) for v in reg['img'].values()), 'files,', round(tot / 1048576, 1), 'MB;', len(reg['media']), 'media keys')
