"""Validate direct MP4 playback for every audited Drive demonstration."""
import concurrent.futures,json,pathlib,urllib.request
text=pathlib.Path('js/workouts/video-library-media.js').read_text(); records=json.loads(text[text.index('{'):text.rindex('}')+1])
jobs=[(exercise,sex,drive) for exercise,data in records.items() for sex,drive in data['driveVideos'].items()]
def validate(job):
 exercise,sex,drive=job
 url=f'https://drive.usercontent.google.com/download?id={drive}&export=download&confirm=t'
 req=urllib.request.Request(url,headers={'Range':'bytes=0-31'})
 with urllib.request.urlopen(req,timeout=40) as response:
  header=response.read(32)
  if header[4:8]!=b'ftyp': raise RuntimeError(f'Non-MP4 response: {exercise} ({sex})')
  return {'exercise':exercise,'sex':sex,'contentType':response.headers.get('Content-Type'),'status':response.status}
completed=[]; failures=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for result in concurrent.futures.as_completed([pool.submit(validate,job) for job in jobs]):
  try: completed.append(result.result())
  except Exception as error: failures.append(str(error))
  if (len(completed)+len(failures))%20==0: print(f'Validated {len(completed)}/{len(jobs)} videos; failed {len(failures)}',flush=True)
pathlib.Path('video-media-sync-report.json').write_text(json.dumps({'completed':completed,'failures':failures},indent=2))
print(json.dumps({'validated':len(completed),'failed':len(failures),'errors':failures[:10]}),flush=True)
if failures: raise RuntimeError('Some direct playback URLs failed validation')
