import threading
import numpy as np
import mediapipe as mp

from neurolens.utils.gesture_rules import classify_gesture

class MediaPipeGestureDetector:
  def __init__(self, max_hands=1, det_conf=0.5, track_conf=0.5):
    self._lock = threading.Lock()
    self._hands = mp.solutions.hands.Hands(
      static_image_mode=False,
      max_num_hands=max_hands,
      model_complexity=0,
      min_detection_confidence=det_conf,
      min_tracking_confidence=track_conf
    )

  def detect(self, pil_img):
    rgb = np.array(pil_img)  # PIL RGB -> numpy RGB

    with self._lock:
      res = self._hands.process(rgb)

    if not res.multi_hand_landmarks:
      return None

    lm = res.multi_hand_landmarks[0].landmark

    handedness = None
    if res.multi_handedness:
      handedness = res.multi_handedness[0].classification[0].label

    label, score = classify_gesture(lm, handedness)
    return {"label": label, "score": score}
