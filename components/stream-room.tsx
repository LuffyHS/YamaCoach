"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { AudioLines, Headphones, Mic, MicOff, MonitorUp, Phone, Radio, UsersRound, Video, VideoOff, Wifi } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Participant = { id: string; name: string };
type SignalPayload = { type: "join" } | { type: "offer" | "answer"; sdp: RTCSessionDescriptionInit } | { type: "ice-candidate"; candidate: RTCIceCandidateInit };
type Signal = SignalPayload & { from: string; to: string };
type RemoteView = { stream: MediaStream; speaking: boolean; hasVideo: boolean; hasAudio: boolean; connected: boolean };

function observeSpeech(stream: MediaStream, onChange: (speaking: boolean) => void) {
  const tracks = stream.getAudioTracks(); if (!tracks.length) return () => undefined;
  const context = new AudioContext(), analyser = context.createAnalyser(); analyser.fftSize = 512;
  const source = context.createMediaStreamSource(new MediaStream(tracks)); source.connect(analyser);
  const values = new Uint8Array(analyser.fftSize); let speaking = false, frame = 0;
  const sample = () => { analyser.getByteTimeDomainData(values); let power = 0; for (const v of values) { const n = (v - 128) / 128; power += n * n; }
    const next = Math.sqrt(power / values.length) > .035; if (next !== speaking) { speaking = next; onChange(next); } frame = requestAnimationFrame(sample); };
  void context.resume().then(sample).catch(() => undefined);
  return () => { cancelAnimationFrame(frame); source.disconnect(); analyser.disconnect(); void context.close(); onChange(false); };
}

