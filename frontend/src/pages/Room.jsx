import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import api from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import { Users, Copy, Mic, Square, AlertCircle, CheckCircle2 } from 'lucide-react';

const Room = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const { startListening, stopListening, transcript, isListening, error: speechError } = useSpeechRecognition();

  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [buzzerStatus, setBuzzerStatus] = useState({ occupied: false, userId: null, userName: null });
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  
  const speechStartRef = useRef(null);

  useEffect(() => {
    fetchRoomDetails();
  }, [id]);

  useEffect(() => {
    if (!socket || !room) return;

    socket.emit('join-room', { roomId: id, userId: user.id, userName: user.name });

    socket.on('participant-update', (updatedParticipants) => {
      setParticipants(updatedParticipants);
    });

    socket.on('buzzer-update', (status) => {
      setBuzzerStatus(status);
      if (status.occupied && status.userId !== user.id) {
        // If someone else took the buzzer and we are listening, stop.
        if (isListening) {
          stopListening();
        }
      }
    });

    socket.on('gd-start', () => {
      setRoom(prev => ({ ...prev, status: 'active' }));
    });

    socket.on('gd-end', () => {
      setRoom(prev => ({ ...prev, status: 'ended' }));
      navigate(`/feedback?roomId=${id}`);
    });

    socket.on('transcript-received', (newTranscript) => {
      setTranscripts(prev => [...prev, newTranscript]);
    });

    return () => {
      socket.emit('leave-room', { roomId: id, userId: user.id });
      socket.off('participant-update');
      socket.off('buzzer-update');
      socket.off('gd-start');
      socket.off('gd-end');
      socket.off('transcript-received');
    };
  }, [socket, room?.id, user?.id]);

  const fetchRoomDetails = async () => {
    try {
      const response = await api.get(`/rooms/${id}`);
      setRoom(response.data);
      if (response.data.status === 'ended') {
        navigate(`/feedback?roomId=${id}`);
      }
    } catch (err) {
      setError('Room not found or unauthorized');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/room/${id}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleStartGD = () => {
    socket.emit('gd-start', { roomId: id });
  };

  const handleEndGD = () => {
    socket.emit('gd-end', { roomId: id });
  };

  const handleBuzzerPress = () => {
    socket.emit('buzzer-request', { roomId: id, userId: user.id, userName: user.name });
    speechStartRef.current = Date.now();
    startListening();
  };

  const handleBuzzerRelease = () => {
    stopListening();
    socket.emit('buzzer-release', { roomId: id, userId: user.id });
    
    if (transcript.trim() && speechStartRef.current) {
      const payload = {
        roomId: id,
        userId: user.id,
        userName: user.name,
        startTimestamp: speechStartRef.current,
        endTimestamp: Date.now(),
        transcript: transcript.trim()
      };
      console.log('[Room] emitting transcript-update:', payload);
      socket.emit('transcript-update', payload);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading room...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  const isHost = room?.hostId === user?.id;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar: Participants */}
      <div className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-bold text-lg text-gray-900 truncate" title={room.name}>{room.name}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500 truncate flex-1">ID: {id}</span>
            <button onClick={handleCopyLink} className="text-blue-600 hover:text-blue-700 transition-colors" title="Copy Link">
              {copySuccess ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" /> Participants ({participants.length})
          </h3>
          <ul className="space-y-3">
            {participants.map(p => (
              <li key={p.userId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${p.status === 'online' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm font-medium text-gray-700">
                    {p.userName} {p.userId === user.id && '(You)'}
                  </span>
                </div>
                {p.userId === room.hostId && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">HOST</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
        {room.status === 'waiting' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Users className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Waiting Room</h2>
            <p className="text-gray-500 mb-8 max-w-md">
              {isHost 
                ? "You are the host. Wait for everyone to join before starting the discussion." 
                : "Waiting for the host to start the Group Discussion."}
            </p>
            {isHost && (
              <Button size="lg" onClick={handleStartGD} className="px-8 py-3 text-lg rounded-full">
                Start Group Discussion
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Header Controls */}
            <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm z-10">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <span className="text-sm font-medium text-gray-700">Live Session</span>
                </div>
              </div>
              {isHost && (
                <Button variant="danger" onClick={handleEndGD} className="px-6 rounded-full shadow-sm">
                  End Discussion
                </Button>
              )}
            </div>

            {/* Transcript Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="max-w-3xl mx-auto space-y-6">
                {transcripts.length === 0 && !isListening && (
                  <div className="text-center text-gray-400 py-12">
                    <Mic className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No one has spoken yet. Grab the buzzer to start!</p>
                  </div>
                )}
                {transcripts.map((t, idx) => (
                  <div key={idx} className={`flex flex-col ${t.userId === user.id ? 'items-end' : 'items-start'}`}>
                    <span className="text-xs text-gray-500 mb-1 ml-1">
                      {t.userId === user.id ? 'You' : t.userName}
                    </span>
                    <div className={`p-4 rounded-2xl max-w-[85%] ${
                      t.userId === user.id 
                        ? 'bg-blue-600 text-white rounded-tr-sm' 
                        : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'
                    }`}>
                      {t.transcript}
                    </div>
                  </div>
                ))}
                
                {/* Live typing indicator */}
                {isListening && buzzerStatus.userId === user.id && (
                  <div className="flex flex-col items-end animate-fade-in">
                     <span className="text-xs text-gray-500 mb-1 mr-1">You are speaking...</span>
                     <div className="p-4 rounded-2xl max-w-[85%] bg-blue-500 text-white rounded-tr-sm border border-blue-400 opacity-80 italic">
                        {transcript || 'Listening...'}
                     </div>
                  </div>
                )}
              </div>
            </div>

            {/* Buzzer Area */}
            <div className="bg-white border-t border-gray-200 p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="max-w-md mx-auto text-center">
                {speechError && (
                  <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {speechError}
                  </div>
                )}
                
                {buzzerStatus.occupied && buzzerStatus.userId !== user.id ? (
                  <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100 text-yellow-800 font-medium animate-pulse">
                    🎤 Currently <span className="font-bold">{buzzerStatus.userName}</span> is speaking...
                  </div>
                ) : buzzerStatus.userId === user.id ? (
                  <Button 
                    variant="danger" 
                    onClick={handleBuzzerRelease} 
                    className="w-full py-4 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl flex justify-center items-center gap-2 animate-bounce-slight"
                  >
                    <Square className="w-5 h-5 fill-current" /> Done Speaking
                  </Button>
                ) : (
                  <Button 
                    onClick={handleBuzzerPress} 
                    className="w-full py-4 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500"
                  >
                    <Mic className="w-5 h-5" /> Grab Buzzer
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Room;
