from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
root=Path(__file__).resolve().parents[1]/'dist'
class Page(HTMLParser):
 def __init__(self,text):
  super().__init__();self.ids=set();self.refs=[];self.scripts=[];self.feed(text)
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if a.get('id'):self.ids.add(a['id'])
  for k in ('href','src'):
   if a.get(k):self.refs.append(a[k])
  if t=='script':self.scripts.append(a.get('src'))
pages={p:Page(p.read_text()) for p in root.rglob('*.html')}
errors=[]
for path,page in pages.items():
 for ref in page.refs:
  u=urlsplit(ref)
  if u.scheme or u.netloc:continue
  target=(root/u.path.lstrip('/')) if u.path.startswith('/') else path.parent/u.path
  if not u.path:target=path
  if target.is_dir():target=target/'index.html'
  if not target.exists():errors.append(f'{path.relative_to(root)}: missing {ref}')
  elif u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids:errors.append(f'{path.relative_to(root)}: missing anchor {ref}')
 for src in page.scripts:
  if src not in ['/local.js', '/admin/editor.js', '/pricing.js', None] and not str(src).startswith('https://cdn.jsdelivr.net/'):errors.append(f'Unexpected runtime script {src}')
if errors:raise SystemExit('\n'.join(errors))
print(f'Checked {len(pages)} pages: all local assets, page links, anchors, and scripts resolve.')
