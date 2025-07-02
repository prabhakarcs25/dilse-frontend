import React, { useEffect, useState } from "react";
import axios from "axios";

export default function EmotionPage() {
  const [sessionId, setSessionId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("sessionId");
    if (stored) {
      setSessionId(stored);
    } else {
      axios.get("http://localhost:3001/session").then((res) => {
        setSessionId(res.data.sessionId);
        localStorage.setItem("sessionId", res.data.sessionId);
      });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return alert("Write something before sharing");
    await axios.post("http://localhost:3001/post", { sessionId, message });
    setMessage("");
    alert("Emotion shared anonymously 💌");
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>Welcome to Dil Se 💖</h1>
      <p>
        Your anonymous session ID: <strong>{sessionId}</strong>
      </p>
      <form onSubmit={handleSubmit}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How are you feeling?"
          rows="4"
          style={{ width: "100%", padding: "1rem" }}
        />
        <button style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
          Share Emotion
        </button>
      </form>
    </div>
  );
}
