// ==== frontend/src/pages/Chat.jsx ====
import { useEffect, useRef, useState } from "react";
import { useUser } from "../hooks/useUser";
import { io } from "socket.io-client";

const socket = io("https://dilse-backend-rzmj.onrender.com");

const Chat = () => {
  const { user } = useUser();
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState("");
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
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

    socket.on("chatHistory", (history) => {
      setMessages(history);
    });

    socket.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("partnerTyping", () => setIsPartnerTyping(true));
    socket.on("partnerStopTyping", () => setIsPartnerTyping(false));

    socket.on("partnerLeft", () => {
      alert("Your partner left. Searching again...");
      cleanupMedia();
      setPartner(null);
      setMessages([]);
      setTimeout(() => socket.emit("register", user), 500);
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

    return () => {
      socket.disconnect();
      cleanupMedia();
    };
  }, [user]);

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {
      alert("Failed to access camera or microphone");
      console.error(err);
    }
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

    peer.ontrack = (event) => {
      console.log("✅ Got remote track", event.streams[0]);
      if (remoteVideoRef.current)
        remoteVideoRef.current.srcObject = event.streams[0];
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

  const cleanupMedia = () => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
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
            playsInline
            className="w-64 h-48 rounded bg-black"
          />
        </div>
        <div>
          <p className="text-sm text-gray-500">Partner</p>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-64 h-48 rounded bg-black"
          />
        </div>
      </div>

      <button
        onClick={startCall}
        className="mb-4 bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
      >
        📞 Start Call
      </button>

      <div className="flex flex-col border w-full max-w-xl h-64 overflow-y-scroll mb-4 p-4 rounded shadow">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-2 ${
              m.from === user.name ? "text-right" : "text-left"
            }`}
          >
            <span className="block text-xs text-gray-400">{m.from}</span>
            <span className="inline-block bg-pink-100 px-3 py-1 rounded-md text-gray-800">
              {m.text}
            </span>
          </div>
        ))}
        {isPartnerTyping && (
          <div className="text-xs text-gray-400 italic">
            Partner is typing...
          </div>
        )}
      </div>

      <div className="flex w-full max-w-xl">
        <input
          type="text"
          value={msg}
          onChange={(e) => {
            setMsg(e.target.value);
            socket.emit("typing");
            clearTimeout(window.typingTimeout);
            window.typingTimeout = setTimeout(
              () => socket.emit("stopTyping"),
              1000
            );
          }}
          onBlur={() => socket.emit("stopTyping")}
          className="flex-1 border px-4 py-2 rounded-l"
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="bg-pink-500 text-white px-4 py-2 rounded-r hover:bg-pink-600"
        >
          Send 💌
        </button>
      </div>
    </div>
  );
};

export default Chat;
