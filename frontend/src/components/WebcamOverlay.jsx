import { useEffect, useRef, useState } from 'react'

const WS_URL = 'ws://localhost:8000/ws/infer'

export default function WebcamOverlay() {
  const videoRef = useRef(null)
  const overlayCanvasRef = useRef(null)
  const grabCanvasRef = useRef(null)
  const wsRef = useRef(null)

  const [err, setErr] = useState('')
  const [latency, setLatency] = useState(null)
  const [wsStatus, setWsStatus] = useState('DISCONNECTED')

  const [enableObject, setEnableObject] = useState(true)
  const [enableGesture, setEnableGesture] = useState(true)

  const lastSpokenRef = useRef(0)
  const lastGestureRef = useRef('')

  const resultRef = useRef({
    gesture: null,
    detections: [],
    latency_ms: 0
  })

  // 1) START CAMERA
  useEffect(() => {
    let stream

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        const video = videoRef.current
        video.srcObject = stream

        video.onloadedmetadata = async () => {
          try {
            await video.play()
          } catch (e) {
            setErr(`video.play failed: ${e.message}`)
          }
        }
      } catch (e) {
        setErr(`Camera error: ${e.name} - ${e.message}`)
      }
    }

    startCamera()

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop())
    }
  }, [])

  // 2) CONNECT WEBSOCKET
  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setWsStatus('CONNECTED')
      setErr('')
    }

    ws.onclose = () => {
      setWsStatus('DISCONNECTED')
    }

    ws.onerror = () => {
      setWsStatus('ERROR')
      setErr('WebSocket error')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        resultRef.current = data
        setLatency(data.latency_ms ?? null)

        // VOICE ALERT (HELP)
        const g = data?.gesture?.label || ''
        const score = Number(data?.gesture?.score || 0)

        const now = Date.now()
        const cooldownOk = now - lastSpokenRef.current > 2000

        if (g === 'HELP' && score >= 0.8 && cooldownOk && lastGestureRef.current !== 'HELP') {
          const u = new SpeechSynthesisUtterance('Help detected')
          window.speechSynthesis.speak(u)
          lastSpokenRef.current = now
        }

        lastGestureRef.current = g
      } catch (e) {
        setErr(`Bad WS message: ${e.message}`)
      }
    }

    return () => {
      try {
        ws.close()
      } catch {}
    }
  }, [])

  // 3) SEND FRAMES TO WS (INTERVAL)
  useEffect(() => {
    let timerId = null

    const sendFrame = async () => {
      const video = videoRef.current
      const grab = grabCanvasRef.current
      const ws = wsRef.current

      if (!video || !grab || !ws) return
      if (ws.readyState !== 1) return
      if (video.readyState < 2) return

      grab.width = video.videoWidth
      grab.height = video.videoHeight

      const gctx = grab.getContext('2d')
      gctx.drawImage(video, 0, 0, grab.width, grab.height)

      const image_b64 = grab.toDataURL('image/jpeg', 0.7)

      ws.send(JSON.stringify({
        image_b64,
        enable_object: enableObject,
        enable_gesture: enableGesture
      }))
    }

    timerId = setInterval(sendFrame, 250) // ~4 FPS
    return () => timerId && clearInterval(timerId)
  }, [enableObject, enableGesture])

  // 4) DRAW OVERLAY
  useEffect(() => {
    const video = videoRef.current
    const canvas = overlayCanvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d')

    const onReady = () => {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const loop = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const result = resultRef.current

        if (enableObject && result?.detections?.length) {
          result.detections.forEach(d => {
            const w = d.x2 - d.x1
            const h = d.y2 - d.y1
            ctx.strokeRect(d.x1, d.y1, w, h)
            ctx.font = '18px Arial'
            ctx.fillText(`${d.label} ${Number(d.score).toFixed(2)}`, d.x1, Math.max(18, d.y1 - 10))
          })
        }

        if (enableGesture && result?.gesture) {
          ctx.font = '24px Arial'
          ctx.fillText(
            `GESTURE: ${result.gesture.label} (${Number(result.gesture.score).toFixed(2)})`,
            20,
            canvas.height - 20
          )
        }

        requestAnimationFrame(loop)
      }

      loop()
    }

    video.addEventListener('loadedmetadata', onReady)
    return () => video.removeEventListener('loadedmetadata', onReady)
  }, [enableObject, enableGesture])

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
        <label>
          <input
            type="checkbox"
            checked={enableObject}
            onChange={(e) => setEnableObject(e.target.checked)}
          /> Object
        </label>

        <label>
          <input
            type="checkbox"
            checked={enableGesture}
            onChange={(e) => setEnableGesture(e.target.checked)}
          /> Gesture
        </label>

        <span style={{ opacity: 0.85 }}>
          WS: {wsStatus} {latency !== null ? `| ${latency}ms` : ''}
        </span>

        {err ? <span style={{ color: 'crimson' }}>❌ {err}</span> : null}
      </div>

      <div style={{ position: 'relative', width: 720, maxWidth: '100%' }}>
        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 12 }} />

        <canvas
          ref={overlayCanvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}
        />

        <canvas ref={grabCanvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  )
}
