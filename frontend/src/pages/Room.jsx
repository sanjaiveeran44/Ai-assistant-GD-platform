import { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import api from '../services/api';
import Button from '../components/Button';
import { Users, Copy, Mic, Square, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';

// ── Topic Card ───────────────────────────────────────────────────────────────
const TopicCard = ({ topic }) => {
  if (!topic) return null;
  return (
    <div className="mx-4 mt-4 mb-2 rounded-2xl overflow-hidden shadow-lg">
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 p-[1px]">
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">📌</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-1">Today's Topic</p>
              <p className="text-lg font-bold text-gray-900 leading-snug">"{topic}"</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type }) => {
  if (!message) return null;
  const colors = type === 'error'
    ? 'bg-red-600 text-white'
    : 'bg-green-600 text-white';
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium ${colors} animate-fade-in`}>
      {message}
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
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
  const [topic, setTopic] = useState('');
  const [generatingTopic, setGeneratingTopic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const speechStartRef = useRef(null);
  const transcriptEndRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    fetchRoomDetails();
  }, [id]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  useEffect(() => {
    if (!socket || !room) return;

    socket.emit('join-room', { roomId: id, userId: user.id, userName: user.name });

    socket.on('participant-update', setParticipants);

    socket.on('buzzer-update', (status) => {
      setBuzzerStatus(status);
      if (status.occupied && status.userId !== user.id && isListening) stopListening();
    });

    socket.on('gd-start', () => setRoom(prev => ({ ...prev, status: 'active' })));

    socket.on('gd-end', () => {
      setRoom(prev => ({ ...prev, status: 'ended' }));
      navigate(`/feedback?roomId=${id}`);
    });

    socket.on('transcript-received', (t) => setTranscripts(prev => [...prev, t]));

    socket.on('topic-update', ({ topic: newTopic }) => {
      setTopic(newTopic);
      showToast('📌 New topic generated!');
    });

    return () => {
      socket.emit('leave-room', { roomId: id, userId: user.id });
      socket.off('participant-update');
      socket.off('buzzer-update');
      socket.off('gd-start');
      socket.off('gd-end');
      socket.off('transcript-received');
      socket.off('topic-update');
    };
  }, [socket, room?.id, user?.id]);

  const fetchRoomDetails = async () => {
    try {
      const res = await api.get(`/rooms/${id}`);
      setRoom(res.data);
      if (res.data.description) setTopic(res.data.description);
      if (res.data.status === 'ended') navigate(`/feedback?roomId=${id}`);
    } catch {
      setError('Room not found or unauthorized');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTopic = async () => {
    setGeneratingTopic(true);
    try {
      const res = await api.post(`/rooms/${id}/topic`);
      const newTopic = res.data.topic;
      setTopic(newTopic);
      // Broadcast to all participants via socket
      socket.emit('topic-generated', { roomId: id, topic: newTopic });
      showToast('📌 Topic generated!');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to generate topic', 'error');
    } finally {
      setGeneratingTopic(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${id}`);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleStartGD = () => socket.emit('gd-start', { roomId: id });
  const handleEndGD = () => socket.emit('gd-end', { roomId: id });

  const handleBuzzerPress = () => {
    socket.emit('buzzer-request', { roomId: id, userId: user.id, userName: user.name });
    speechStartRef.current = Date.now();
    startListening();
  };

  const handleBuzzerRelease = () => {
    stopListening();
    socket.emit('buzzer-release', { roomId: id, userId: user.id });
    if (transcript.trim() && speechStartRef.current) {
      socket.emit('transcript-update', {
        roomId: id,
        userId: user.id,
        userName: user.name,
        startTimestamp: speechStartRef.current,
        endTimestamp: Date.now(),
        transcript: transcript.trim(),
      });
    }
  };

  if (loading) return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading room...</p>
      </div>
    </div>
  );
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  const isHost = room?.hostId === user?.id;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex flex-col md:flex-row">
      <Toast message={toast.message} type={toast.type} />

      {/* ── Sidebar ── */}
      <div className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-bold text-lg text-gray-900 truncate" title={room.name}>{room.name}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-400 truncate flex-1">ID: {id}</span>
            <button onClick={handleCopyLink} className="text-blue-600 hover:text-blue-700" title="Copy link">
              {copySuccess ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> Participants ({participants.length})
          </h3>
          <ul className="space-y-2">
            {participants.map(p => (
              <li key={p.userId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.status === 'online' ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {p.userName}{p.userId === user.id && ' (You)'}
                  </span>
                </div>
                {p.userId === room.hostId && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full flex-shrink-0">HOST</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] min-w-0">
        {room.status === 'waiting' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Users className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Waiting Room</h2>
            <p className="text-gray-500 mb-8 max-w-md">
              {isHost
                ? 'You are the host. Optionally generate a topic, then start the discussion.'
                : 'Waiting for the host to start the Group Discussion.'}
            </p>
            {topic && <TopicCard topic={topic} />}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              {isHost && (
                <Button
                  onClick={handleGenerateTopic}
                  disabled={generatingTopic}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
                >
                  {generatingTopic
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
                    : <><Sparkles className="w-4 h-4" /> Generate Topic</>}
                </Button>
              )}
              {isHost && (
                <Button size="lg" onClick={handleStartGD} className="px-8 py-2.5 text-base rounded-full">
                  Start Discussion
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-3 flex justify-between items-center shadow-sm z-10 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="relative flex h-3 w-3 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <span className="text-sm font-medium text-gray-700 flex-shrink-0">Live</span>
                {isHost && (
                  <Button
                    onClick={handleGenerateTopic}
                    disabled={generatingTopic}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow"
                  >
                    {generatingTopic
                      ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
                      : <><Sparkles className="w-3 h-3" /> Generate Topic</>}
                  </Button>
                )}
              </div>
              {isHost && (
                <Button variant="danger" onClick={handleEndGD} className="px-5 py-1.5 text-sm rounded-full shadow flex-shrink-0">
                  End Discussion
                </Button>
              )}
            </div>

            {/* Topic */}
            {topic && <TopicCard topic={topic} />}

            {/* Transcripts */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="max-w-3xl mx-auto space-y-4">
                {transcripts.length === 0 && !isListening && (
                  <div className="text-center text-gray-400 py-16">
                    <Mic className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No one has spoken yet. Grab the buzzer to start!</p>
                  </div>
                )}
                {transcripts.map((t, idx) => (
                  <div key={idx} className={`flex flex-col ${t.userId === user.id ? 'items-end' : 'items-start'}`}>
                    <span className="text-xs text-gray-400 mb-1 px-1">
                      {t.userId === user.id ? 'You' : t.userName}
                    </span>
                    <div className={`p-3.5 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                      t.userId === user.id
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'
                    }`}>
                      {t.transcript}
                    </div>
                  </div>
                ))}
                {isListening && buzzerStatus.userId === user.id && (
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-400 mb-1 px-1">You are speaking...</span>
                    <div className="p-3.5 rounded-2xl max-w-[85%] text-sm bg-indigo-500 text-white rounded-tr-sm opacity-80 italic">
                      {transcript || 'Listening...'}
                    </div>
                  </div>
                )}
                <div ref={transcriptEndRef} />
              </div>
            </div>

            {/* Buzzer */}
            <div className="bg-white border-t border-gray-200 p-5 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.04)]">
              <div className="max-w-md mx-auto text-center">
                {speechError && (
                  <div className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded-lg flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {speechError}
                  </div>
                )}
                {buzzerStatus.occupied && buzzerStatus.userId !== user.id ? (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 font-medium animate-pulse text-sm">
                    🎤 <span className="font-bold">{buzzerStatus.userName}</span> is speaking...
                  </div>
                ) : buzzerStatus.userId === user.id ? (
                  <Button
                    variant="danger"
                    onClick={handleBuzzerRelease}
                    className="w-full py-4 text-base font-bold rounded-xl shadow-lg flex justify-center items-center gap-2"
                  >
                    <Square className="w-5 h-5 fill-current" /> Done Speaking
                  </Button>
                ) : (
                  <Button
                    onClick={handleBuzzerPress}
                    className="w-full py-4 text-base font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-transform flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
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
