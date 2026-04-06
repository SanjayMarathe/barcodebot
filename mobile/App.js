import { useRef, useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, SafeAreaView, StatusBar, ActivityIndicator,
  KeyboardAvoidingView, Platform, Modal, Dimensions,
} from 'react-native'
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera'
import * as FileSystem from 'expo-file-system/legacy'
import * as WebBrowser from 'expo-web-browser'
import { Video, ResizeMode } from 'expo-av'

// ── Config ────────────────────────────────────────────────────────────────────
const BACKEND = 'https://unconfirmatory-kenia-trigonally.ngrok-free.dev'
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
const MIN_RECORD_SECS = 5

const now = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  bg: '#08080a',
  surface: '#0e0e12',
  card: '#14141a',
  border: 'rgba(255,255,255,0.08)',
  borderBright: 'rgba(255,255,255,0.14)',
  cyan: '#22d3ee',
  cyanDim: 'rgba(34,211,238,0.15)',
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.12)',
  red: '#f87171',
  redDim: 'rgba(248,113,113,0.12)',
  amber: '#fbbf24',
  amberDim: 'rgba(251,191,36,0.12)',
  violet: '#a78bfa',
  violetDim: 'rgba(167,139,250,0.12)',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#475569',
  textDim: '#334155',
}

// ── Live Clock ─────────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(now())
  useEffect(() => {
    const t = setInterval(() => setTime(now()), 1000)
    return () => clearInterval(t)
  }, [])
  return <Text style={s.clockText}>{time}</Text>
}

