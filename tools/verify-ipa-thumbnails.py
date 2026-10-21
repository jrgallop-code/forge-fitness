"""Compare every shipped thumbnail and its manifest with the exported signed IPA."""
import hashlib
import json
from pathlib import Path
import re
import sys
import zipfile

manifest_path = 'js/workouts/exercise-thumbnail-manifest.js'
manifest = Path(manifest_path).read_bytes()
mappings = json.loads(re.search(rb'EXERCISE_THUMBNAILS\s*=\s*(\{.*\})\s*;', manifest, re.S).group(1))
assert len(mappings) == 343, 'Incomplete source manifest'
files = {manifest_path, *(file for variants in mappings.values() for file in variants.values())}
with zipfile.ZipFile(sys.argv[1]) as archive:
    candidates = [name for name in archive.namelist() if name.startswith('Payload/') and name.endswith('/public/' + manifest_path)]
    assert len(candidates) == 1, f'Expected one native manifest, found {candidates}'
    prefix = candidates[0][:-len(manifest_path)]
    for file in files:
        source = Path(file).read_bytes()
        packaged = archive.read(prefix + file)
        assert hashlib.sha256(source).digest() == hashlib.sha256(packaged).digest(), f'Native asset differs: {file}'
print(f'Signed IPA verified: 343 exercises; {len(files) - 1} image files match reviewed source bytes.')
