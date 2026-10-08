import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../Styles/VideoComponent.module.css";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import Badge from "@mui/material/Badge";
import { io } from "socket.io-client";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import { Button, TextField, IconButton } from "@mui/material";

const server_url = "http://localhost:8000";

var connections = {};

const peerConnection = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

// ---------- helpers (no React state needed, so they live outside the component) ----------

// A silent, disabled audio track (used when the mic is off / unavailable)
const silence = () => {
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();

  const dst = oscillator.connect(ctx.createMediaStreamDestination());

  oscillator.start();
  ctx.resume();

  return Object.assign(dst.stream.getAudioTracks()[0], {
    enabled: false,
  });
};

// A black, disabled video track (used when the camera is off / unavailable)
const black = ({ width = 640, height = 480 } = {}) => {
  const canvas = Object.assign(document.createElement("canvas"), {
    width,
    height,
  });

  canvas.getContext("2d").fillRect(0, 0, width, height);

  const stream = canvas.captureStream();

  return Object.assign(stream.getVideoTracks()[0], {
    enabled: false,
  });
};

const blackSilence = () => new MediaStream([black(), silence()]);

// Makes sure a stream always has exactly one video + one audio track,
// so the peers always have something to receive / replace.
const withBothTracks = (stream) => {
  const tracks = [...stream.getTracks()];
  if (stream.getVideoTracks().length === 0) tracks.push(black());
  if (stream.getAudioTracks().length === 0) tracks.push(silence());
  return new MediaStream(tracks);
};

