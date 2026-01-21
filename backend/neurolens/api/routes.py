import time
from fastapi import APIRouter
from .schemas import FrameRequest, InferResponse, Gesture, Detection
from neurolens.utils.image_utils import b64_to_pil
from neurolens.pipeline.prediction_pipeline.object_detector import YoloDetector


detector = YoloDetector(model_path="yolov8n.pt", conf=0.35)


router = APIRouter()

@router.get("/health")
def health():
  return {"status": "ok", "service": "neurolens-api"}

@router.post("/infer", response_model=InferResponse)
def infer(payload: FrameRequest):
    t0 = time.time()

  
    img = b64_to_pil(payload.image_b64)

    boxes = detector.detect(img)
    detections = [
    Detection(
        label=b["label"],
        score=b["score"],
        x1=b["x1"],
        y1=b["y1"],
        x2=b["x2"],
        y2=b["y2"]
    )
    for b in boxes
    ]

    # gesture এখনো dummy রাখলাম (পরের ধাপে real করবো)
    demo_gesture = Gesture(label="HELP", score=0.93)


    latency = int((time.time() - t0) * 1000)
    return InferResponse(gesture=demo_gesture, detections=detections, latency_ms=latency)

