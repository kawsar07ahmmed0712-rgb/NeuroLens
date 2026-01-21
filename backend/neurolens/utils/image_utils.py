import base64
from io import BytesIO
from PIL import Image

def b64_to_pil(image_b64: str) -> Image.Image:
  # supports: "data:image/jpeg;base64,...." OR raw base64
  if "," in image_b64:
    image_b64 = image_b64.split(",", 1)[1]

  img_bytes = base64.b64decode(image_b64)
  img = Image.open(BytesIO(img_bytes)).convert("RGB")
  return img


def bytes_to_pil(img_bytes: bytes):
  img = Image.open(BytesIO(img_bytes)).convert("RGB")
  return img