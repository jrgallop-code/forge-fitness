import json,urllib.request,hashlib,subprocess,tempfile,os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
from PIL import Image,ImageChops
root=Path(__file__).resolve().parent.parent;out=root/'assets/exercise-thumbnails';out.mkdir(exist_ok=True)
jobs=json.load(open(root/'thumbnail-jobs.json'));unique={j['src']:j for j in jobs};good={};failed=[]
def extract(item):
 url,j=item;key=hashlib.sha1(url.encode()).hexdigest()[:14];dest=out/(key+'.webp')
 if dest.exists():return url,str(dest.relative_to(root))
 with tempfile.TemporaryDirectory() as d:
  p=Path(d)/'source.mp4';f=Path(d)/'frame.png'
  for u in [url,j.get('fallbackSrc')]:
   if not u:continue
   try:
    data=urllib.request.urlopen(u,timeout=20).read();p.write_bytes(data)
    subprocess.run(['ffmpeg','-y','-loglevel','error','-ss','0.5','-i',str(p),'-frames:v','1',str(f)],check=True,timeout=15,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    im=Image.open(f).convert('RGB');bg=Image.new('RGB',im.size,im.getpixel((0,0)));diff=ImageChops.difference(im,bg).convert('L').point(lambda x:255 if x>35 else 0);box=diff.getbbox()
    if box:im=im.crop((max(0,box[0]-8),max(0,box[1]-8),min(im.width,box[2]+8),min(im.height,box[3]+8)))
    im.thumbnail((144,144),Image.Resampling.LANCZOS);canvas=Image.new('RGB',(160,160),(245,245,245));canvas.paste(im,((160-im.width)//2,(160-im.height)//2));canvas.save(dest,'WEBP',quality=78,method=4)
    return url,str(dest.relative_to(root))
   except Exception:pass
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
Path('thumbnail-report.json').write_text(json.dumps({'images':len(good),'exercises':len(manifest),'failed':failed},indent=2));print('DONE',len(good),'images,',len(manifest),'exercises',flush=True)

if not good: raise SystemExit('No exercise video thumbnails could be extracted; check media host access.')
