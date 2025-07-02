// File: src/pages/Chat.jsx
import { useEffect, useRef, useState } from "react";
import { useUser } from "../hooks/useUser";
import { io } from "socket.io-client";

// const socket = io("http://localhost:3001");
const socket = io("https://your-backend.onrender.com");

const Chat = () => {
  const { user } = useUser();
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [callStarted, setCallStarted] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    socket.connect();
    socket.emit("register", user);

    socket.on("paired", ({ name }) => {
      setPartner(name);
    });

    socket.on("offer", async (offer) => {
      await startLocalStream();
      const peer = createPeer();
      await peer.setRemoteDescription(offer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("answer", answer);
    });

    socket.on("answer", async (answer) => {
      await peerConnectionRef.current?.setRemoteDescription(answer);
    });

    socket.on("ice", async (candidate) => {
      try {
        await peerConnectionRef.current?.addIceCandidate(candidate);
      } catch (err) {
        console.error("Failed to add ICE candidate", err);
      }
    });

    socket.on("chatHistory", (history) => {
      setMessages(history);
    });

    socket.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
      peerConnectionRef.current?.close();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [user]);

  const startLocalStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localStreamRef.current = stream;
    localVideoRef.current.srcObject = stream;
  };

  const createPeer = () => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerConnectionRef.current = peer;

    localStreamRef.current.getTracks().forEach((track) => {
      peer.addTrack(track, localStreamRef.current);
    });

    peer.onicecandidate = (e) => {
      if (e.candidate) socket.emit("ice", e.candidate);
    };

    peer.ontrack = (e) => {
      remoteVideoRef.current.srcObject = e.streams[0];
    };

    return peer;
  };

  const startCall = async () => {
    if (!partner) return alert("No partner yet");
    await startLocalStream();
    const peer = createPeer();
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit("offer", offer);
    setCallStarted(true);
  };

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCameraOn(videoTrack.enabled);
    }
  };

  const endCall = () => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localVideoRef.current.srcObject = null;
    remoteVideoRef.current.srcObject = null;
    setPartner(null);
    setCallStarted(false);
    alert("Call ended");
  };

  const reconnect = () => {
    window.location.reload();
  };

  const sendMessage = () => {
    if (msg.trim()) {
      socket.emit("message", msg);
      setMessages((prev) => [...prev, { from: user.name, text: msg }]);
      setMsg("");
    }
  };

  return (
    <div className="h-screen bg-white p-6 flex flex-col items-center">
      <h2 className="text-xl font-semibold mb-2">
        Connected to:{" "}
        {partner || (
          <span className="animate-pulse text-gray-400">Waiting...</span>
        )}
      </h2>

      <div className="flex gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500">You</p>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            className="w-64 h-48 rounded bg-black"
          />
        </div>
        <div>
          <p className="text-sm text-gray-500">Partner</p>
          <video
            ref={remoteVideoRef}
            autoPlay
            className="w-64 h-48 rounded bg-black"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={startCall}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          📞 Start Call
        </button>
        <button
          onClick={toggleMute}
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        >
          {isMuted ? "Unmute" : "Mute"}
        </button>
        <button
          onClick={toggleCamera}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {cameraOn ? "Turn Camera Off" : "Turn Camera On"}
        </button>
        <button
          onClick={endCall}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          ❌ End Call
        </button>
        <button
          onClick={reconnect}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          🔄 Reconnect
        </button>
      </div>

      <div className="flex flex-col border w-full max-w-xl h-64 overflow-y-scroll mb-4 p-4 rounded shadow">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-2 ${
              m.from === user.name ? "text-right" : "text-left"
            }`}
          >
            <span className="block text-sm text-gray-500">{m.from}</span>
            <span className="inline-block bg-pink-100 px-3 py-1 rounded-md text-gray-800">
              {m.text}
            </span>
          </div>
        ))}
      </div>

      <div className="flex w-full max-w-xl">
        <input
          type="text"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          className="flex-1 border px-4 py-2 rounded-l"
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="bg-pink-500 text-white px-4 py-2 rounded-r hover:bg-pink-600"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
