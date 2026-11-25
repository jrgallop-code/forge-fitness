#!/usr/bin/env python3
"""ESPCN super-resolution of five previously shipped 100 px recipe thumbnails.

No source pixels are misrepresented as native high resolution. The model
predicts detail; outputs are upscaled approximations, not new photos.
"""
from pathlib import Path
from urllib.request import urlretrieve
import os
import cv2
from PIL import Image, ImageFilter
ROOT = Path("assets/meal-photos/source-recreations")
FILES = [
    "big-boy-korean-bbq-beef-bowls.webp",
    "mediterranean-spiced-beef.webp",
    "broccoli-cheddar-rice.webp",
    "veggie-rice.webp",
    "creamy-cilantro-lime-chicken-bowls.webp",
]
MODEL = Path("/tmp/ESPCN_x4.pb")
URL = "https://raw.githubusercontent.com/fannymonori/TF-ESPCN/master/export/ESPCN_x4.pb"
urlretrieve(URL,MODEL)
if MODEL.stat().st_size < 10000: raise RuntimeError("Upscale model download invalid")
sr = cv2.dnn_superres.DnnSuperResImpl_create()
sr.readModel(str(MODEL))
sr.setModel("espcn",4)
for name in FILES:
    path=ROOT/name
    source=cv2.imread(str(path),cv2.IMREAD_COLOR)
    if source is None: raise RuntimeError(f"Missing recipe source: {name}")
    height,width=source.shape[:2]
    if width<80 or height<80: raise RuntimeError(f"Unexpectedly small source: {name} {width}x{height}")
    output=sr.upsample(source)
    # Smoothing the colour noise and crisping local edges is less damaging
    # than a second hallucinating model pass.
    image=Image.fromarray(cv2.cvtColor(output,cv2.COLOR_BGR2RGB))
    image=image.resize((max(800,image.width),max(800,image.height)),Image.Resampling.LANCZOS)
    image=image.filter(ImageFilter.UnsharpMask(radius=1.1,percent=95,threshold=3))
    image.save(path,"WEBP",quality=88,method=6)
    size=Image.open(path).size
    if min(size)<800 or path.stat().st_size<15000:raise RuntimeError(f"Upscaling failed: {name} {size}")
    print(f"{name}: {width}x{height} -> {size}, {path.stat().st_size} bytes")
