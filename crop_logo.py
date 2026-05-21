import numpy as np
from PIL import Image

im = Image.open('ss-logo.png').convert('RGBA')
arr = np.array(im)

mask = ((arr[:, :, 0] < 250) | (arr[:, :, 1] < 250) | (arr[:, :, 2] < 250)) & (arr[:, :, 3] > 10)
coords = np.argwhere(mask)

if len(coords) > 0:
    y0, x0 = coords.min(axis=0)
    y1, x1 = coords.max(axis=0) + 1
    
    # Add a tiny 5px padding
    y0 = max(0, y0 - 5)
    x0 = max(0, x0 - 5)
    y1 = min(arr.shape[0], y1 + 5)
    x1 = min(arr.shape[1], x1 + 5)
    
    cropped = im.crop((x0, y0, x1, y1))
    cropped.save('ss-logo-cropped.png')
    print('Cropped successfully')
else:
    print('Blank image')
