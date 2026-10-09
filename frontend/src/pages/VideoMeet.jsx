import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "../Styles/VideoComponent.module.css";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import SendIcon from "@mui/icons-material/Send";
import PersonIcon from "@mui/icons-material/Person";
import Badge from "@mui/material/Badge";
import { io } from "socket.io-client";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import { IconButton, TextField } from "@mui/material";

const server_url = "http://localhost:8000";

var connections = {};

const peerConnection = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

// ---------- helpers ----------

const silence = () => {
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const dst = oscillator.connect(ctx.createMediaStreamDestination());
  oscillator.start();
  ctx.resume();
  return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
};

const black = ({ width = 640, height = 480 } = {}) => {
  const canvas = Object.assign(document.createElement("canvas"), { width, height });
  canvas.getContext("2d").fillRect(0, 0, width, height);
  const stream = canvas.captureStream();
  return Object.assign(stream.getVideoTracks()[0], { enabled: false });
};

const blackSilence = () => new MediaStream([black(), silence()]);

const withBothTracks = (stream) => {
  const tracks = [...stream.getTracks()];
  if (stream.getVideoTracks().length === 0) tracks.push(black());
  if (stream.getAudioTracks().length === 0) tracks.push(silence());
  return new MediaStream(tracks);
};

export default function VideoMeet() {
  const location = useLocation();
  const routeState = location.state || {};

  // Read pre-join settings from route state (set on Home page)
  const initialUsername = routeState.username || "Guest";
  const initialVideoOn = routeState.videoOn !== undefined ? routeState.videoOn : true;
  const initialAudioOn = routeState.audioOn !== undefined ? routeState.audioOn : true;

  var socketRef = useRef();
  let socketIdRef = useRef();
  let localVideoRef = useRef();

  let [videoAvailable, setVideoAvailable] = useState(true);
  let [audioAvailable, setAudioAvailable] = useState(true);
  let [video, setVideo] = useState(undefined);
  let [audio, setAudio] = useState(undefined);
  let [screen, setscreen] = useState();
  let [showModal, setModal] = useState(false);
  let [screenAvailable, setScreenAvailable] = useState();
  let [messages, setMessages] = useState([]);
  let [message, setMessage] = useState("");
  let [newMessages, setNewMessages] = useState(0);
  let [username] = useState(initialUsername);
  let [socketId, setSocketId] = useState("");

  // Peer metadata: { socketId: { username, videoEnabled } }
  let [peerMeta, setPeerMeta] = useState({});

  const videoRef = useRef([]);
  let [videos, setVideos] = useState([]);

  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Reset unread when chat is opened
  useEffect(() => {
    if (showModal) {
      setNewMessages(0);
    }
  }, [showModal]);

  // GET CAMERA / MICROPHONE PERMISSIONS & immediately connect
  useEffect(() => {
    const getPermissionsAndConnect = async () => {
      let hasVideo = false;
      let hasAudio = false;

      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        s.getTracks().forEach((t) => t.stop());
        hasVideo = true;
      } catch (error) {
        console.log("No camera access:", error);
      }

      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
        hasAudio = true;
      } catch (error) {
        console.log("No microphone access:", error);
      }

      setVideoAvailable(hasVideo);
      setAudioAvailable(hasAudio);
      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

      // Apply pre-join preferences
      const wantVideo = initialVideoOn && hasVideo;
      const wantAudio = initialAudioOn && hasAudio;

      if (hasVideo || hasAudio) {
        try {
          const constraints = {};
          if (hasVideo) constraints.video = true;
          if (hasAudio) constraints.audio = true;

          const userMediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          const stream = withBothTracks(userMediaStream);

          // Apply pre-join mute/camera-off
          stream.getVideoTracks().forEach(t => { t.enabled = wantVideo; });
          stream.getAudioTracks().forEach(t => { t.enabled = wantAudio; });

          window.localStream = stream;

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.log("Error while getting local stream:", error);
        }
      } else {
        window.localStream = blackSilence();
      }

      // Set video/audio state & connect directly (no lobby)
      setVideo(wantVideo);
      setAudio(wantAudio);
      connectToSocketServer();
    };

    getPermissionsAndConnect();

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (window.localStream) {
        window.localStream.getTracks().forEach(t => t.stop());
      }
      connections = {};
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- sending our local stream to every peer ----------

  let createAndSendOffer = (id) => {
    connections[id]
      .createOffer()
      .then((description) => connections[id].setLocalDescription(description))
      .then(() => {
        socketRef.current.emit(
          "signal",
          id,
          JSON.stringify({ sdp: connections[id].localDescription }),
        );
      })
      .catch((e) => console.log(e));
  };

  let sendStreamToPeers = (stream) => {
    for (let id in connections) {
      const pc = connections[id];
      let needsOffer = false;

      stream.getTracks().forEach((track) => {
        const sender = pc
          .getSenders()
          .find((s) => s.track && s.track.kind === track.kind);

        if (sender) {
          sender.replaceTrack(track).catch((e) => console.log(e));
        } else {
          pc.addTrack(track, stream);
          needsOffer = true;
        }
      });

      if (needsOffer) createAndSendOffer(id);
    }
  };

  // GET USER MEDIA SUCCESS

  let getUserMediaSuccess = (stream) => {
    try {
      window.localStream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }

    const finalStream = withBothTracks(stream);
    window.localStream = finalStream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = finalStream;
    }

    sendStreamToPeers(finalStream);

    stream.getTracks().forEach((track) => {
      track.onended = () => {
        setVideo(false);
        setAudio(false);
      };
    });
  };

  // GET USER MEDIA

  let getUserMedia = () => {
    if (video !== undefined && audio !== undefined) {
      if (!video && !audio) {
        getUserMediaSuccess(new MediaStream());
        return;
      }

      navigator.mediaDevices
        .getUserMedia({
          video: video,
          audio: audio,
        })
        .then((stream) => {
          getUserMediaSuccess(stream);
        })
        .catch((e) => {
          console.log(e);
        });
    } else {
      try {
        let tracks = localVideoRef.current.srcObject.getTracks();
        tracks.forEach((track) => {
          track.stop();
        });
      } catch (e) {
        console.log(e);
      }
    }
  };

  // WHEN VIDEO / AUDIO STATE CHANGES

  useEffect(() => {
    if (video !== undefined && audio !== undefined) {
      getUserMedia();
    }
  }, [video, audio]); // eslint-disable-line react-hooks/exhaustive-deps

  // Broadcast video state to peers
  useEffect(() => {
    if (video !== undefined && socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("video-state-changed", video);
    }
  }, [video]);

  let getMessageFromServer = (fromId, message) => {
    var signal = JSON.parse(message);

    if (fromId !== socketIdRef.current) {
      if (!connections[fromId]) {
        console.log("Signal from unknown peer", fromId);
        return;
      }

      if (signal.sdp) {
        connections[fromId]
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            if (connections[fromId].pendingCandidates) {
              connections[fromId].pendingCandidates.forEach((candidate) => {
                connections[fromId]
                  .addIceCandidate(new RTCIceCandidate(candidate))
                  .catch((e) => console.log(e));
              });
              connections[fromId].pendingCandidates = [];
            }

            if (signal.sdp.type === "offer") {
              connections[fromId]
                .createAnswer()
                .then((description) =>
                  connections[fromId].setLocalDescription(description),
                )
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    fromId,
                    JSON.stringify({
                      sdp: connections[fromId].localDescription,
                    }),
                  );
                })
                .catch((e) => console.log(e));
            }
          })
          .catch((e) => console.log(e));
      }

      if (signal.ice) {
        if (connections[fromId].remoteDescription) {
          connections[fromId]
            .addIceCandidate(new RTCIceCandidate(signal.ice))
            .catch((e) => console.log(e));
        } else {
          if (!connections[fromId].pendingCandidates) {
            connections[fromId].pendingCandidates = [];
          }
          connections[fromId].pendingCandidates.push(signal.ice);
        }
      }
    }
  };

  let routeTo = useNavigate();

  let addMessage = (data, sender, socketIdSender, timestamp) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        data: data,
        sender: sender,
        socketIdSender: socketIdSender,
        timestamp: timestamp || new Date().toISOString(),
      },
    ]);

    if (socketIdSender !== socketIdRef.current) {
      setNewMessages((prev) => prev + 1);
    }
  };

  // SOCKET CONNECTION

  let connectToSocketServer = () => {
    console.log("Connecting to socket server...");

    socketRef.current = io.connect(server_url, {
      secure: false,
    });

    socketRef.current.on("signal", getMessageFromServer);

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;
      setSocketId(socketRef.current.id);

      // Pass username to server when joining
      socketRef.current.emit("join-call", window.location.href, username);

      socketRef.current.on("chat-message", addMessage);

      // Receive peer metadata (username, videoEnabled)
      socketRef.current.on("user-meta", (id, meta) => {
        setPeerMeta((prev) => ({ ...prev, [id]: meta }));
      });

      // Receive video state changes from peers
      socketRef.current.on("video-state-changed", (id, videoEnabled) => {
        setPeerMeta((prev) => ({
          ...prev,
          [id]: { ...(prev[id] || {}), videoEnabled },
        }));
      });

      socketRef.current.on("user-left", (id) => {
        setVideos((videos) => videos.filter((video) => video.socketId !== id));
        setPeerMeta((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });

        if (connections[id]) {
          connections[id].close();
          delete connections[id];
        }
      });

      socketRef.current.on("user-joined", (id, clients) => {
        if (!window.localStream) {
          window.localStream = blackSilence();
        }

        clients.forEach((socketListId) => {
          if (socketListId === socketIdRef.current) return;
          if (connections[socketListId]) return;

          const pc = new RTCPeerConnection(peerConnection);
          connections[socketListId] = pc;

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              socketRef.current.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate }),
              );
            }
          };

          pc.oniceconnectionstatechange = () =>
            console.log("ICE", socketListId, pc.iceConnectionState);

          pc.ontrack = (event) => {
            console.log("ontrack", socketListId, event.track.kind);
            const stream = event.streams[0];
            setVideos((prev) => {
              const exists = prev.some((v) => v.socketId === socketListId);
              const updated = exists
                ? prev.map((v) =>
                    v.socketId === socketListId ? { ...v, stream } : v,
                  )
                : [...prev, { socketId: socketListId, stream }];
              videoRef.current = updated;
              return updated;
            });
          };

          window.localStream
            .getTracks()
            .forEach((t) => pc.addTrack(t, window.localStream));
        });

        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            createAndSendOffer(id2);
          }
        }
      });
    });
  };

  let handleVideo = () => {
    setVideo(!video);
  };

  let handleAudio = () => {
    setAudio(!audio);
  };

  // ---------- SCREEN SHARE ----------

  let getDisplayMediaSuccess = (stream) => {
    const oldStream = window.localStream;
    const keptAudio = oldStream ? oldStream.getAudioTracks()[0] : null;

    try {
      oldStream.getVideoTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }

    stream.getAudioTracks().forEach((track) => track.stop());

    const tracks = [...stream.getVideoTracks()];
    if (keptAudio) tracks.push(keptAudio);

    const newStream = withBothTracks(new MediaStream(tracks));
    window.localStream = newStream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = newStream;
    }

    sendStreamToPeers(newStream);

    stream.getVideoTracks()[0].onended = () => {
      setscreen(false);
    };
  };

  let getDisplayMedia = () => {
    if (navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices
        .getDisplayMedia({ video: true, audio: true })
        .then(getDisplayMediaSuccess)
        .catch((e) => {
          console.log(e);
          setscreen(false);
        });
    }
  };

  useEffect(() => {
    if (screen === undefined) return;

    if (screen) {
      getDisplayMedia();
    } else {
      getUserMedia();
    }
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  let handleScreen = () => {
    setscreen(!screen);
  };

  let handleSend = () => {
    if (!message.trim()) return;
    socketRef.current.emit("chat-message", message, username);
    setMessage("");
  };

  let handleEndCall = () => {
    try {
      let tracks = localVideoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    routeTo("/home");
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className={styles.meetVideoContainer}>
      {/* CHAT PANEL */}
      {showModal && (
        <div className={styles.chatRoom}>
          <div className={styles.chatContainer}>
            <div className={styles.chatHeader}>
              <h3>Chat</h3>
              <IconButton
                size="small"
                onClick={() => setModal(false)}
                sx={{ color: "rgba(255,255,255,0.5)" }}
              >
                ✕
              </IconButton>
            </div>

            <div className={styles.chattingDisplay}>
              {messages.length > 0 ? (
                messages.map((item, index) => {
                  const isOwn = item.socketIdSender === socketIdRef.current;
                  return (
                    <div
                      key={index}
                      className={`${styles.chatMessage} ${isOwn ? styles.chatMessageOwn : styles.chatMessageOther}`}
                    >
                      {!isOwn && (
                        <div className={styles.chatAvatar}>
                          {getInitials(item.sender)}
                        </div>
                      )}
                      <div className={styles.chatBubble}>
                        {!isOwn && (
                          <span className={styles.chatSender}>{item.sender}</span>
                        )}
                        <p className={styles.chatText}>{item.data}</p>
                        <span className={styles.chatTime}>
                          {formatTime(item.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className={styles.chatEmpty}>No messages yet</p>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className={styles.chattingArea}>
              <TextField
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                placeholder="Type a message..."
                variant="outlined"
                size="small"
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.08)",
                    color: "#fff",
                    "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
                    "&:hover fieldset": { borderColor: "rgba(255,255,255,0.22)" },
                    "&.Mui-focused fieldset": { borderColor: "#ffa116" },
                  },
                }}
              />
              <IconButton
                onClick={handleSend}
                sx={{
                  color: "#ffa116",
                  "&:hover": { bgcolor: "rgba(255,161,22,0.15)" },
                }}
              >
                <SendIcon />
              </IconButton>
            </div>
          </div>
        </div>
      )}

      {/* CONTROL BAR */}
      <div className={styles.buttonContainers}>
        <IconButton onClick={handleVideo} style={{ color: "white" }}>
          {video === true ? <VideocamIcon /> : <VideocamOffIcon />}
        </IconButton>
        <IconButton onClick={handleEndCall} className={styles.endCallBtn}>
          <CallEndIcon />
        </IconButton>
        <IconButton onClick={handleAudio} style={{ color: "white" }}>
          {audio === true ? <MicIcon /> : <MicOffIcon />}
        </IconButton>

        {screenAvailable === true && (
          <IconButton onClick={handleScreen} style={{ color: "white" }}>
            {screen === true ? <StopScreenShareIcon /> : <ScreenShareIcon />}
          </IconButton>
        )}

        <Badge badgeContent={newMessages} max={999} color="secondary">
          <IconButton
            onClick={() => setModal(!showModal)}
            style={{ color: "white" }}
          >
            <ChatIcon />
          </IconButton>
        </Badge>
      </div>

      {/* LOCAL VIDEO */}
      <div className={styles.localVideoWrapper}>
        {video ? (
          <video
            className={styles.meetUserVideo}
            ref={localVideoRef}
            autoPlay
            muted
          />
        ) : (
          <div className={styles.localAvatarFallback}>
            <PersonIcon sx={{ fontSize: 48, color: "rgba(255,255,255,0.4)" }} />
          </div>
        )}
        <span className={styles.localLabel}>{username} (You)</span>
      </div>

      {/* REMOTE PARTICIPANTS */}
      <div className={styles.conferenceView}>
        {videos.map((vid) => {
          const meta = peerMeta[vid.socketId] || {};
          const peerVideoEnabled = meta.videoEnabled !== false;
          const peerName = meta.username || vid.socketId;

          return (
            <div className={styles.remoteTile} key={vid.socketId}>
              {peerVideoEnabled ? (
                <video
                  data-socket={vid.socketId}
                  ref={(ref) => {
                    if (ref && vid.stream && ref.srcObject !== vid.stream) {
                      ref.srcObject = vid.stream;
                    }
                  }}
                  autoPlay
                  playsInline
                />
              ) : (
                <div className={styles.remoteAvatarFallback}>
                  <PersonIcon
                    sx={{ fontSize: 64, color: "rgba(255,255,255,0.3)" }}
                  />
                </div>
              )}
              <p className={styles.remoteLabel}>{peerName}</p>
            </div>
          );
        })}
      </div>

      {/* Hidden video element to keep the stream alive when avatar is shown */}
      {!video && (
        <video
          ref={localVideoRef}
          autoPlay
          muted
          style={{ display: "none" }}
        />
      )}
    </div>
  );
}