export default function VideoMeet() {
  var socketRef = useRef();
  let socketIdRef = useRef();
  let localVideoRef = useRef();

  let [videoAvailable, setVideoAvailable] = useState(true);
  let [audioAvailable, setAudioAvailable] = useState(true);
  let [video, setVideo] = useState();
  let [audio, setAudio] = useState();
  let [screen, setscreen] = useState();
  let [showModal, setModal] = useState();
  let [screenAvailable, setScreenAvailable] = useState();
  let [messages, setMessages] = useState([]);
  let [message, setMessage] = useState("");
  let [newMessages, setNewMessages] = useState(0);
  let [askForUsername, setAskForUsername] = useState(true);
  let [username, setUserName] = useState("");
  let [socketId, setSocketId] = useState("");

  const videoRef = useRef([]);
  let [videos, setVideos] = useState([]);

  // GET CAMERA / MICROPHONE PERMISSIONS

  useEffect(() => {
    const getPermissions = async () => {
      let hasVideo = false;
      let hasAudio = false;

      // Camera permission (checked separately so a missing camera doesn't block the mic)
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        s.getTracks().forEach((t) => t.stop());
        hasVideo = true;
      } catch (error) {
        console.log("No camera access:", error);
      }

      // Microphone permission
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
        hasAudio = true;
      } catch (error) {
        console.log("No microphone access:", error);
      }

      setVideoAvailable(hasVideo);
      setAudioAvailable(hasAudio);

      // Screen sharing availability
      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

      if (hasVideo || hasAudio) {
        try {
          const userMediaStream = await navigator.mediaDevices.getUserMedia({
            video: hasVideo,
            audio: hasAudio,
          });

          const stream = withBothTracks(userMediaStream);
          window.localStream = stream;

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.log("Error while getting local stream:", error);
        }
      } else {
        alert("Please allow access to camera and microphone");
      }
    };

    getPermissions();
  }, []);

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

  // CHANGED: instead of addTrack on every change (which piles up duplicate senders),
  // swap the track on the existing sender with replaceTrack. No renegotiation needed.
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

    // always keep one video + one audio track (black / silent if missing)
    const finalStream = withBothTracks(stream);
    window.localStream = finalStream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = finalStream;
    }

    sendStreamToPeers(finalStream);

    // if the browser / OS kills the camera or mic, fall back to black + silence
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
      // both off -> getUserMedia({video:false, audio:false}) would throw,
      // so just send black + silence instead
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
  }, [video, audio]);

  // GET MEDIA

  let getMedia = () => {
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    connectToSocketServer();
  };

  // CONNECT BUTTON

  let connect = () => {
    setAskForUsername(false);
    getMedia();
  };

  let getMessageFromServer = (fromId, message) => {
    var signal = JSON.parse(message);

    if (fromId !== socketIdRef.current) {
      // CHANGED: guard so a signal that arrives before the connection exists doesn't crash
      if (!connections[fromId]) {
        console.log("Signal from unknown peer", fromId);
        return;
      }

      // SDP
      if (signal.sdp) {
        connections[fromId]
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            // add queued ICE candidates after remote description
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

      // ICE
      if (signal.ice) {
        // wait until remote description exists
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

  let addMessage = (data, sender, socketIdSender) => {
  setMessages((prevMessages) => [
    ...prevMessages,
    {
      data: data,
      sender: sender,
      socketIdSender: socketIdSender,
    },
  ]);

  if (socketIdSender !== socketIdRef.current) {
    setNewMessages((prevMessages) => prevMessages + 1);
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
      // set socket ID BEFORE joining room
      socketIdRef.current = socketRef.current.id;
      setSocketId(socketRef.current.id);

      socketRef.current.emit("join-call", window.location.href);

      socketRef.current.on("chat-message", addMessage);

      socketRef.current.on("user-left", (id) => {
        setVideos((videos) => videos.filter((video) => video.socketId !== id));

        // CHANGED: close the peer connection before dropping it
        if (connections[id]) {
          connections[id].close();
          delete connections[id];
        }
      });

      socketRef.current.on("user-joined", (id, clients) => {
        // CHANGED: make sure we always have something to send (black + silence fallback)
        if (!window.localStream) {
          window.localStream = blackSilence();
        }

        clients.forEach((socketListId) => {
          if (socketListId === socketIdRef.current) return;
          if (connections[socketListId]) return; // don't overwrite

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
    // CHANGED: keep the current mic/silent audio track, only stop the old camera video
    const oldStream = window.localStream;
    const keptAudio = oldStream ? oldStream.getAudioTracks()[0] : null;

    try {
      oldStream.getVideoTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }

    // drop the tab/system audio from the screen capture, we keep the mic instead
    stream.getAudioTracks().forEach((track) => track.stop());

    const tracks = [...stream.getVideoTracks()];
    if (keptAudio) tracks.push(keptAudio);

    const newStream = withBothTracks(new MediaStream(tracks));
    window.localStream = newStream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = newStream;
    }

    sendStreamToPeers(newStream);

    // when the user clicks the browser's own "Stop sharing" button
    // CHANGED: was setScreen (doesn't exist) -> setscreen
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
          setscreen(false); // user cancelled the picker
        });
    }
  };

  // CHANGED: sharing ON -> start it, sharing OFF -> go back to camera + mic
  useEffect(() => {
    if (screen === undefined) return;

    if (screen) {
      getDisplayMedia();
    } else {
      getUserMedia();
    }
  }, [screen]);

  let handleScreen = () => {
    setscreen(!screen);
  };

  let handleSend = () => {
    socketRef.current.emit("chat-message", message , username);
    setMessage("");
  }

  let handleEndCall = () => {
    try{
      let tracks = localVideoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    } catch(e){
      console.log(e);
    }

    routeTo("/");
  }

  return (
    <div>
      {askForUsername === true ? (
        <div>
          <h2>Enter into Lobby</h2>

          <TextField
            id="outlined-basic"
            label="Username"
            value={username}
            onChange={(e) => setUserName(e.target.value)}
            variant="outlined"
          />

          <Button variant="contained" onClick={connect}>
            Connect
          </Button>

          <div>
            <video ref={localVideoRef} autoPlay muted />
          </div>
        </div>
      ) : (
        <div className={styles.meetVideoContainer}>

          {showModal ? <div className={styles.chatRoom}>
            <div className={styles.chatContainer}>
            <h1>Chat</h1>
            <div className={styles.chattingDisplay}>

              {messages.length > 0 ? (
                messages.map((item, index) => (
                  <div style={{ marginBottom: "10px" }} key={index}>
                    <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                    <p>{item.data}</p>
                  </div>
                ))
              ) : (
                <p>No messages yet.</p>
              )}
              
            </div>
            <div className={styles.chattingArea}>
            <TextField value={message} onChange={(e) => setMessage(e.target.value)} id="outlined-basic" label="Enter your message" variant="outlined" />
            <Button variant="contained" onClick={handleSend}>
              Send
            </Button>
            </div>
            </div>
          </div>:<></>}

          <div className={styles.buttonContainers}>
            <IconButton onClick={handleVideo} style={{ color: "white" }}>
              {video === true ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
            <IconButton onClick={handleEndCall} style={{ color: "red" }}>
              <CallEndIcon />
            </IconButton>
            <IconButton onClick={handleAudio} style={{ color: "white" }}>
              {audio === true ? <MicIcon /> : <MicOffIcon />}
            </IconButton>

            {screenAvailable === true ? (
              <IconButton onClick={handleScreen} style={{ color: "white" }}>
                {/* CHANGED: icons were swapped - show "stop" while sharing */}
                {screen === true ? <StopScreenShareIcon /> : <ScreenShareIcon />}
              </IconButton>
            ) : (
              <></>
            )}

            <Badge badgeContent={newMessages} max={999} color="secondary">
              <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
                <ChatIcon />
              </IconButton>
            </Badge>
          </div>

          {/* CHANGED: className="meetUserVideo" -> styles.meetUserVideo (CSS modules hash class names) */}
          <video
            className={styles.meetUserVideo}
            ref={localVideoRef}
            autoPlay
            muted
          />

          <div className={styles.conferenceView}>
            {videos.map((video) => (
              <div className={styles.remoteTile} key={video.socketId}>
                <video
                  data-socket={video.socketId}
                  ref={(ref) => {
                    if (ref && video.stream && ref.srcObject !== video.stream) {
                      ref.srcObject = video.stream;
                    }
                  }}
                  autoPlay
                  playsInline
                />

                <p className={styles.remoteLabel}>{video.socketId}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
