import time
from fastapi import APIRouter
from .schemas import FrameRequest, InferResponse, Gesture, Detection

router = APIRouter()

@router.get("/health")
def health():
  return {"status": "ok", "service": "neurolens-api"}

@router.post("/infer", response_model=InferResponse)
def infer(payload: FrameRequest):
  t0 = time.time()

  # TODO: later -> decode payload.image_b64, run YOLO + mediapipe
  demo_boxes = [
    Detection(label="person", score=0.88, x1=80, y1=60, x2=320, y2=320)
  ]
  demo_gesture = Gesture(label="HELP", score=0.93)

  latency = int((time.time() - t0) * 1000)
  return InferResponse(gesture=demo_gesture, detections=demo_boxes, latency_ms=latency)
