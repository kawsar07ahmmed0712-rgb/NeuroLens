import time
from fastapi import APIRouter
from fastapi import WebSocket, WebSocketDisconnect
import json
from .schemas import FrameRequest, InferResponse, Gesture, Detection
from neurolens.utils.image_utils import b64_to_pil, bytes_to_pil
from neurolens.pipeline.prediction_pipeline.object_detector import YoloDetector
from neurolens.pipeline.prediction_pipeline.gesture_detector import MediaPipeGestureDetector


gesture_detector = None
detector = YoloDetector(model_path="yolov8n.pt", conf=0.35)


router = APIRouter()

@router.get("/health")
def health():
  return {"status": "ok", "service": "neurolens-api"}

@router.post("/infer", response_model=InferResponse)
def infer(payload: FrameRequest):
    t0 = time.time()

  
    img = b64_to_pil(payload.image_b64)
    global gesture_detector
    if gesture_detector is None:
        gesture_detector = MediaPipeGestureDetector(max_hands=1, det_conf=0.5, track_conf=0.5)


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

    g = gesture_detector.detect(img)

    gesture = None
    if g and g["label"] != "UNKNOWN":
        gesture = Gesture(label=g["label"], score=g["score"])



    latency = int((time.time() - t0) * 1000)
    return InferResponse(gesture=gesture, detections=detections, latency_ms=latency)


@router.websocket("/ws/infer")
async def ws_infer(ws: WebSocket):
  await ws.accept()

  try:
    while True:
      msg = await ws.receive()

      payload = None
      img = None

      if msg.get("text"):
        payload = json.loads(msg["text"])
        img = b64_to_pil(payload["image_b64"])

      elif msg.get("bytes"):
        # optional: binary jpeg support (if you use it later)
        img = bytes_to_pil(msg["bytes"])
        payload = {"enable_object": True, "enable_gesture": True}

      else:
        await ws.send_text(json.dumps({"error": "empty message"}))
        continue

      enable_object = bool(payload.get("enable_object", True))
      enable_gesture = bool(payload.get("enable_gesture", True))

      # reuse same logic as /infer
      t0 = time.time()

      detections = []
      if enable_object:
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

      gesture = None
      if enable_gesture:
        global gesture_detector
        if gesture_detector is None:
          gesture_detector = MediaPipeGestureDetector(max_hands=1, det_conf=0.5, track_conf=0.5)

        g = gesture_detector.detect(img)
        if g and g["label"] != "UNKNOWN":
          gesture = Gesture(label=g["label"], score=g["score"])

      latency_ms = int((time.time() - t0) * 1000)

      await ws.send_text(InferResponse(
        gesture=gesture,
        detections=detections,
        latency_ms=latency_ms
      ).model_dump_json())

  except WebSocketDisconnect:
    return
