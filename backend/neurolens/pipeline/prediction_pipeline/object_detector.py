from ultralytics import YOLO

class YoloDetector:
  def __init__(self, model_path: str = "yolov8n.pt", conf: float = 0.35):
    self.model_path = model_path
    self.conf = conf
    self._model = None

  def _load(self):
    if self._model is None:
      self._model = YOLO(self.model_path)
    return self._model

  def detect(self, pil_img):
    model = self._load()


    results = model.predict(pil_img, conf=self.conf, imgsz=640, verbose=False)

    dets = []
    if not results:
      return dets

    r = results[0]
    names = r.names  

    if r.boxes is None:
      return dets

    for b in r.boxes:
      x1, y1, x2, y2 = b.xyxy[0].tolist()
      cls_id = int(b.cls[0].item())
      score = float(b.conf[0].item())

      dets.append({
        "label": names.get(cls_id, str(cls_id)),
        "score": score,
        "x1": int(x1),
        "y1": int(y1),
        "x2": int(x2),
        "y2": int(y2)
      })

    return dets
