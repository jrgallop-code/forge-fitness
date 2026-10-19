import json,urllib.request,hashlib,subprocess,tempfile,os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
from PIL import Image,ImageChops
root=Path(__file__).resolve().parent.parent;out=root/'assets/exercise-thumbnails';out.mkdir(exist_ok=True)
jobs=json.load(open(root/'thumbnail-jobs.json'));unique={j['src']:j for j in jobs};good={};failed=[];errors={}
def fetch_video(url,destination):
 # Cloudflare allows byte-range playback requests but rejected urllib's
 # bare full-object downloads with HTTP 403 on the runner.
 chunk=4*1024*1024
 offset=0
 max_bytes=120*1024*1024
 with open(destination,'wb') as output:
  while offset<max_bytes:
   request=urllib.request.Request(url,headers={
    'User-Agent':'Mozilla/5.0 (compatible; LevelUpThumbnailBuilder/1.0)',
    'Accept':'video/mp4,*/*;q=0.8',
    'Range':f'bytes={offset}-{offset+chunk-1}'
   })
   with urllib.request.urlopen(request,timeout=30) as response:
    data=response.read()
    if not data:break
    if response.status==200:
     if offset:raise ValueError('Media server ignored range on resumed download')
     output.write(data)
     break
    if response.status!=206:raise ValueError(f'Unexpected response: {response.status}')
    content_range=response.headers.get('Content-Range','')
    import re
    match=re.match(r'bytes (\d+)-(\d+)/(\d+|\*)',content_range)
    if not match or int(match[1])!=offset:raise ValueError(f'Invalid Content-Range: {content_range}')
    output.write(data)
    offset+=len(data)
    if match[3]!='*' and offset>=int(match[3]):break
    if len(data)<chunk:raise ValueError('Incomplete range response')
  else:raise ValueError('Video exceeded thumbnail extraction size limit')

def extract(item):
 url,j=item;key=hashlib.sha1(url.encode()).hexdigest()[:14];dest=out/(key+'.webp')
 if dest.exists():return url,str(dest.relative_to(root))
 with tempfile.TemporaryDirectory() as d:
  p=Path(d)/'source.mp4';f=Path(d)/'frame.png'
  for u in [url,j.get('fallbackSrc')]:
   if not u:continue
   try:
    fetch_video(u,p)
    subprocess.run(['ffmpeg','-y','-loglevel','error','-ss','0.5','-i',str(p),'-frames:v','1',str(f)],check=True,timeout=15,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    im=Image.open(f).convert('RGB');bg=Image.new('RGB',im.size,im.getpixel((0,0)));diff=ImageChops.difference(im,bg).convert('L').point(lambda x:255 if x>35 else 0);box=diff.getbbox()
    if box:im=im.crop((max(0,box[0]-8),max(0,box[1]-8),min(im.width,box[2]+8),min(im.height,box[3]+8)))
    im.thumbnail((144,144),Image.Resampling.LANCZOS);canvas=Image.new('RGB',(160,160),(245,245,245));canvas.paste(im,((160-im.width)//2,(160-im.height)//2));canvas.save(dest,'WEBP',quality=78,method=4)
    return url,str(dest.relative_to(root))
   except Exception as exc:
    errors.setdefault(url,[]).append({'url':u,'error':str(exc)[:240]})
 return url,None
with ThreadPoolExecutor(max_workers=8) as pool:
 for n,f in enumerate(as_completed([pool.submit(extract,item) for item in unique.items()]),1):
  url,path=f.result()
  if path:good[url]=path
  else:failed.append(url)
  if n%30==0:print(n,'/',len(unique),'complete;',len(good),'ready',flush=True)
manifest={}
for j in jobs:
 if j['src'] in good:manifest.setdefault(j['id'],{})[j['sex']]=good[j['src']]
(root/'js/workouts/exercise-thumbnail-manifest.js').write_text('export const EXERCISE_THUMBNAILS = '+json.dumps(manifest,separators=(',',':'))+';\n')
Path('thumbnail-report.json').write_text(json.dumps({'images':len(good),'exercises':len(manifest),'failed':failed,'diagnostics':errors},indent=2));print('DONE',len(good),'images,',len(manifest),'exercises',flush=True)
for url in failed[:8]: print('SOURCE FAILED:',url,errors.get(url),flush=True)

if not good: print('WARNING: media sources unavailable; exerciseThumbnail() will use its existing image/SVG fallbacks. Continue native packaging.', flush=True)