// ── Video Modal ────────────────────────────────────────────────────────────────
function VideoModal({ visible, uri, onClose }) {
  const videoRef = useRef(null)
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.videoOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.videoCard}>
          <View style={s.videoCardHeader}>
            <Text style={s.videoCardTitle}>RECORDED CLIP</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={s.videoCardClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {uri ? (
            <Video
              ref={videoRef}
              source={{ uri }}
              style={s.videoPlayer}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              useNativeControls
            />
          ) : (
            <View style={s.videoPlaceholder}>
              <Text style={s.videoPlaceholderText}>Video unavailable</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

// ── Detection Card ─────────────────────────────────────────────────────────────
function DetectionCard({ item, onPress }) {
  return (
    <TouchableOpacity style={s.detectionCard} onPress={() => onPress?.(item)} activeOpacity={0.75}>
      <View style={s.detectionHeader}>
        <Text style={s.detectionTime}>{item.time}</Text>
        <View style={s.detectionDot} />
        <Text style={s.detectionLabel}>OBJECT DETECTED</Text>
        {item.videoUri && <Text style={s.detectionPlayHint}>▶ tap to play</Text>}
      </View>
      <Text style={s.detectionName}>{item.name}</Text>
    </TouchableOpacity>
  )
}

// ── Chat Message ───────────────────────────────────────────────────────────────
function ChatMessage({ msg, onDetectionPress }) {
  if (msg.variant === 'system') {
    return (
      <View style={s.systemMsgRow}>
        <View style={s.systemLine} />
        <Text style={s.systemMsgText}>{msg.text}</Text>
        <View style={s.systemLine} />
      </View>
    )
  }
  if (msg.variant === 'detection') return <DetectionCard item={msg} onPress={onDetectionPress} />
  if (msg.role === 'user') {
    return (
      <View style={s.userMsgRow}>
        <View style={s.userBubble}>
          <Text style={s.userBubbleText}>{msg.text}</Text>
        </View>
        <Text style={s.msgTime}>{msg.time}</Text>
      </View>
    )
  }
  return (
    <View style={s.botMsgRow}>
      <View style={s.botAvatar}>
        <Text style={s.botAvatarText}>TL</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.botBubble}>
          {msg.pending
            ? <View style={s.pendingRow}><ActivityIndicator size="small" color={C.textMuted} /><Text style={s.pendingText}>Analyzing…</Text></View>
            : <Text style={s.botBubbleText}>{msg.text}</Text>
          }
        </View>
        <Text style={s.msgTime}>{msg.time}</Text>
      </View>
    </View>
  )
}

// ── Load Funds Modal ──────────────────────────────────────────────────────────
function LoadFundsModal({ visible, onClose, onLoad, loading }) {
  const [custom, setCustom] = useState('')

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.modalCard}>
          <Text style={s.modalTitle}>Load Shopping Budget</Text>
          <Text style={s.modalSub}>Funds authorized via Stripe · test mode</Text>

          <View style={s.presetRow}>
            {[1000, 2500, 5000].map(cents => (
              <TouchableOpacity
                key={cents}
                style={s.presetBtn}
                onPress={() => !loading && onLoad(cents)}
                disabled={loading}
              >
                <Text style={s.presetBtnText}>${cents / 100}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.customRow}>
            <Text style={s.customLabel}>$</Text>
            <TextInput
              style={s.customInput}
              value={custom}
              onChangeText={setCustom}
              placeholder="Custom amount"
              placeholderTextColor={C.textDim}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[s.customBtn, custom && !loading ? s.customBtnActive : s.customBtnInactive]}
              onPress={() => {
                const cents = Math.round(parseFloat(custom || '0') * 100)
                if (cents >= 100) onLoad(cents)
              }}
              disabled={!custom || loading}
            >
              <Text style={[s.customBtnText, custom ? { color: C.cyan } : { color: C.textDim }]}>Load</Text>
            </TouchableOpacity>
          </View>

          {loading && <ActivityIndicator color={C.cyan} style={{ marginTop: 16 }} />}

          <Text style={s.stripeNote}>Test card: 4242 4242 4242 4242  ·  Any exp/CVC</Text>
        </View>
      </View>
    </Modal>
  )
}

// ── Buy Card ──────────────────────────────────────────────────────────────────
function BuyCard({ objects, balance, buyPrices, setBuyPrices, onBuy, buying, onClose }) {
  return (
    <View style={s.buyCard}>
      <View style={s.buyCardHeader}>
        <Text style={s.buyCardTitle}>BUY DETECTED ITEMS</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.buyCardClose}>✕</Text>
        </TouchableOpacity>
      </View>

      {objects.slice(0, 5).map(obj => (
        <View key={obj.id} style={s.buyItemRow}>
          <Text style={s.buyItemName} numberOfLines={1}>{obj.name}</Text>
          <View style={s.buyPriceBox}>
            <Text style={s.buyPriceLabel}>$</Text>
            <TextInput
              style={s.buyPriceInput}
              value={buyPrices[obj.name] || ''}
              onChangeText={v => setBuyPrices(prev => ({ ...prev, [obj.name]: v }))}
              placeholder="50"
              placeholderTextColor={C.textDim}
              keyboardType="numeric"
            />
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[s.buyNowBtn, balance && !buying ? s.buyNowBtnActive : s.buyNowBtnDisabled]}
        onPress={onBuy}
        disabled={!balance || buying}
      >
        {buying
          ? <><ActivityIndicator size="small" color={C.amber} /><Text style={[s.buyNowBtnText, { color: C.amber, marginLeft: 8 }]}>Ordering…</Text></>
          : <Text style={[s.buyNowBtnText, balance ? { color: C.emerald } : { color: C.textDim }]}>
              {balance ? `Buy Now · ${balance.amount.toFixed(2)} budget` : 'Load Funds First'}
            </Text>
        }
      </TouchableOpacity>
    </View>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [camPerm, requestCamPerm] = useCameraPermissions()
  const [micPerm, requestMicPerm] = useMicrophonePermissions()
  const cameraRef = useRef(null)
  const scrollRef = useRef(null)
  const timerRef = useRef(null)
  const recordStartRef = useRef(null)
  const pollRef = useRef(null)

  const [recording, setRecording] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [recordSecs, setRecordSecs] = useState(0)
  const [objects, setObjects] = useState([])
  const [messages, setMessages] = useState([{
    id: 0, variant: 'system', text: `Session started · ${now()}`, time: now(),
  }])
  const [input, setInput] = useState('')
  const [asking, setAsking] = useState(false)

  // ── Video playback state ──────────────────────────────────────────────────
  const [videoModal, setVideoModal] = useState({ visible: false, uri: null })

  // ── Payment state ─────────────────────────────────────────────────────────
  const [balance, setBalance] = useState(null)       // { amount: number, session_id: string }
  const [showLoadFunds, setShowLoadFunds] = useState(false)
  const [loadingFunds, setLoadingFunds] = useState(false)
  const [buyPrices, setBuyPrices] = useState({})     // { objectName: priceString }
  const [showBuyCard, setShowBuyCard] = useState(false)
  const [buying, setBuying] = useState(false)

  const canStop = recording && recordSecs >= MIN_RECORD_SECS

  useEffect(() => () => {
    clearInterval(timerRef.current)
    clearInterval(pollRef.current)
  }, [])

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }, [messages])

  function addSystem(text) {
    setMessages(prev => [...prev, { id: Date.now(), variant: 'system', text, time: now() }])
  }

  // ── Load Funds ────────────────────────────────────────────────────────────
  async function handleLoadFunds(cents) {
    setLoadingFunds(true)
    try {
      const res = await fetch(`${BACKEND}/create-checkout`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ amount_cents: cents }),
      })
      const data = await res.json()
      if (!res.ok) {
        addSystem(`Checkout error: ${data.detail || data.error || 'Unknown'}`)
        return
      }

      await WebBrowser.openBrowserAsync(data.checkout_url)

      // After browser closes, verify session status
      const vRes = await fetch(`${BACKEND}/stripe-session-status/${data.session_id}`, { headers: HEADERS })
      const vData = await vRes.json()
      if (vData.status === 'paid') {
        const amount = cents / 100
        setBalance({ amount, session_id: data.session_id })
        setShowLoadFunds(false)
        addSystem(`💳 $${amount.toFixed(2)} loaded · ready to buy`)
      } else {
        addSystem('Payment not completed — try again')
      }
    } catch (e) {
      addSystem(`Load funds error: ${e?.message || String(e)}`)
    } finally {
      setLoadingFunds(false)
    }
  }

  // ── Buy Now ────────────────────────────────────────────────────────────────
  async function handleBuyNow() {
    if (!balance || buying || objects.length === 0) return
    setBuying(true)
    setShowBuyCard(false)

    try {
      const res = await fetch(`${BACKEND}/trigger-buy`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          objects: objects.map(o => o.name),
          prices: buyPrices,
          stripe_session_id: balance.session_id,
          total_budget: balance.amount,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        addSystem(`Buy error: ${data.detail || data.error || 'Unknown'}`)
        setBuying(false)
        return
      }

      const runId = data.run_id
      addSystem(`🛒 Shopping run started · ${runId.slice(0, 8)}…`)

      // Poll every 3s
      pollRef.current = setInterval(async () => {
        try {
          const sr = await fetch(`${BACKEND}/runs/${runId}`, { headers: HEADERS })
          if (!sr.ok) return
          const sd = await sr.json()

          if (sd.status === 'completed' || sd.status === 'failed') {
            clearInterval(pollRef.current)
            setBuying(false)

            if (sd.status === 'completed') {
              const spent = sd.total_spent || 0
              setBalance(prev => prev ? { ...prev, amount: Math.max(0, prev.amount - spent) } : null)
              const results = sd.results || []
              if (results.length === 0) {
                addSystem('Run completed — no items processed')
              } else {
                results.forEach(r => {
                  const ok = r.status === 'success'
                  const price = ok ? ` · $${Number(r.final_price || 0).toFixed(2)}` : ''
                  const err = !ok && r.error ? ` · ${r.error}` : ''
                  addSystem(`${ok ? '✓' : '✗'} ${r.item_name}${price}${err}`)
                })
              }
            } else {
              addSystem(`Run failed — ${sd.error || 'unknown error'}`)
            }
          }
        } catch (_) {
          // ignore poll errors silently
        }
      }, 3000)
    } catch (e) {
      addSystem(`Buy error: ${e?.message || String(e)}`)
      setBuying(false)
    }
  }

  // ── Record / scan ──────────────────────────────────────────────────────────
  async function handleToggleRecord() {
    if (scanning) return

    if (!recording) {
      if (!camPerm?.granted) { await requestCamPerm(); return }
      if (!micPerm?.granted) { await requestMicPerm(); return }

      setRecordSecs(0)
      setRecording(true)
      recordStartRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setRecordSecs(Math.floor((Date.now() - recordStartRef.current) / 1000))
      }, 500)

      cameraRef.current?.recordAsync({ maxDuration: 120 }).then(result => {
        if (result?.uri) sendClip(result.uri)
      }).catch(e => {
        console.log('record error', e)
        setRecording(false)
        clearInterval(timerRef.current)
      })
    } else {
      if (!canStop) return
      clearInterval(timerRef.current)
      setRecording(false)
      cameraRef.current?.stopRecording()
    }
  }

  async function sendClip(uri) {
    setScanning(true)
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
      const res = await fetch(`${BACKEND}/record-scan`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ video_base64: `data:video/mp4;base64,${base64}` }),
      })
      const data = await res.json()

      if (res.status === 429) {
        addSystem(`Rate limited · retry in ${Math.round((data.retry_after || 3600) / 60)}m`)
        return
      }
      if (!res.ok) {
        addSystem(`Error: ${data.error || 'Unknown error'}`)
        return
      }

      const detected = data.objects || []
      if (detected.length === 0) {
        addSystem('No objects detected · try holding items closer')
        return
      }

      const ts = now()
      detected.forEach((name, i) => {
        const id = Date.now() + i
        setObjects(prev => [...prev, { id, name, time: ts, videoUri: uri }])
        setMessages(prev => [...prev, { id: id + 1000, variant: 'detection', name, time: ts, videoUri: uri }])
      })
    } catch (e) {
      addSystem(`Network error: ${e?.message || String(e)}`)
    } finally {
      setScanning(false)
    }
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || asking) return

    const userMsg = { id: Date.now(), role: 'user', text, time: now() }
    const pendingId = Date.now() + 1
    setMessages(prev => [...prev, userMsg, { id: pendingId, role: 'bot', text: '', time: now(), pending: true }])
    setInput('')
    setAsking(true)

    try {
      const res = await fetch(`${BACKEND}/ask`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ question: text }),
      })
      const data = await res.json()
      setMessages(prev => prev.map(m =>
        m.id === pendingId ? { ...m, pending: false, text: data.answer, time: now() } : m
      ))
    } catch (e) {
      setMessages(prev => prev.map(m =>
        m.id === pendingId ? { ...m, pending: false, text: `Network error: ${e?.message || String(e)}`, time: now() } : m
      ))
    } finally {
      setAsking(false)
    }
  }

  if (!camPerm) return <View style={s.root} />

  if (!camPerm.granted) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.permScreen}>
          <Text style={s.permTitle}>Camera Access Required</Text>
          <Text style={s.permSub}>Kaimon needs camera access to record and analyze objects.</Text>
          <TouchableOpacity style={s.permBtn} onPress={requestCamPerm}>
            <Text style={s.permBtnText}>Grant Camera Access</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const statusColor = recording ? C.red : scanning ? C.amber : C.cyan
  const statusBg = recording ? C.redDim : scanning ? C.amberDim : C.cyanDim
  const statusLabel = recording ? `REC ${recordSecs}s` : scanning ? 'Processing' : 'Live'

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Video playback modal */}
      <VideoModal
        visible={videoModal.visible}
        uri={videoModal.uri}
        onClose={() => setVideoModal({ visible: false, uri: null })}
      />

      {/* Load Funds modal */}
      <LoadFundsModal
        visible={showLoadFunds}
        onClose={() => setShowLoadFunds(false)}
        onLoad={handleLoadFunds}
        loading={loadingFunds}
      />

      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.topBarLeft}>
          <View style={s.logoBox}>
            <Text style={s.logoIcon}>⬡</Text>
          </View>
          <Text style={s.appName}>Kaimon</Text>
          <View style={s.versionBadge}><Text style={s.versionText}>v1.0</Text></View>
        </View>
        <View style={s.topBarRight}>
          {balance ? (
            <TouchableOpacity style={s.balanceChip} onPress={() => setShowLoadFunds(true)}>
              <Text style={s.balanceText}>💳 ${balance.amount.toFixed(2)}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.loadFundsBtn} onPress={() => setShowLoadFunds(true)}>
              <Text style={s.loadFundsText}>Load Funds</Text>
            </TouchableOpacity>
          )}
          <LiveClock />
        </View>
      </View>

      {/* Camera */}
      <View style={s.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="video"
        />

        {/* Top overlay */}
        <View style={s.cameraTopOverlay}>
          <Text style={s.cameraTitleText}>TwelveLabs · Pegasus 1.2</Text>
          <View style={[s.statusBadge, { backgroundColor: statusBg, borderColor: statusColor + '60' }]}>
            <View style={[s.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Corner brackets */}
        <View style={s.bracketsContainer}>
          {[
            { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
            { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
            { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
            { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
          ].map((style, i) => (
            <View key={i} style={[s.bracket, style, { borderColor: statusColor }]} />
          ))}
        </View>

        {/* Record button */}
        <View style={s.cameraBottomOverlay}>
          <TouchableOpacity
            style={[
              s.recordBtn,
              recording && canStop ? s.recordBtnActive :
              recording ? s.recordBtnWaiting :
              scanning ? s.recordBtnDisabled : s.recordBtnIdle,
            ]}
            onPress={handleToggleRecord}
            disabled={scanning || (recording && !canStop)}
            activeOpacity={0.8}
          >
            {scanning
              ? <><ActivityIndicator size="small" color={C.amber} /><Text style={[s.recordBtnText, { color: C.amber }]}> Analyzing…</Text></>
              : recording
                ? <Text style={[s.recordBtnText, { color: canStop ? C.red : C.textMuted }]}>
                    {canStop ? '⏹  Stop & Analyze' : `Hold… ${MIN_RECORD_SECS - recordSecs}s`}
                  </Text>
                : <Text style={[s.recordBtnText, { color: C.cyan }]}>⏺  Start Recording</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* Detection log */}
      {objects.length > 0 && (
        <View style={s.objectLog}>
          <View style={s.objectLogHeader}>
            <Text style={s.objectLogTitle}>DETECTION LOG</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                style={[s.buyTheseBtn, buying && { opacity: 0.5 }]}
                onPress={() => setShowBuyCard(v => !v)}
                disabled={buying}
              >
                <Text style={s.buyTheseBtnText}>{buying ? '🛒 Buying…' : '🛒 Buy These?'}</Text>
              </TouchableOpacity>
              <Text style={s.objectLogCount}>{objects.length} objects</Text>
            </View>
          </View>

          {/* Buy card */}
          {showBuyCard && (
            <BuyCard
              objects={objects}
              balance={balance}
              buyPrices={buyPrices}
              setBuyPrices={setBuyPrices}
              onBuy={handleBuyNow}
              buying={buying}
              onClose={() => setShowBuyCard(false)}
            />
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.objectLogScroll}>
            {objects.map(obj => (
              <TouchableOpacity
                key={obj.id}
                style={s.objectChip}
                onPress={() => obj.videoUri
                  ? setVideoModal({ visible: true, uri: obj.videoUri })
                  : setInput(`Tell me more about the ${obj.name}`)
                }
              >
                <Text style={s.objectChipTime}>{obj.time}</Text>
                <View style={s.objectChipDot} />
                <Text style={s.objectChipName} numberOfLines={1}>{obj.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Chat */}
      <KeyboardAvoidingView
        style={s.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={s.messagesList}
          contentContainerStyle={s.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(msg => (
            <ChatMessage
              key={msg.id}
              msg={msg}
              onDetectionPress={item => item.videoUri && setVideoModal({ visible: true, uri: item.videoUri })}
            />
          ))}
        </ScrollView>

        {/* Input */}
        <View style={s.inputArea}>
          <Text style={s.inputLabel}>ASK THE ANALYST</Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about the recorded scene…"
              placeholderTextColor={C.textDim}
              multiline
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit
            />
            <TouchableOpacity
              style={[s.sendBtn, input.trim() && !asking ? s.sendBtnActive : s.sendBtnInactive]}
              onPress={handleSend}
              disabled={!input.trim() || asking}
            >
              {asking
                ? <ActivityIndicator size="small" color={C.textMuted} />
                : <Text style={[s.sendBtnText, input.trim() ? { color: C.cyan } : { color: C.textDim }]}>↑</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // top bar
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: { width: 24, height: 24, borderRadius: 6, backgroundColor: C.cyanDim, borderWidth: 1, borderColor: C.cyan + '50', alignItems: 'center', justifyContent: 'center' },
  logoIcon: { fontSize: 13, color: C.cyan },
  appName: { fontSize: 14, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.3 },
  versionBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: C.border },
  versionText: { fontSize: 9, color: C.textDim, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  clockText: { fontSize: 11, color: C.textMuted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // balance / load funds in top bar
  balanceChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: C.emeraldDim, borderWidth: 1, borderColor: C.emerald + '50' },
  balanceText: { fontSize: 12, fontWeight: '600', color: C.emerald },
  loadFundsBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: C.violetDim, borderWidth: 1, borderColor: C.violet + '50' },
  loadFundsText: { fontSize: 12, fontWeight: '600', color: C.violet },

  // camera
  cameraContainer: { height: 260, backgroundColor: '#000', position: 'relative' },
  cameraTopOverlay: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, zIndex: 10 },
  cameraTitleText: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 0.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 1 },
  bracketsContainer: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  bracket: { position: 'absolute', width: 20, height: 20 },
  cameraBottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, zIndex: 10 },
  recordBtn: { borderRadius: 10, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderWidth: 1 },
  recordBtnIdle: { backgroundColor: C.cyanDim, borderColor: C.cyan + '60' },
  recordBtnActive: { backgroundColor: C.redDim, borderColor: C.red + '60' },
  recordBtnWaiting: { backgroundColor: 'rgba(248,113,113,0.06)', borderColor: 'rgba(248,113,113,0.25)' },
  recordBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border },
  recordBtnText: { fontSize: 14, fontWeight: '600', letterSpacing: 0.3 },

  // object log
  objectLog: { borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface },
  objectLogHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  objectLogTitle: { fontSize: 10, fontWeight: '700', color: C.cyan, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 1.5 },
  objectLogCount: { fontSize: 10, color: C.textDim, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  objectLogScroll: { paddingHorizontal: 12, paddingBottom: 10, gap: 6 },
  objectChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, maxWidth: 200 },
  objectChipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.emerald },
  objectChipName: { fontSize: 12, color: C.textSecondary, flex: 1 },
  objectChipTime: { fontSize: 9, color: C.textDim, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // buy these button
  buyTheseBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: C.amberDim, borderWidth: 1, borderColor: C.amber + '50' },
  buyTheseBtnText: { fontSize: 11, fontWeight: '600', color: C.amber },

  // buy card
  buyCard: { marginHorizontal: 12, marginBottom: 8, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  buyCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  buyCardTitle: { fontSize: 10, fontWeight: '700', color: C.amber, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 1.5 },
  buyCardClose: { fontSize: 14, color: C.textMuted },
  buyItemRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border + '80' },
  buyItemName: { flex: 1, fontSize: 13, color: C.textSecondary, marginRight: 8 },
  buyPriceBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 6, borderWidth: 1, borderColor: C.borderBright, paddingHorizontal: 8, paddingVertical: 4 },
  buyPriceLabel: { fontSize: 13, color: C.textMuted, marginRight: 2 },
  buyPriceInput: { fontSize: 13, color: C.textPrimary, width: 52 },
  buyNowBtn: { margin: 12, borderRadius: 10, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderWidth: 1 },
  buyNowBtnActive: { backgroundColor: C.emeraldDim, borderColor: C.emerald + '60' },
  buyNowBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border },
  buyNowBtnText: { fontSize: 14, fontWeight: '600' },

  // load funds modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: C.borderBright, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  modalSub: { fontSize: 12, color: C.textMuted, marginBottom: 20 },
  presetRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  presetBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: C.violetDim, borderWidth: 1, borderColor: C.violet + '50', alignItems: 'center' },
  presetBtnText: { fontSize: 16, fontWeight: '700', color: C.violet },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  customLabel: { fontSize: 16, color: C.textMuted },
  customInput: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderBright, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.textPrimary },
  customBtn: { paddingHorizontal: 18, paddingVertical: 13, borderRadius: 10, borderWidth: 1 },
  customBtnActive: { backgroundColor: C.cyanDim, borderColor: C.cyan + '60' },
  customBtnInactive: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border },
  customBtnText: { fontSize: 14, fontWeight: '600' },
  stripeNote: { fontSize: 11, color: C.textDim, textAlign: 'center', marginTop: 16, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // chat
  chatContainer: { flex: 1, backgroundColor: C.bg },
  messagesList: { flex: 1 },
  messagesContent: { padding: 14, gap: 14, paddingBottom: 6 },

  // detection card
  detectionCard: { borderRadius: 10, borderWidth: 1, borderColor: C.emerald + '35', backgroundColor: C.emeraldDim, overflow: 'hidden' },
  detectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'rgba(52,211,153,0.08)', borderBottomWidth: 1, borderBottomColor: C.emerald + '25' },
  detectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.emerald },
  detectionLabel: { flex: 1, fontSize: 9, fontWeight: '700', color: C.emerald, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 1.5 },
  detectionTime: { fontSize: 10, fontWeight: '600', color: C.emerald, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  detectionPlayHint: { fontSize: 9, color: C.emerald + '70', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  detectionName: { fontSize: 16, fontWeight: '600', color: '#a7f3d0', paddingHorizontal: 12, paddingVertical: 10 },

  // video modal
  videoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  videoCard: { width: '100%', backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.borderBright, overflow: 'hidden' },
  videoCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  videoCardTitle: { fontSize: 10, fontWeight: '700', color: C.cyan, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 1.5 },
  videoCardClose: { fontSize: 16, color: C.textMuted },
  videoPlayer: { width: '100%', height: 260 },
  videoPlaceholder: { height: 200, alignItems: 'center', justifyContent: 'center' },
  videoPlaceholderText: { fontSize: 13, color: C.textDim },

  // system message
  systemMsgRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 },
  systemLine: { flex: 1, height: 1, backgroundColor: C.border },
  systemMsgText: { fontSize: 10, color: C.textDim, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', flexShrink: 1, textAlign: 'center' },

  // bot message
  botMsgRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  botAvatar: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  botAvatarText: { fontSize: 9, fontWeight: '700', color: C.textMuted },
  botBubble: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, borderTopLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12 },
  botBubbleText: { fontSize: 14, color: C.textSecondary, lineHeight: 21 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingText: { fontSize: 13, color: C.textDim },
  msgTime: { fontSize: 10, color: C.textDim, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 4 },

  // user message
  userMsgRow: { alignItems: 'flex-end' },
  userBubble: { backgroundColor: '#fff', borderRadius: 14, borderTopRightRadius: 4, paddingHorizontal: 14, paddingVertical: 12, maxWidth: '82%' },
  userBubbleText: { fontSize: 14, color: '#111', lineHeight: 21 },

  // input
  inputArea: { padding: 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface },
  inputLabel: { fontSize: 9, fontWeight: '700', color: C.textDim, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 1.5, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderBright, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  input: { flex: 1, fontSize: 14, color: C.textPrimary, maxHeight: 100, lineHeight: 20 },
  sendBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 1 },
  sendBtnActive: { backgroundColor: C.cyanDim, borderColor: C.cyan + '50' },
  sendBtnInactive: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border },
  sendBtnText: { fontSize: 18, fontWeight: '700', lineHeight: 22 },

  // permissions
  permScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  permTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary, marginBottom: 12, textAlign: 'center' },
  permSub: { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  permBtn: { backgroundColor: C.cyanDim, borderWidth: 1, borderColor: C.cyan + '50', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  permBtnText: { fontSize: 15, fontWeight: '600', color: C.cyan },
})
