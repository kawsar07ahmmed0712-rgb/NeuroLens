def _is_finger_up(lm, tip, pip):
  # y ছোট মানে উপরে (mediapipe normalized coords)
  return lm[tip].y < lm[pip].y

def _is_thumb_up(lm, handedness):
  tip = lm[4]
  ip = lm[3]

  if handedness == "Right":
    return tip.x < ip.x
  if handedness == "Left":
    return tip.x > ip.x

  # handedness না পেলে fallback
  return abs(tip.x - ip.x) > 0.04

def classify_gesture(lm, handedness=None):
  index_up = _is_finger_up(lm, 8, 6)
  middle_up = _is_finger_up(lm, 12, 10)
  ring_up = _is_finger_up(lm, 16, 14)
  pinky_up = _is_finger_up(lm, 20, 18)
  thumb_up = _is_thumb_up(lm, handedness)

  fingers_up = [index_up, middle_up, ring_up, pinky_up]
  up_count = sum(1 for f in fingers_up if f)

  # HELP = open palm (চার আঙুল up)
  if up_count == 4:
    return ("HELP", 0.92)

  # FIST = সব আঙুল folded
  if up_count == 0 and not thumb_up:
    return ("FIST", 0.90)

  # THUMBS_UP = thumb up, বাকিগুলো down
  if thumb_up and up_count == 0:
    return ("THUMBS_UP", 0.90)

  return ("UNKNOWN", 0.55)
