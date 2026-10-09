"""Copy audited public Drive MP4s to the existing R2 video domain."""
import concurrent.futures,json,os,pathlib,subprocess,tempfile,urllib.request
origin='https://media.leveluphypertrophy.com'
account=os.environ['CLOUDFLARE_ACCOUNT_ID']; token=os.environ['CLOUDFLARE_API_TOKEN']
def api(path):
 req=urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{account}/r2/{path}',headers={'Authorization':f'Bearer {token}'})
 with urllib.request.urlopen(req) as response: data=json.load(response)
 if not data.get('success'): raise RuntimeError('Cloudflare R2 request failed')
 return data['result']
buckets=api('buckets'); bucket=None
for item in buckets.get('buckets',[]):
 domains=api(f"buckets/{item['name']}/domains/custom")
 if any(d.get('domain')=='media.leveluphypertrophy.com' for d in domains.get('domains',[])): bucket=item['name'];break
if not bucket: raise RuntimeError('Cannot identify the R2 bucket serving the exercise video domain')
print('Located existing exercise video bucket',flush=True)
text=pathlib.Path('js/workouts/video-library-media.js').read_text(); records=json.loads(text[text.index('{'):text.rindex('}')+1])
jobs=[(exercise,sex,drive) for exercise,data in records.items() for sex,drive in data['driveVideos'].items()]
def transfer(job):
 exercise,sex,drive=job; key=f'form-videos/video-library/{sex}/{exercise}.mp4'; public=f'{origin}/{key}'
 try:
  with urllib.request.urlopen(public) as response:
   if response.headers.get('Content-Type','').startswith('video/') and response.read(32)[4:8]==b'ftyp': return key
 except Exception: pass
 with tempfile.TemporaryDirectory() as tmp:
  path=pathlib.Path(tmp)/'clip.mp4'
  result=subprocess.run(['gdown',f'https://drive.google.com/uc?id={drive}','-O',str(path),'--quiet'],capture_output=True)
  if result.returncode or not path.exists(): raise RuntimeError(f'Drive download failed: {exercise} ({sex})')
  with path.open('rb') as file:
   if file.read(32)[4:8]!=b'ftyp': raise RuntimeError(f'Drive returned a non-MP4: {exercise} ({sex})')
  result=subprocess.run(['npx','--no-install','wrangler','r2','object','put',f'{bucket}/{key}','--file',str(path),'--content-type','video/mp4','--remote'],capture_output=True)
  if result.returncode: raise RuntimeError(f'R2 upload failed: {exercise} ({sex})')
  with urllib.request.urlopen(public) as response:
   if response.read(32)[4:8]!=b'ftyp': raise RuntimeError(f'Public playback validation failed: {exercise} ({sex})')
 return key
completed=[]; failures=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for result in concurrent.futures.as_completed([pool.submit(transfer,job) for job in jobs]):
  try: completed.append(result.result())
  except Exception as error: failures.append(str(error))
  print(f'Validated {len(completed)}/{len(jobs)} videos; failed {len(failures)}',flush=True)
pathlib.Path('video-media-sync-report.json').write_text(json.dumps({'completed':completed,'failures':failures},indent=2))
if failures: raise RuntimeError('\n'.join(failures))
