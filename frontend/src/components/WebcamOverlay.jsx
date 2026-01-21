import { useEffect, useRef, useState } from 'react'

const API_URL = 'http://localhost:8000'

export default function WebcamOverlay() {
  const videoRef = useRef(null)
  const overlayCanvasRef = useRef(null)
  const grabCanvasRef = useRef(null)

  const [err, setErr] = useState('')
  const [latency, setLatency] = useState(null)

  // latest inference result (avoid re-render loop issues)
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
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        })

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

  // 2) SEND FRAMES TO BACKEND (POLLING)
  useEffect(() => {
    let timerId = null

    const sendFrame = async () => {
      const video = videoRef.current
      const grab = grabCanvasRef.current

      if (!video || !grab) return
      if (video.readyState < 2) return // video not ready

      // set grab canvas same as video size
      grab.width = video.videoWidth
      grab.height = video.videoHeight

      const gctx = grab.getContext('2d')
      gctx.drawImage(video, 0, 0, grab.width, grab.height)

      const image_b64 = grab.toDataURL('image/jpeg', 0.7)

      try {
        const res = await fetch(`${API_URL}/infer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_b64 })
        })

        const data = await res.json()

        resultRef.current = data
        setLatency(data.latency_ms ?? null)
        setErr('')
      } catch (e) {
        setErr(`API error: ${e.message}`)
      }
    }

    // ~3 FPS (smooth enough + light)
    timerId = setInterval(sendFrame, 300)

    return () => {
      if (timerId) clearInterval(timerId)
    }
  }, [])

  // 3) DRAW OVERLAY (BOX + GESTURE TEXT)
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

        // draw detections
        if (result?.detections?.length) {
          result.detections.forEach(d => {
            const w = d.x2 - d.x1
            const h = d.y2 - d.y1

            ctx.strokeRect(d.x1, d.y1, w, h)
            ctx.font = '18px Arial'
            ctx.fillText(`${d.label} ${Number(d.score).toFixed(2)}`, d.x1, Math.max(18, d.y1 - 10))
          })
        }

        // draw gesture label
        if (result?.gesture) {
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

    return () => {
      video.removeEventListener('loadedmetadata', onReady)
    }
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 8, opacity: 0.85 }}>
        {err ? `❌ ${err}` : latency !== null ? `✅ backend latency: ${latency}ms` : '…'}
      </div>

      <div style={{ position: 'relative', width: 720, maxWidth: '100%' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ width: '100%', borderRadius: 12 }}
        />

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

        {/* hidden canvas used for grabbing frames */}
        <canvas ref={grabCanvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  )
}