export function StreamRoom({ sessionId, userId, userName, coach, publicRoom, participants }: { sessionId: string; userId: string; userName: string; coach: boolean; publicRoom: boolean; participants: Participant[] }) {
  const localVideo = useRef<HTMLVideoElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const peers = useRef<Record<string, RTCPeerConnection>>({});
  const channel = useRef<RealtimeChannel | null>(null);
  const media = useRef<MediaStream | null>(null);
  const processedMic = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const audioGraphCleanup = useRef<(() => void) | null>(null);
  const noiseGateEnabled = useRef(true);
  const screen = useRef<MediaStream | null>(null);
  const candidates = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const meters = useRef<Record<string, () => void>>({});
  const joinTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [status, setStatus] = useState("Aguardando participante");
  const [started, setStarted] = useState(false);
  const [mic, setMic] = useState(false);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [noiseSupported, setNoiseSupported] = useState(false);
  const [camera, setCamera] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [localHasVideo, setLocalHasVideo] = useState(false);
  const [remoteViews, setRemoteViews] = useState<Record<string, RemoteView>>({});
  const [presenceParticipants, setPresenceParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState("");
  const announcedParticipants = useRef(new Set<string>());
  const remoteParticipants = (publicRoom ? presenceParticipants : participants).filter(p => p.id !== userId);

  function send(to: string, signal: SignalPayload) {
    if (channel.current) void channel.current.send({ type: "broadcast", event: "signal", payload: { ...signal, from: userId, to } });
  }

  function cleanup() {
    if (joinTimer.current) clearInterval(joinTimer.current); joinTimer.current = null;
    Object.values(meters.current).forEach(stop => stop()); meters.current = {};
    Object.values(peers.current).forEach(peer => peer.close()); peers.current = {};
    if (channel.current) void channel.current.unsubscribe(); channel.current = null;
    audioGraphCleanup.current?.(); audioGraphCleanup.current = null;
    processedMic.current?.getTracks().forEach(track => track.stop()); processedMic.current = null;
    if (audioContext.current) void audioContext.current.close(); audioContext.current = null;
    media.current?.getTracks().forEach(track => track.stop()); media.current = null;
    screen.current?.getTracks().forEach(track => track.stop()); screen.current = null;
    if (localVideo.current) localVideo.current.srcObject = null;
    Object.values(videoRefs.current).forEach(video => { if (video) video.srcObject = null; });
    setStarted(false); setMic(false); setNoiseSuppression(false); setNoiseSupported(false); setCamera(false); setSharing(false); setLocalHasVideo(false); setLocalSpeaking(false); setRemoteViews({}); setPresenceParticipants([]); announcedParticipants.current.clear(); setStatus("Aguardando participante");
  }
  useEffect(() => () => cleanup(), []);

  async function start() {
    if (started) return;
    setStarted(true); setError(""); setStatus("Conectando…");
    try {
      let local: MediaStream | null = null;
      const supported = navigator.mediaDevices.getSupportedConstraints?.().noiseSuppression ?? false;
      setNoiseSupported(true);
      setNoiseSuppression(true);
      const processedAudio: MediaTrackConstraints = { echoCancellation: true, autoGainControl: true, ...(supported ? { noiseSuppression: true } : {}) };
      try { local = await navigator.mediaDevices.getUserMedia({ audio: processedAudio, video: !publicRoom }); }
      catch { try { local = await navigator.mediaDevices.getUserMedia({ audio: processedAudio, video: false }); }
        catch { try { local = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); }
          catch { setError("Microfone e câmera indisponíveis. Você ainda pode receber o vídeo e compartilhar a tela."); } } }
      media.current = local;
      noiseGateEnabled.current = true;
      if (localVideo.current && local) localVideo.current.srcObject = local;
      const audio = local?.getAudioTracks() ?? [], video = local?.getVideoTracks() ?? [];
      setNoiseSupported(Boolean(audio.length));
      setNoiseSuppression(Boolean(audio.length));
      setMic(audio.some(track => track.enabled)); setCamera(video.some(track => track.enabled)); setLocalHasVideo(video.length > 0);
      if (audio[0]) {
        try {
          const context = new AudioContext();
          audioContext.current = context;
          const source = context.createMediaStreamSource(new MediaStream([audio[0]]));
          const highPass = context.createBiquadFilter(); highPass.type = "highpass"; highPass.frequency.value = 105; highPass.Q.value = 0.7;
          const analyser = context.createAnalyser(); analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.25;
          const compressor = context.createDynamicsCompressor(); compressor.threshold.value = -28; compressor.knee.value = 18; compressor.ratio.value = 3; compressor.attack.value = 0.008; compressor.release.value = 0.16;
          const gate = context.createGain(); gate.gain.value = 1;
          const destination = context.createMediaStreamDestination();
          source.connect(highPass); highPass.connect(analyser); highPass.connect(compressor); compressor.connect(gate); gate.connect(destination);
          processedMic.current = destination.stream;
          let frame = 0, speechOpen = false, noiseFloor = 0.004;
          const samples = new Float32Array(analyser.fftSize);
          const process = () => {
            analyser.getFloatTimeDomainData(samples);
            let sum = 0; for (const value of samples) sum += value * value;
            const rms = Math.sqrt(sum / samples.length);
            const openAt = Math.max(0.014, noiseFloor * 2.8);
            const closeAt = Math.max(0.009, noiseFloor * 1.9);
            if (rms < openAt) noiseFloor = Math.min(0.035, noiseFloor * 0.985 + rms * 0.015);
            const shouldOpen = noiseGateEnabled.current && (speechOpen ? rms > closeAt : rms > openAt);
            if (shouldOpen !== speechOpen) { speechOpen = shouldOpen; gate.gain.setTargetAtTime(shouldOpen ? 1 : 0.0001, context.currentTime, shouldOpen ? 0.018 : 0.085); }
            frame = requestAnimationFrame(process);
          };
          void context.resume().then(process).catch(() => undefined);
          audioGraphCleanup.current = () => { cancelAnimationFrame(frame); source.disconnect(); highPass.disconnect(); analyser.disconnect(); compressor.disconnect(); gate.disconnect(); destination.disconnect(); };
          meters.current.local = observeSpeech(processedMic.current, setLocalSpeaking);
        } catch {
          processedMic.current = new MediaStream(audio);
          meters.current.local = observeSpeech(local!, setLocalSpeaking);
        }
      }

      const sb = createClient();
      const liveChannel = sb.channel(`live-session-${sessionId}`, { config: { broadcast: { self: false, ack: true }, presence: { key: userId } } }); channel.current = liveChannel;
      const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
      const iceServers: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
      if (turnUrl) iceServers.push({ urls: turnUrl, username: process.env.NEXT_PUBLIC_TURN_USERNAME, credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL });

      function ensurePeer(remoteId: string) {
        if (peers.current[remoteId]) return peers.current[remoteId];
        const peer = new RTCPeerConnection({ iceServers }); peers.current[remoteId] = peer;
        if (local) {
          local.getVideoTracks().forEach(track => peer.addTrack(track, local!));
          const outgoingAudio = processedMic.current?.getAudioTracks()[0] ?? local.getAudioTracks()[0];
          if (outgoingAudio) peer.addTrack(outgoingAudio, processedMic.current?.getAudioTracks()[0] ? processedMic.current! : local);
        }
        if (!local?.getAudioTracks().length) peer.addTransceiver("audio", { direction: "sendrecv" });
        if (!local?.getVideoTracks().length) peer.addTransceiver("video", { direction: "sendrecv" });
        peer.ontrack = event => {
          const stream = event.streams[0] || new MediaStream();
          if (!stream.getTracks().some(track => track.id === event.track.id)) stream.addTrack(event.track);
          setRemoteViews(prev => ({ ...prev, [remoteId]: { stream, speaking: prev[remoteId]?.speaking || false, hasVideo: stream.getVideoTracks().some(t => t.readyState === "live" && !t.muted), hasAudio: stream.getAudioTracks().some(t => t.readyState === "live"), connected: peer.connectionState === "connected" } }));
          if (event.track.kind === "audio") { meters.current[remoteId]?.(); meters.current[remoteId] = observeSpeech(stream, speaking => setRemoteViews(prev => prev[remoteId] ? { ...prev, [remoteId]: { ...prev[remoteId], speaking } } : prev)); }
          event.track.onmute = event.track.onended = () => setRemoteViews(prev => prev[remoteId] ? { ...prev, [remoteId]: { ...prev[remoteId], hasVideo: event.track.kind === "video" ? false : prev[remoteId].hasVideo, hasAudio: event.track.kind === "audio" ? false : prev[remoteId].hasAudio } } : prev);
          event.track.onunmute = () => setRemoteViews(prev => prev[remoteId] ? { ...prev, [remoteId]: { ...prev[remoteId], hasVideo: event.track.kind === "video" ? true : prev[remoteId].hasVideo, hasAudio: event.track.kind === "audio" ? true : prev[remoteId].hasAudio } } : prev);
          const element = videoRefs.current[remoteId]; if (element) element.srcObject = stream;
        };
        peer.onicecandidate = event => { if (event.candidate) send(remoteId, { type: "ice-candidate", candidate: event.candidate.toJSON() }); };
        peer.onconnectionstatechange = () => {
          const connected = peer.connectionState === "connected";
          setRemoteViews(prev => ({ ...prev, [remoteId]: { stream: prev[remoteId]?.stream || new MediaStream(), speaking: prev[remoteId]?.speaking || false, hasVideo: prev[remoteId]?.hasVideo || false, hasAudio: prev[remoteId]?.hasAudio || false, connected } }));
          setStatus(Object.values(peers.current).some(item => item.connectionState === "connected") ? "Ao vivo" : "Conectando…");
          if (peer.connectionState === "failed") setError("Uma conexão de participante falhou. Tente sair e entrar novamente.");
        };
        return peer;
      }

      if (publicRoom) liveChannel.on("presence", { event: "sync" }, () => {
        const metadata = Object.values(liveChannel.presenceState<{ user_id: string; full_name: string; role: string }>()).flat();
        const people = new Map<string, Participant>();
        metadata.forEach(item => { if (item.user_id && item.full_name) people.set(item.user_id, { id: item.user_id, name: item.full_name }); });
        setPresenceParticipants([...people.values()]);
        for (const person of people.values()) if (person.id !== userId && !announcedParticipants.current.has(person.id)) {
          announcedParticipants.current.add(person.id);
          send(person.id, { type: "join" });
        }
      });
      liveChannel.on("broadcast", { event: "signal" }, async ({ payload }) => {
        const signal = payload as Signal;
        if (!signal || signal.to !== userId || signal.from === userId) return;
        const peer = ensurePeer(signal.from);
        try {
          if (signal.type === "join") {
            if (userId.localeCompare(signal.from) < 0 && peer.signalingState === "stable") {
              const offer = await peer.createOffer(); await peer.setLocalDescription(offer);
              if (peer.localDescription) send(signal.from, { type: "offer", sdp: peer.localDescription });
            }
          } else if (signal.type === "offer") {
            await peer.setRemoteDescription(signal.sdp);
            for (const candidate of (candidates.current[signal.from] || [])) await peer.addIceCandidate(candidate);
            candidates.current[signal.from] = [];
            const answer = await peer.createAnswer(); await peer.setLocalDescription(answer);
            if (peer.localDescription) send(signal.from, { type: "answer", sdp: peer.localDescription });
          } else if (signal.type === "answer") {
            await peer.setRemoteDescription(signal.sdp);
            for (const candidate of (candidates.current[signal.from] || [])) await peer.addIceCandidate(candidate);
            candidates.current[signal.from] = [];
          } else if (signal.type === "ice-candidate") {
            if (peer.remoteDescription) await peer.addIceCandidate(signal.candidate);
            else (candidates.current[signal.from] ||= []).push(signal.candidate);
          }
        } catch { setError("A conexão da sala falhou. Saia e entre novamente para reconectar."); }
      });
      liveChannel.subscribe(async state => {
        if (state === "SUBSCRIBED") {
          setStatus("Aguardando participante");
          if (coach) void fetch("/api/live", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: sessionId, status: "live" }) });
          if (publicRoom) {
            const currentlyPresent = Object.values(liveChannel.presenceState()).flat();
            if (currentlyPresent.length >= 20) {
              cleanup(); setError("Esta aula já atingiu o limite de 20 participantes."); setStatus("Sala lotada"); return;
            }
            await liveChannel.track({ user_id: userId, full_name: userName, role: coach ? "coach" : "student", joined_at: new Date().toISOString() });
          }
          const announce = () => remoteParticipants.forEach(person => send(person.id, { type: "join" }));
          announce(); joinTimer.current = setInterval(announce, 2800);
        } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") { setError("Não foi possível entrar. Confira o Supabase Realtime e tente novamente."); setStatus("Desconectado"); }
      });
    } catch { setError("Não foi possível iniciar a sala. Confira a conexão e as permissões do navegador."); setStatus("Desconectado"); setStarted(false); }
  }

  async function shareScreen() {
    if (sharing) { screen.current?.getTracks().forEach(track => track.stop()); return; }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }); const track = display.getVideoTracks()[0];
      for (const peer of Object.values(peers.current)) { const sender = peer.getTransceivers().find(item => item.receiver.track.kind === "video")?.sender; if (sender) await sender.replaceTrack(track); }
      screen.current = display; setSharing(true); setLocalHasVideo(true); if (localVideo.current) localVideo.current.srcObject = display;
      track.onended = () => { const cameraTrack = media.current?.getVideoTracks()[0] || null; for (const peer of Object.values(peers.current)) { const sender = peer.getTransceivers().find(item => item.receiver.track.kind === "video")?.sender; if (sender) void sender.replaceTrack(cameraTrack); } if (localVideo.current) localVideo.current.srcObject = media.current; screen.current = null; setSharing(false); setLocalHasVideo(Boolean(cameraTrack?.enabled)); };
      setError("");
    } catch { setError("O compartilhamento foi cancelado ou não está disponível neste navegador."); }
  }
  function toggle(kind: "audio" | "video") {
    const tracks = kind === "audio" ? media.current?.getAudioTracks() : media.current?.getVideoTracks();
    if (!tracks?.length) { setError(kind === "audio" ? "Nenhum microfone foi detectado." : "Nenhuma câmera foi detectada."); return; }
    const enabled = !tracks[0].enabled; tracks.forEach(track => { track.enabled = enabled; });
    if (kind === "audio") setMic(enabled); else { setCamera(enabled); setLocalHasVideo(enabled); } setError("");
  }

  async function toggleNoiseSuppression() {
    const track = media.current?.getAudioTracks()[0];
    if (!track) { setError("Entre na sala com um microfone para ajustar o áudio."); return; }
    const next = !noiseSuppression;
    noiseGateEnabled.current = next;
    try { if (noiseSupported) await track.applyConstraints({ noiseSuppression: next, echoCancellation: true, autoGainControl: true }); setNoiseSuppression(next); setError(""); }
    catch { setNoiseSuppression(next); setError("A redução adicional segue ativa; o navegador não permitiu alternar o cancelamento nativo."); }
  }

  const connectedCount = Object.values(remoteViews).filter(view => view.connected).length;
  return <section className="voice-room" aria-label="Sala de chamada ao vivo">
    <header className="voice-room-header"><div><div className="voice-room-eyebrow"><Radio size={13} /> YAMA LIVE ROOM</div><h2>Sessão de coaching</h2><p>Áudio, vídeo e compartilhamento de tela para todo o grupo.</p></div><div className="voice-room-header-right"><span className="voice-participant-total"><UsersRound size={15} /> {remoteParticipants.length + 1}</span><div className={`voice-connection ${connectedCount ? "is-connected" : ""}`} aria-live="polite"><span className="voice-connection-dot" /><span>{connectedCount ? `Ao vivo · ${connectedCount}/${remoteParticipants.length}` : status}</span>{connectedCount > 0 && <Wifi size={14} />}</div></div></header>
    <div className="voice-call-body"><div className="voice-stage voice-stage-group">
      <article className={`voice-participant ${localSpeaking ? "is-speaking" : ""}`}><video ref={localVideo} autoPlay muted playsInline className={`voice-video ${localHasVideo ? "is-visible" : ""}`} />{!localHasVideo && <div className="voice-avatar voice-avatar-local">{coach ? "C" : "A"}</div>}<div className="voice-participant-top"><span className="voice-you-badge">Você</span>{sharing && <span className="voice-sharing"><MonitorUp size={12} /> Tela</span>}</div><div className="voice-participant-footer"><span><strong>Você</strong><small>{localSpeaking ? "Falando agora" : coach ? "Coach" : "Aluno"}</small></span><span className={`voice-mic-state ${mic && started ? "" : "is-muted"}`}>{mic && started ? <Mic size={15} /> : <MicOff size={15} />}</span></div></article>
      {remoteParticipants.slice(0, publicRoom ? 8 : undefined).map(person => { const view = remoteViews[person.id]; return <article key={person.id} className={`voice-participant ${view?.speaking ? "is-speaking" : ""}`}><video ref={element => { videoRefs.current[person.id] = element; if (element && view?.stream) element.srcObject = view.stream; }} autoPlay playsInline className={`voice-video ${view?.hasVideo ? "is-visible" : ""}`} />{!view?.hasVideo && <div className="voice-avatar">{person.name.slice(0, 1).toUpperCase()}</div>}<div className="voice-participant-top"><span className={`voice-presence ${view?.connected ? "is-online" : ""}`}><i />{view?.connected ? "Conectado" : started ? "Conectando" : "Aguardando"}</span></div><div className="voice-participant-footer"><span><strong>{person.name}</strong><small>{view?.speaking ? "Falando agora" : view?.hasAudio ? "Áudio conectado" : "Aguardando entrada"}</small></span><span className={`voice-mic-state ${view?.hasAudio ? "" : "is-muted"}`}>{view?.hasAudio ? <Headphones size={15} /> : <MicOff size={15} />}</span></div></article>; })}
      {publicRoom && remoteParticipants.length > 8 && <div className="voice-no-participants">+ {remoteParticipants.length - 8} participantes na lista ao lado</div>}
      {remoteParticipants.length === 0 && <div className="voice-no-participants">{publicRoom ? "Aguardando a entrada da turma." : "Nenhum participante vinculado a esta sala."}</div>}
    </div><aside className="voice-roster"><div className="voice-roster-heading"><span>PARTICIPANTES</span><b>{remoteParticipants.length + 1}</b></div><div className={`voice-roster-person ${localSpeaking ? "is-speaking" : ""}`}><span className="voice-roster-avatar">{coach ? "C" : "A"}</span><span className="voice-roster-name"><b>Você</b><small>{coach ? "Coach" : "Aluno"}</small></span><span className={`voice-roster-mic ${mic && started ? "" : "is-muted"}`}>{mic && started ? <Mic size={14} /> : <MicOff size={14} />}</span></div>{remoteParticipants.map(person => { const view = remoteViews[person.id]; return <div className={`voice-roster-person ${view?.speaking ? "is-speaking" : ""}`} key={person.id}><span className="voice-roster-avatar">{person.name.slice(0, 1).toUpperCase()}</span><span className="voice-roster-name"><b>{person.name}</b><small>{view?.connected ? "Na sala" : started ? "Conectando" : "Aguardando"}</small></span><span className={`voice-roster-mic ${view?.hasAudio ? "" : "is-muted"}`}>{view?.hasAudio ? <Headphones size={14} /> : <MicOff size={14} />}</span></div>; })}<div className="voice-roster-footnote">O contorno verde acende quando alguém está falando.</div></aside></div>
    <footer className="voice-toolbar"><div className="voice-toolbar-group"><button className={`voice-control ${!mic && started ? "is-muted" : ""}`} onClick={() => toggle("audio")} disabled={!started}><>{mic ? <Mic size={18} /> : <MicOff size={18} />}<span>{mic ? "Microfone" : "Silenciado"}</span></></button><button className={`voice-control ${noiseSuppression ? "is-noise-active" : ""}`} onClick={() => void toggleNoiseSuppression()} disabled={!started || !noiseSupported} title="Redução nativa, filtro de graves e gate de voz"><AudioLines size={18} /><span>{noiseSuppression ? "Ruído reduzido" : "Redução de ruído"}</span></button><button className={`voice-control ${!camera && started ? "is-muted" : ""}`} onClick={() => toggle("video")} disabled={!started || publicRoom}>{camera ? <Video size={18} /> : <VideoOff size={18} />}<span>{publicRoom ? "Câmera desativada na aula" : camera ? "Câmera" : "Câmera off"}</span></button><button className={`voice-control ${sharing ? "is-sharing" : ""}`} onClick={() => void shareScreen()} disabled={!started}><MonitorUp size={18} /><span>{sharing ? "Parar tela" : "Compartilhar tela"}</span></button></div><button className={`voice-join-button ${started ? "is-leave" : ""}`} onClick={() => started ? cleanup() : void start()}>{started ? <><Phone size={17} /> Sair da sala</> : <><Headphones size={17} /> Entrar na sala</>}</button><div className="voice-room-meta"><span className="voice-room-lock" /> {publicRoom ? "Aula aberta" : "Sala privada"} · <span className="voice-mono">{sessionId.slice(0, 8).toUpperCase()}</span></div></footer>
    {error && <div className="voice-error" role="alert">{error}</div>}
  </section>;
}
