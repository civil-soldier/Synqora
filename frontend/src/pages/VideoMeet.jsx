import React, { useRef, useState, useEffect } from "react";

import "../Styles/VideoComponent.css";

import { io } from "socket.io-client";

import { Button, TextField } from "@mui/material";

const server_url = "http://localhost:8000";

var connections = {};

const peerConnection = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
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

  const videoRef = useRef([]);
  let [videos, setVideos] = useState([]);

  // GET CAMERA / MICROPHONE PERMISSIONS
  useEffect(() => {
    const getPermissions = async () => {
      try {
        // Camera permission
        const videoPermission = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        if (videoPermission) {
          setVideoAvailable(true);
        } else {
          setVideoAvailable(false);
        }

        // Microphone permission
        const audioPermission = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        if (audioPermission) {
          setAudioAvailable(true);
        } else {
          setAudioAvailable(false);
        }

        // Screen sharing availability
        if (navigator.mediaDevices.getDisplayMedia) {
          setScreenAvailable(true);
        } else {
          setScreenAvailable(false);
        }

        // Get camera + microphone stream
        if (videoPermission || audioPermission) {
          const userMediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });

          if (userMediaStream) {
            window.localStream = userMediaStream;

            if (localVideoRef.current) {
              localVideoRef.current.srcObject = userMediaStream;
            }
          }
        } else {
          alert("Please allow access to camera and microphone");
        }
      } catch (error) {
        console.log("Error while getting permissions:", error);
      }
    };

    getPermissions();
  }, []);

  // GET USER MEDIA SUCCESS
  let getUserMediaSuccess = (stream) => {
    try {
      window.localStream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      connections[id].addStream(window.localStream);

      connections[id].createOffer().then((description) => {
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({
                sdp: connections[id].localDescription,
              }),
            );
          })
          .catch((e) => console.log(e));
      });
    }

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setVideo(false);
          setAudio(false);

          try {
            let tracks = localVideoRef.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (e) {
            console.log(e);
          }

          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);

          window.localStream = blackSilence();

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = window.localStream;
          }

          for (let id in connections) {
            connections[id].addStream(window.localStream);

            connections[id].createOffer().then((description) => {
              connections[id]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id,
                    JSON.stringify({
                      sdp: connections[id].localDescription,
                    }),
                  );
                })
                .catch((e) => console.log(e));
            });
          }
        }),
    );
  };

  let silence = () => {
    let ctx = new AudioContext();
    let oscillator = ctx.createOscillator();

    let dst = oscillator.connect(ctx.createMediaStreamDestination());

    oscillator.start();
    ctx.resume();

    return Object.assign(dst.stream.getAudioTracks()[0], {
      enabled: false,
    });
  };

  let black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });

    canvas.getContext("2d").fillRect(0, 0, width, height);

    let stream = canvas.captureStream();

    return Object.assign(stream.getVideoTracks()[0], {
      enabled: false,
    });
  };

  // GET USER MEDIA
  let getUserMedia = () => {
    if (video !== undefined && audio !== undefined) {
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
      if (signal.sdp) {
        connections[fromId]
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            if (signal.sdp.type === "offer") {
              connections[fromId].createAnswer().then((description) => {
                connections[fromId]
                  .setLocalDescription(description)
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
              });
            }
          })
          .catch((e) => console.log(e));
      }

      if (signal.ice) {
        connections[fromId]
          .addIceCandidate(new RTCIceCandidate(signal.ice))
          .catch((e) => console.log(e));
      }
    }
  };

  let addMessage = (data, sender, socketIdSender) => {};

  // SOCKET CONNECTION
  let connectToSocketServer = () => {
    console.log("Connecting to socket server...");

    socketRef.current = io.connect(server_url, {
      secure: false,
    });

    socketRef.current.on("signal", getMessageFromServer);

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join-call", window.location.href);

      socketIdRef.current = socketRef.current.id;

      socketRef.current.on("chat-message", addMessage);

      socketRef.current.on("user-left", (id) => {
        setVideos((videos) => videos.filter((video) => video.socketId !== id));
      });

      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketListId) => {
          connections[socketListId] = new RTCPeerConnection(peerConnection);

          connections[socketListId].onicecandidate = (event) => {
            if (event.candidate != null) {
              socketRef.current.emit(
                "signal",
                socketListId,
                JSON.stringify({
                  ice: event.candidate,
                }),
              );
            }
          };

          connections[socketListId].onaddstream = (event) => {
            let videoExists = videoRef.current.find(
              (video) => video.socketId === socketListId,
            );

            if (videoExists) {
              setVideos((videos) => {
                const updateVideos = videos.map((video) =>
                  video.socketId === socketListId
                    ? {
                        ...video,
                        stream: event.stream,
                      }
                    : video,
                );

                videoRef.current = updateVideos;

                return updateVideos;
              });
            } else {
              let newVideo = {
                socketId: socketListId,
                stream: event.stream,
                autoPlay: true,
                playInline: true,
              };

              setVideos((videos) => {
                const updateVideos = [...videos, newVideo];

                videoRef.current = updateVideos;

                return updateVideos;
              });
            }
          };

          if (window.localStream !== undefined && window.localStream !== null) {
            connections[socketListId].addStream(window.localStream);
          } else {
            let blackSilence = (...args) =>
              new MediaStream([black(...args), silence()]);

            window.localStream = blackSilence();

            connections[socketListId].addStream(window.localStream);
          }
        });

        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            if (id2 === socketIdRef.current) continue;

            try {
              connections[id2].addStream(window.localStream);
            } catch (e) {}

            connections[id2].createOffer().then((description) => {
              connections[id2]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id2,
                    JSON.stringify({
                      sdp: connections[id2].localDescription,
                    }),
                  );
                })
                .catch((e) => console.log(e));
            });
          }
        }
      });
    });
  };

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
        <>
          <video ref={localVideoRef} autoPlay muted></video>

          {videos.map((video) => (
            <div key={video.socketId}></div>
          ))}
        </>
      )}
    </div>
  );
}
