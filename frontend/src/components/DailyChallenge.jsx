import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Card from './Card';
import Button from './Button';
import { Flame, Mic, Clock, Trophy, CheckCircle, TrendingUp, Sparkles, MessageCircle, ChevronUp, ChevronDown } from 'lucide-react';
import useSpeechRecognition from '../hooks/useSpeechRecognition';

const DailyChallenge = () => {
  const { user } = useContext(AuthContext);
  const [topic, setTopic] = useState(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Challenge State
  const [status, setStatus] = useState('idle'); // idle, active, analyzing, result
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
  const [result, setResult] = useState(null);
  
  const timerRef = useRef(null);
  const { isListening, transcript, error: speechError, startListening, stopListening } = useSpeechRecognition();
  const transcriptRef = useRef('');

  useEffect(() => {
    transcriptRef.current = transcript;
    console.log('[DailyChallenge] Current transcript:', transcript);
  }, [transcript]);

  useEffect(() => {
    fetchDailyData();
    // Also fetch history to see if user already completed it today
    checkCompletion();
  }, []);

  const fetchDailyData = async () => {
    try {
      const topicRes = await api.get('/daily-challenge/topic');
      setTopic(topicRes.data);
      
      const streakRes = await api.get(`/daily-challenge/streak/${user.id}`);
      setStreak(streakRes.data.streak);
    } catch (err) {
      console.error('Failed to fetch daily data', err);
    } finally {
      setLoading(false);
    }
  };

  const checkCompletion = async () => {
    try {
      const historyRes = await api.get(`/daily-challenge/history/${user.id}`);
      const attempts = historyRes.data;
      if (attempts.length > 0) {
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (attempts[0].streakDate === today && attempts[0].completed) {
          // Already completed today
          const feedbackObj = JSON.parse(attempts[0].feedback || '{}');
          setResult({
            ...attempts[0],
            feedbackObj
          });
          setStatus('result');
        }
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };

  const startChallenge = () => {
    setStatus('active');
    setTimeLeft(120);
    startListening();

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          finishChallenge();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const finishChallenge = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopListening();
    setStatus('analyzing');

    try {
      // Need a slight delay to let state update with final transcript
      setTimeout(async () => {
        try {
          const res = await api.post('/daily-challenge/submit', {
            topicId: topic.id,
            transcript: transcriptRef.current || "User did not speak.",
            duration: 120 - timeLeft // actual time spent
          });
          
          const feedbackObj = JSON.parse(res.data.feedback || '{}');
          setResult({
            ...res.data,
            feedbackObj
          });
          
          // Refresh streak
          const streakRes = await api.get(`/daily-challenge/streak/${user.id}`);
          setStreak(streakRes.data.streak);
          
          setStatus('result');
        } catch (err) {
          console.error("Submission failed", err);
          alert("Failed to submit challenge.");
          setStatus('idle');
        }
      }, 500);
      
    } catch (err) {
      console.error(err);
      setStatus('idle');
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="h-20 bg-gray-200 rounded"></div>
      </Card>
    );
  }

  if (!topic) return null;

  return (
    <Card className="border border-orange-200 bg-gradient-to-br from-orange-50 to-white shadow-sm mb-8 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-bl-full opacity-50 -z-0"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 text-orange-600 font-bold mb-1">
              <Flame className="w-5 h-5 fill-current" />
              <span>Daily Challenge</span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mt-2">{topic.topic}</h2>
            <div className="flex gap-2 mt-3">
              <span className="px-2 py-1 bg-white border border-orange-200 text-orange-700 text-xs font-semibold rounded-full shadow-sm">
                {topic.category}
              </span>
              <span className="px-2 py-1 bg-white border border-gray-200 text-gray-600 text-xs font-semibold rounded-full shadow-sm">
                {topic.difficulty}
              </span>
            </div>
          </div>
          <div className="flex items-center flex-col bg-white px-4 py-2 rounded-xl shadow-sm border border-orange-100">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Current Streak</span>
            <div className="flex items-center gap-1 text-orange-600 font-bold text-xl">
              <Flame className="w-5 h-5 fill-current" />
              <span>{streak} Days</span>
            </div>
          </div>
        </div>

        {status === 'idle' && (
          <div className="mt-8">
            <p className="text-gray-600 mb-6 max-w-2xl">
              Speak uninterrupted for 2 minutes on today's topic. Get instant AI feedback on your communication skills and build your daily speaking habit!
            </p>
            <Button onClick={startChallenge} className="bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-200 group flex items-center gap-2 px-6 py-3 text-lg rounded-xl">
              <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Start Challenge
            </Button>
          </div>
        )}

        {status === 'active' && (
          <div className="mt-6 p-6 bg-white rounded-2xl border border-orange-100 shadow-inner text-center">
            <div className="flex justify-center items-center mb-4">
              <div className={`relative flex items-center justify-center w-24 h-24 rounded-full ${timeLeft <= 30 ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                {isListening && (
                  <span className="absolute w-full h-full rounded-full bg-current opacity-20 animate-ping"></span>
                )}
                <span className="text-3xl font-bold font-mono">{formatTime(timeLeft)}</span>
              </div>
            </div>
            
            <p className="text-gray-500 mb-6 flex items-center justify-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
              {isListening ? 'Recording in progress...' : 'Connecting microphone...'}
            </p>
            
            <div className="w-full max-w-2xl mx-auto flex flex-col items-start mb-6">
              <span className="text-xs text-gray-400 mb-1 px-1 font-medium">You are speaking...</span>
              <div className="w-full p-4 rounded-2xl text-sm bg-indigo-500 text-white rounded-tl-sm opacity-90 italic min-h-[120px] max-h-[250px] overflow-y-auto text-left shadow-md transition-all">
                {transcript || 'Listening...'}
              </div>
            </div>

            <Button onClick={finishChallenge} variant="secondary" className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300">
              Stop & Submit Early
            </Button>
          </div>
        )}

        {status === 'analyzing' && (
          <div className="mt-8 flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-4"></div>
            <h3 className="text-xl font-bold text-gray-800">Analyzing your performance...</h3>
            <p className="text-gray-500 mt-2">Our AI is generating personalized feedback on your vocabulary and fluency.</p>
          </div>
        )}

        {status === 'result' && result && (
          <div className="mt-8 pt-6 border-t border-orange-100 animate-fade-in relative">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-gray-800 text-lg">Your Performance</h3>
              <button 
                onClick={() => setIsMinimized(!isMinimized)} 
                className="p-1.5 rounded-full hover:bg-orange-100 text-gray-500 hover:text-orange-600 transition-colors bg-gray-50 border border-gray-200"
                title={isMinimized ? "Expand feedback" : "Minimize feedback"}
              >
                {isMinimized ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
              </button>
            </div>

            {!isMinimized && (
              <div className="flex flex-col md:flex-row gap-8 mt-6 animate-fade-in">
                
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="56" className="text-gray-100 stroke-current" strokeWidth="12" fill="transparent" />
                      <circle 
                        cx="64" cy="64" r="56" 
                        className={`${result.score >= 80 ? 'text-green-500' : result.score >= 60 ? 'text-yellow-500' : 'text-red-500'} stroke-current`} 
                        strokeWidth="12" fill="transparent" 
                        strokeDasharray={351.8} 
                        strokeDashoffset={351.8 - (351.8 * result.score) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-gray-800">{result.score}</span>
                      <span className="text-xs text-gray-500 font-bold uppercase">Score</span>
                    </div>
                  </div>
                  <div className="mt-4 bg-orange-100 text-orange-800 px-4 py-2 rounded-lg text-sm font-medium text-center italic">
                    "{result.feedbackObj?.motivation || "Great effort!"}"
                  </div>
                </div>

                <div className="flex-1 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                      <h4 className="flex items-center gap-2 text-green-800 font-bold mb-3">
                        <Trophy className="w-5 h-5" /> Strengths
                      </h4>
                      <ul className="space-y-2">
                        {result.strengths?.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                      <h4 className="flex items-center gap-2 text-blue-800 font-bold mb-3">
                        <TrendingUp className="w-5 h-5" /> Focus Areas
                      </h4>
                      <ul className="space-y-2">
                        {result.improvements?.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-blue-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {result.feedbackObj?.betterExpression && (
                    <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
                      <h4 className="flex items-center gap-2 text-purple-800 font-bold mb-3">
                        <Sparkles className="w-5 h-5" /> Better Way to Say It
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">You said:</span>
                          <p className="text-sm text-gray-700 mt-1 bg-white p-2 rounded border border-purple-100">"{result.feedbackObj.betterExpression.original}"</p>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Better:</span>
                          <p className="text-sm font-medium text-purple-900 mt-1 bg-white p-2 rounded border border-purple-200">"{result.feedbackObj.betterExpression.improved}"</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="flex items-center gap-2 text-gray-700 font-semibold mb-2">
                      <MessageCircle className="w-4 h-4" /> Your Transcript
                    </h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200 italic max-h-32 overflow-y-auto">
                      "{result.transcript}"
                    </p>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default DailyChallenge;
