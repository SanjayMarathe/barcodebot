import { useRef, useState, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels'
import {
  Send, Loader2, Package, Circle, StopCircle,
  Scan, Activity, Clock, MessageSquare, Zap
} from 'lucide-react'
import { twMerge } from 'tailwind-merge'

const MIN_RECORD_SECS = 5

const now = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const nowFull = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

// ─── Resize Handle ────────────────────────────────────────────────────────────

function ResizeHandle() {
  return (
    <PanelResizeHandle className="group relative flex items-center justify-center w-1.5 bg-transparent z-20">
      <div className="absolute inset-y-0 -left-2 -right-2 z-10" />
      <div className={twMerge(
        'w-px h-full transition-all duration-200 bg-white/[0.08]',
        'group-hover:bg-cyan-400/30',
        'group-data-[resize-handle-state=drag]:bg-cyan-400/60',
      )} />
    </PanelResizeHandle>
  )
}

// ─── Camera Panel ─────────────────────────────────────────────────────────────

function CameraPanel({ webcamRef, recording, scanning, recordSecs, onToggleRecord }) {
  const canStop = recording && recordSecs >= MIN_RECORD_SECS
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const corners = ['tl', 'tr', 'bl', 'br']
  const cornerClass = (c) => twMerge(
    'absolute w-6 h-6 transition-all duration-300',
    c === 'tl' && 'top-0 left-0 border-t-2 border-l-2',
    c === 'tr' && 'top-0 right-0 border-t-2 border-r-2',
    c === 'bl' && 'bottom-0 left-0 border-b-2 border-l-2',
    c === 'br' && 'bottom-0 right-0 border-b-2 border-r-2',
    recording
      ? 'border-red-400'
      : scanning
        ? 'border-amber-400'
        : 'border-cyan-400/60',
  )

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={{ facingMode: 'environment' }}
        className="absolute inset-0 w-full h-full object-cover"
        mirrored={false}
      />

      {/* subtle vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.65)_100%)] pointer-events-none" />

      {/* top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <div className="flex items-center gap-2">
          <Scan className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] font-mono font-bold tracking-widest text-cyan-400 uppercase">Object Scanner</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-white/40">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
          <div className={twMerge(
            'flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-widest border',
            recording
              ? 'bg-red-500/20 border-red-500/50 text-red-400'
              : scanning
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
          )}>
            <span className={twMerge(
              'w-1.5 h-1.5 rounded-full',
              recording ? 'bg-red-400 animate-pulse' : scanning ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400'
            )} />
            {recording ? `REC ${recordSecs}s` : scanning ? 'Processing' : 'Live'}
          </div>
        </div>
      </div>

      {/* center crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-52 h-52">
          {corners.map(c => <span key={c} className={cornerClass(c)} />)}
          {/* center dot */}
          <span className={twMerge(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full',
            recording ? 'bg-red-400' : scanning ? 'bg-amber-400' : 'bg-cyan-400/50'
          )} />
          {/* scan line animation during recording */}
          {(recording || scanning) && (
            <div className={twMerge(
              'absolute left-0 right-0 h-px opacity-60',
              recording ? 'bg-red-400' : 'bg-amber-400',
              'animate-[scan_2s_ease-in-out_infinite]'
            )} style={{ animation: 'scanline 2s ease-in-out infinite' }} />
          )}
        </div>
      </div>

      {/* bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-5 bg-gradient-to-t from-black/80 to-transparent">
        <button
          onClick={onToggleRecord}
          disabled={scanning || (recording && !canStop)}
          className={twMerge(
            'w-full flex items-center justify-center gap-2.5 py-3 rounded-lg text-[13px] font-semibold tracking-wide transition-all duration-200 border',
            scanning
              ? 'bg-black/40 border-white/10 text-white/30 cursor-not-allowed'
              : recording && !canStop
                ? 'bg-red-950/40 border-red-800/40 text-red-400/50 cursor-not-allowed'
                : recording
                  ? 'bg-red-500/15 border-red-400/50 text-red-300 hover:bg-red-500/25'
                  : 'bg-cyan-500/10 border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/60',
          )}
        >
          {scanning
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with TwelveLabs…</>
            : recording
              ? <><StopCircle className="w-4 h-4" /> {canStop ? 'Stop & Analyze' : `Recording… wait ${MIN_RECORD_SECS - recordSecs}s`}</>
              : <><Circle className="w-4 h-4 fill-red-500 text-red-400" /> Start Recording</>
          }
        </button>
      </div>
    </div>
  )
}

// ─── Detection Event ──────────────────────────────────────────────────────────

function DetectionEvent({ msg }) {
  return (
    <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/20 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border-b border-emerald-500/20">
        <Zap className="w-3 h-3 text-emerald-400 flex-shrink-0" />
        <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-500 uppercase flex-1">Object Detected</span>
        <span className="text-[10px] font-mono text-emerald-600">{msg.time}</span>
      </div>
      <div className="px-3 py-2.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
          <Package className="w-4 h-4 text-emerald-400" />
        </div>
        <p className="text-[15px] font-semibold text-emerald-100 leading-snug">{msg.name}</p>
      </div>
    </div>
  )
}

function BotMessage({ msg }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 mt-0.5">
        <img src="/twelve.jpeg" alt="" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[12px] font-semibold text-gray-300">TwelveLabs</span>
          <span className="text-[10px] font-mono text-gray-600">{msg.time}</span>
        </div>
        <div className="bg-[#15151a] border border-white/[0.09] rounded-xl rounded-tl-sm px-4 py-3 text-[14px] text-gray-200 leading-relaxed">
          {msg.pending
            ? <span className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                Analyzing…
              </span>
            : msg.text
          }
        </div>
      </div>
    </div>
  )
}

function UserMessage({ msg }) {
  return (
    <div className="flex items-start gap-3 flex-row-reverse">
      <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-[11px] font-bold text-white/60">You</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-end gap-2 mb-1.5">
          <span className="text-[10px] font-mono text-gray-600">{msg.time}</span>
        </div>
        <div className="bg-white text-gray-900 text-[14px] leading-relaxed px-4 py-3 rounded-xl rounded-tr-sm font-[450] ml-auto max-w-[88%]">
          {msg.text}
        </div>
      </div>
    </div>
  )
}

function SystemMessage({ msg }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-white/[0.06]" />
      <p className="text-[11px] font-mono text-gray-600 flex-shrink-0 px-1">{msg.text}</p>
      <div className="flex-1 h-px bg-white/[0.06]" />
    </div>
  )
}

// ─── Object Log ───────────────────────────────────────────────────────────────

function ObjectLog({ objects, onQuery }) {
  if (objects.length === 0) return null

  return (
    <div className="flex-shrink-0 border-b border-white/[0.07]">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <Activity className="w-3.5 h-3.5 text-cyan-500" />
        <span className="text-[11px] font-mono font-bold text-cyan-600 uppercase tracking-widest flex-1">Detection Log</span>
        <span className="text-[10px] font-mono text-gray-600 bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded">{objects.length} objects</span>
      </div>
      <div className="px-3 pb-3 flex flex-col gap-1 max-h-36 overflow-y-auto">
        {objects.map(obj => (
          <button
            key={obj.id}
            onClick={() => onQuery(`Tell me more about the ${obj.name}`)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-left bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-cyan-500/20 transition-all group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-[13px] text-gray-300 group-hover:text-white transition-colors flex-1">{obj.name}</span>
            <span className="text-[10px] font-mono text-gray-600 flex-shrink-0">{obj.time}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────

function ChatPanel({ messages, setMessages, objects, scanning }) {
  const [input, setInput] = useState('')
  const [asking, setAsking] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function onSend() {
    const text = input.trim()
    if (!text || asking) return

    const userMsg = { id: Date.now(), role: 'user', text, time: now() }
    const pendingId = Date.now() + 1
    const pendingMsg = { id: pendingId, role: 'bot', text: '', time: now(), pending: true }

    setMessages(prev => [...prev, userMsg, pendingMsg])
    setInput('')
    setAsking(true)

    try {
      const res = await fetch('http://localhost:8000/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      })
      const data = await res.json()
      setMessages(prev => prev.map(m =>
        m.id === pendingId ? { ...m, pending: false, text: data.answer, time: now() } : m
      ))
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === pendingId ? { ...m, pending: false, text: 'Could not reach backend.', time: now() } : m
      ))
    } finally {
      setAsking(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() }
  }

  return (
    <div className="flex flex-col h-full bg-[#0c0c0f]">

      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.07] bg-[#0e0e12]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/15">
              <img src="/twelve.jpeg" alt="TwelveLabs" className="w-full h-full object-cover" />
            </div>
            <span className={twMerge(
              'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0e0e12]',
              scanning ? 'bg-amber-400' : 'bg-emerald-400'
            )} />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-white leading-none">TwelveLabs</p>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-none font-mono">Video Intelligence · Pegasus 1.2</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {scanning ? (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-md">
                <Loader2 className="w-3 h-3 animate-spin" />
                Processing clip
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Ready
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Object Log */}
      <ObjectLog objects={objects} onQuery={q => { setInput(q); textareaRef.current?.focus() }} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-5 pb-4 flex flex-col gap-5">
          {messages.map(msg => {
            if (msg.variant === 'system') return <SystemMessage key={msg.id} msg={msg} />
            if (msg.variant === 'detection') return <DetectionEvent key={msg.id} msg={msg} />
            if (msg.role === 'user') return <UserMessage key={msg.id} msg={msg} />
            return <BotMessage key={msg.id} msg={msg} />
          })}
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-4 pt-3 border-t border-white/[0.07]">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-3 h-3 text-gray-600" />
          <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Ask the analyst</span>
        </div>
        <div className={twMerge(
          'rounded-xl border transition-all duration-150',
          asking ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-[#15151a] border-white/[0.12] focus-within:border-cyan-500/40 focus-within:bg-[#17171d]'
        )}>
          <textarea
            ref={textareaRef}
            rows={3}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about what's in the scene, detected objects, or request analysis…"
            disabled={asking}
            className="w-full bg-transparent text-[14px] text-gray-100 placeholder-gray-600 outline-none resize-none leading-relaxed px-4 pt-3 pb-2 block"
          />
          <div className="flex items-center justify-between px-3 pb-2.5">
            <span className="text-[10px] font-mono text-gray-700">Enter to send · Shift+Enter for newline</span>
            <button
              onClick={onSend}
              disabled={!input.trim() || asking}
              className={twMerge(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
                input.trim() && !asking
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 hover:border-cyan-400/60'
                  : 'bg-white/[0.05] border border-white/[0.08] text-gray-600 cursor-default',
              )}
            >
              {asking
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Sending</>
                : <><Send className="w-3 h-3" /> Send</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

const WELCOME = {
  id: 0,
  role: 'bot',
  variant: 'system',
  text: `Session started · ${now()}`,
  time: now(),
}

export default function App() {
  const webcamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const recordStartRef = useRef(null)
  const timerRef = useRef(null)

  const [messages, setMessages] = useState([WELCOME])
  const [objects, setObjects] = useState([])
  const [recording, setRecording] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [recordSecs, setRecordSecs] = useState(0)

  function handleToggleRecord() {
    if (scanning) return

    if (!recording) {
      const stream = webcamRef.current?.stream
      if (!stream) return

      chunksRef.current = []
      const mr = new MediaRecorder(stream, { mimeType: 'video/webm' })
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = handleRecordingStop
      mr.start()
      mediaRecorderRef.current = mr
      recordStartRef.current = Date.now()
      setRecordSecs(0)
      setRecording(true)
      timerRef.current = setInterval(() => {
        setRecordSecs(Math.floor((Date.now() - recordStartRef.current) / 1000))
      }, 500)
    } else {
      const elapsed = (Date.now() - recordStartRef.current) / 1000
      if (elapsed < MIN_RECORD_SECS) return
      clearInterval(timerRef.current)
      mediaRecorderRef.current?.stop()
      setRecording(false)
    }
  }

  useEffect(() => () => clearInterval(timerRef.current), [])

  function handleRecordingStop() {
    const blob = new Blob(chunksRef.current, { type: 'video/webm' })
    const reader = new FileReader()
    reader.onloadend = () => sendClip(reader.result)
    reader.readAsDataURL(blob)
  }

  async function sendClip(videoBase64) {
    setScanning(true)
    try {
      const res = await fetch('http://localhost:8000/record-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_base64: videoBase64 }),
      })
      const data = await res.json()

      if (res.status === 429) {
        setMessages(prev => [...prev, {
          id: Date.now(), role: 'bot', variant: 'system', time: now(),
          text: `Rate limited · retry in ${Math.round((data.retry_after || 3600) / 60)}m`,
        }])
        return
      }

      if (!res.ok) {
        setMessages(prev => [...prev, {
          id: Date.now(), role: 'bot', variant: 'system', time: now(),
          text: `Error: ${data.error || 'Unknown error'}`,
        }])
        return
      }

      const detectedObjects = data.objects || []
      if (detectedObjects.length === 0) {
        setMessages(prev => [...prev, {
          id: Date.now(), role: 'bot', variant: 'system', time: now(),
          text: 'No objects detected · try holding items closer',
        }])
        return
      }

      const ts = now()
      detectedObjects.forEach((name, i) => {
        const id = Date.now() + i
        setObjects(prev => [...prev, { id, name, time: ts }])
        setMessages(prev => [...prev, {
          id: id + 1000, role: 'bot', variant: 'detection', name, time: ts,
        }])
      })
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'bot', variant: 'system', time: now(),
        text: 'Could not reach backend',
      }])
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="w-full h-full bg-[#080809] flex flex-col">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center gap-4 px-5 py-2.5 border-b border-white/[0.07] bg-[#0a0a0d]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <Scan className="w-3 h-3 text-cyan-400" />
          </div>
          <span className="text-[13px] font-bold text-white tracking-tight">BarcodeBot</span>
          <span className="text-[10px] font-mono text-gray-600 bg-white/[0.04] border border-white/[0.07] px-1.5 py-0.5 rounded">v1.0</span>
        </div>
        <div className="h-4 w-px bg-white/[0.08]" />
        <span className="text-[11px] font-mono text-gray-600">Powered by TwelveLabs Pegasus 1.2 · Claude Haiku</span>
        <div className="ml-auto flex items-center gap-2">
          <Clock className="w-3 h-3 text-gray-600" />
          <LiveClock />
        </div>
      </div>

      {/* Main panels */}
      <div className="flex-1 min-h-0">
        <PanelGroup direction="horizontal" className="w-full h-full">
          <Panel defaultSize={62} minSize={30}>
            <CameraPanel
              webcamRef={webcamRef}
              recording={recording}
              scanning={scanning}
              recordSecs={recordSecs}
              onToggleRecord={handleToggleRecord}
            />
          </Panel>
          <ResizeHandle />
          <Panel defaultSize={38} minSize={24}>
            <ChatPanel
              messages={messages}
              setMessages={setMessages}
              objects={objects}
              scanning={scanning}
            />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  )
}

function LiveClock() {
  const [time, setTime] = useState(nowFull())
  useEffect(() => {
    const t = setInterval(() => setTime(nowFull()), 1000)
    return () => clearInterval(t)
  }, [])
  return <span className="text-[11px] font-mono text-gray-500">{time}</span>
}
