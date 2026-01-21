import { useEffect, useRef } from 'react'

export default function WebcamOverlay() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    let stream
    const start = async () => {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      videoRef.current.srcObject = stream
    }
    start()
    return () => stream && stream.getTracks().forEach(t => t.stop())
  }, [])

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const onReady = () => {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const loop = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Demo box (পরের মাইলস্টোনে backend থেকে আসবে)
        ctx.strokeRect(80, 60, 220, 260)
        ctx.font = '18px Arial'
        ctx.fillText('person 0.88', 80, 50)

        // Demo gesture label
        ctx.font = '24px Arial'
        ctx.fillText('GESTURE: HELP (0.93)', 20, canvas.height - 20)

        requestAnimationFrame(loop)
      }
      loop()
    }

    video.addEventListener('loadedmetadata', onReady)
    return () => video.removeEventListener('loadedmetadata', onReady)
  }, [])

  return (
    <div style={{ position: 'relative', width: 720, maxWidth: '100%' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: '100%', borderRadius: 12 }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      />
    </div>
  )
}
