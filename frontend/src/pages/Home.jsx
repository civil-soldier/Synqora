import React, { useContext, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';
import IconButton from '@mui/material/IconButton';
import RestoreIcon from '@mui/icons-material/Restore';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { AuthContext } from '../contexts/AuthContext';

function HomeComponent() {
  const navigate = useNavigate();
  const { userData, isAuthenticated, addToUserHistory, handleLogout, getHistoryOfUser } = useContext(AuthContext);

  const loggedIn = isAuthenticated();
  const displayNameFromAuth = userData?.name || userData?.username || '';

  // Pre-join controls
  const [displayName, setDisplayName] = useState(loggedIn ? displayNameFromAuth : '');
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);
  const [roomId, setRoomId] = useState('');
  const [snackMsg, setSnackMsg] = useState('');
  const [snackOpen, setSnackOpen] = useState(false);

  // History
  const [meetings, setMeetings] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Camera preview
  const previewRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const startPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (!cancelled) {
          streamRef.current = stream;
          if (previewRef.current) {
            previewRef.current.srcObject = stream;
          }
        } else {
          stream.getTracks().forEach(t => t.stop());
        }
      } catch (e) {
        console.log('Camera not available for preview:', e);
      }
    };

    if (videoOn) {
      startPreview();
    } else {
      // Stop the preview stream when camera is toggled off
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (previewRef.current) {
        previewRef.current.srcObject = null;
      }
    }

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [videoOn]);

  // Fetch history on mount for logged-in users
  useEffect(() => {
    if (loggedIn) {
      setHistoryLoading(true);
      getHistoryOfUser()
        .then(data => setMeetings(data || []))
        .catch(() => setMeetings([]))
        .finally(() => setHistoryLoading(false));
    }
  }, [loggedIn]);

  const generateRoomId = () => {
    // Generate a short readable room ID
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 9; i++) {
      if (i === 3 || i === 6) id += '-';
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  };

  const parseRoomId = (input) => {
    // If it's a URL, extract the last path segment
    try {
      const url = new URL(input);
      return url.pathname.replace(/^\//, '');
    } catch {
      return input.trim();
    }
  };

  const joinRoom = async (id) => {
    if (!id) {
      setSnackMsg('Please enter a Room ID or URL');
      setSnackOpen(true);
      return;
    }

    const name = displayName.trim() || 'Guest';

    // Stop camera preview before navigating
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    // Add to history if logged in
    if (loggedIn) {
      try {
        await addToUserHistory(id);
      } catch (e) {
        console.log('Failed to save to history:', e);
      }
    }

    navigate(`/${id}`, {
      state: {
        username: name,
        videoOn: videoOn,
        audioOn: audioOn,
      }
    });
  };

  const handleCreateRoom = () => {
    if (!loggedIn) return;
    const newRoomId = generateRoomId();
    joinRoom(newRoomId);
  };

  const handleJoinRoom = () => {
    const id = parseRoomId(roomId);
    joinRoom(id);
  };

  const handleCopyRoomId = (code) => {
    navigator.clipboard.writeText(code);
    setSnackMsg('Room ID copied!');
    setSnackOpen(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="homePageWrapper">
      {/* NAVBAR */}
      <div className="homeNavbar">
        <img src="/logo1.png" alt="Synqora" className="homeNavLogo" />
        <div className="homeNavRight">
          {loggedIn ? (
            <>
              <span className="homeUserGreeting">
                <PersonIcon fontSize="small" />
                {userData?.name || userData?.username}
              </span>
              <Button
                size="small"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{ color: '#ff6b6b', textTransform: 'none', fontWeight: 600 }}
              >
                Logout
              </Button>
            </>
          ) : (
            <Button
              size="small"
              startIcon={<LoginIcon />}
              onClick={() => navigate('/auth', { state: { tab: 'login' } })}
              sx={{ color: '#ffa116', textTransform: 'none', fontWeight: 600 }}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>

      <div className="homeContent">
        {/* LEFT COLUMN - Pre-join controls + actions */}
        <div className="homeLeftColumn">
          {/* Camera Preview */}
          <div className="previewContainer">
            {videoOn ? (
              <video
                ref={previewRef}
                autoPlay
                muted
                playsInline
                className="previewVideo"
              />
            ) : (
              <div className="previewPlaceholder">
                <PersonIcon sx={{ fontSize: 80, color: 'rgba(255,255,255,0.3)' }} />
              </div>
            )}

            {/* Media controls overlay */}
            <div className="previewControls">
              <IconButton
                onClick={() => setAudioOn(!audioOn)}
                sx={{
                  color: audioOn ? '#fff' : '#ff6b6b',
                  bgcolor: audioOn ? 'rgba(255,255,255,0.15)' : 'rgba(255,107,107,0.2)',
                  '&:hover': {
                    bgcolor: audioOn ? 'rgba(255,255,255,0.25)' : 'rgba(255,107,107,0.3)',
                  },
                }}
              >
                {audioOn ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
              <IconButton
                onClick={() => setVideoOn(!videoOn)}
                sx={{
                  color: videoOn ? '#fff' : '#ff6b6b',
                  bgcolor: videoOn ? 'rgba(255,255,255,0.15)' : 'rgba(255,107,107,0.2)',
                  '&:hover': {
                    bgcolor: videoOn ? 'rgba(255,255,255,0.25)' : 'rgba(255,107,107,0.3)',
                  },
                }}
              >
                {videoOn ? <VideocamIcon /> : <VideocamOffIcon />}
              </IconButton>
            </div>
          </div>

          {/* Display Name */}
          <TextField
            fullWidth
            size="small"
            label="Your Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={loggedIn ? displayNameFromAuth : 'Guest'}
            sx={{
              mt: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                background: 'rgba(17,17,20,0.72)',
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.22)' },
                '&.Mui-focused fieldset': { borderColor: '#ffa116' },
              },
              '& .MuiInputLabel-root': { color: '#777' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#ffa116' },
            }}
          />
        </div>

        {/* RIGHT COLUMN - Action cards */}
        <div className="homeRightColumn">
          {/* Create Room Card */}
          <Tooltip
            title={!loggedIn ? 'Sign in to create rooms' : ''}
            placement="top"
          >
            <div className={`homeActionCard ${!loggedIn ? 'homeActionCardDisabled' : ''}`}>
              <div className="homeActionCardInner" onClick={handleCreateRoom}>
                <VideoCallIcon sx={{ fontSize: 36, color: '#ffa116' }} />
                <div>
                  <h3>Create a Room</h3>
                  <p>Start a new video conference</p>
                </div>
              </div>
            </div>
          </Tooltip>

          {/* Join Room Card */}
          <div className="homeActionCard">
            <div className="homeActionCardInner homeJoinCard">
              <LoginIcon sx={{ fontSize: 36, color: '#ffa116' }} />
              <div style={{ flex: 1 }}>
                <h3>Join a Room</h3>
                <div className="joinRoomInputRow">
                  <TextField
                    size="small"
                    placeholder="Room ID or URL"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleJoinRoom(); }}
                    sx={{
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        background: 'rgba(17,17,20,0.72)',
                        color: '#fff',
                        height: 40,
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.22)' },
                        '&.Mui-focused fieldset': { borderColor: '#ffa116' },
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleJoinRoom}
                    sx={{
                      bgcolor: '#ffa116',
                      color: '#080808',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 2,
                      height: 40,
                      '&:hover': { bgcolor: '#ffad2f' },
                    }}
                  >
                    Join
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* History Card */}
          <Tooltip
            title={!loggedIn ? 'Sign in to view history' : ''}
            placement="top"
          >
            <div className={`homeActionCard homeHistoryCard ${!loggedIn ? 'homeActionCardDisabled' : ''}`}>
              <div className="homeActionCardInner">
                <RestoreIcon sx={{ fontSize: 36, color: '#ffa116' }} />
                <div style={{ flex: 1 }}>
                  <h3>Meeting History</h3>
                  {loggedIn ? (
                    <div className="historyList">
                      {historyLoading ? (
                        <p className="historyEmpty">Loading...</p>
                      ) : meetings.length > 0 ? (
                        meetings.slice(-5).reverse().map((m, i) => (
                          <div key={i} className="historyItem">
                            <span className="historyCode">{m.meetingCode}</span>
                            <span className="historyDate">{formatDate(m.date)}</span>
                            <IconButton
                              size="small"
                              onClick={() => handleCopyRoomId(m.meetingCode)}
                              sx={{ color: 'rgba(255,255,255,0.5)', ml: 'auto' }}
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </div>
                        ))
                      ) : (
                        <p className="historyEmpty">No meetings yet</p>
                      )}
                    </div>
                  ) : (
                    <p className="historyEmpty">Sign in to see your history</p>
                  )}
                </div>
              </div>
            </div>
          </Tooltip>
        </div>
      </div>

      <Snackbar
        open={snackOpen}
        autoHideDuration={2000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message={snackMsg}
      />
    </div>
  );
}

export default HomeComponent;