from pydantic import BaseModel
from typing import List, Optional

class FrameRequest(BaseModel):
  image_b64: str  # data:image/jpeg;base64,...

class Gesture(BaseModel):
  label: str
  score: float

class Detection(BaseModel):
  label: str
  score: float
  x1: int
  y1: int
  x2: int
  y2: int

class InferResponse(BaseModel):
  gesture: Optional[Gesture] = None
  detections: List[Detection] = []
  latency_ms: int
