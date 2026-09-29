import React, { useRef, useState, useEffect } from "react";

import "../Styles/VideoComponent.css";

import { io } from "socket.io-client";

import { Button, TextField } from "@mui/material";

const server_url = "http://localhost:8000";

var connections = {};

const peerConnection = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
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
                const videoPermission =
                    await navigator.mediaDevices.getUserMedia({
                        video: true
                    });

                if (videoPermission) {
                    setVideoAvailable(true);
                } else {
                    setVideoAvailable(false);
                }


                // Microphone permission
                const audioPermission =
                    await navigator.mediaDevices.getUserMedia({
                        audio: true
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

                    const userMediaStream =
                        await navigator.mediaDevices.getUserMedia({
                            video: true,
                            audio: true
                        });

                    if (userMediaStream) {

                        window.localStream = userMediaStream;

                        if (localVideoRef.current) {
                            localVideoRef.current.srcObject =
                                userMediaStream;
                        }
                    }

                } else {

                    alert(
                        "Please allow access to camera and microphone"
                    );
                }

            } catch (error) {

                console.log(
                    "Error while getting permissions:",
                    error
                );

            }
        };

        getPermissions();

    }, []);


    // GET USER MEDIA SUCCESS

    let getUserMediaSuccess = (stream) => {

        window.localStream = stream;

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }
    };


    // GET USER MEDIA

    let getUserMedia = () => {

        if (video !== undefined && audio !== undefined) {

            navigator.mediaDevices.getUserMedia({
                video: video,
                audio: audio
            })
            .then((stream) => {
                getUserMediaSuccess(stream);
            })
            .catch((e) => {
                console.log(e);
            });

        } else {

            try {

                let tracks =
                    localVideoRef.current.srcObject.getTracks();

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


    // SOCKET CONNECTION

    let connectToSocketServer = () => {

        console.log("Connecting to socket server...");

        socketRef.current = io(server_url);

        socketRef.current.on("connect", () => {

            console.log(
                "Connected to socket server:",
                socketRef.current.id
            );

            socketIdRef.current =
                socketRef.current.id;

        });
    };

    return (

        <div>

            {askForUsername === true ? (

                <div>

                    <h2>
                        Enter into Lobby
                    </h2>


                    <TextField
                        id="outlined-basic"
                        label="Username"
                        value={username}
                        onChange={(e) =>
                            setUserName(e.target.value)
                        }
                        variant="outlined"
                    />


                    <Button
                        variant="contained"
                        onClick={connect}
                    >
                        Connect
                    </Button>


                    <div>

                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                        />

                    </div>

                </div>

            ) : (

                <></>

            )}

        </div>

    );
}