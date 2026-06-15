import { useEffect, useState, useContext } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Button from '../components/Button';
import {
  ArrowLeft, Loader2, Award, Target, MessageSquare,
  Lightbulb, BookOpen, Mic2, TrendingUp, Star, Zap,
  ChevronRight, Trophy, Medal
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const parseExtended = (summary) => {
  try { return JSON.parse(summary); } catch (_) { return { text: summary }; }
};

const scoreColor = (s) =>
  s >= 8 ? 'text-emerald-600' : s >= 5 ? 'text-amber-500' : 'text-red-500';

const scoreBg = (s) =>
  s >= 8 ? 'from-emerald-400 to-green-500' : s >= 5 ? 'from-amber-400 to-orange-400' : 'from-red-400 to-rose-500';

const scoreRing = (s) =>
  s >= 8 ? 'border-emerald-400' : s >= 5 ? 'border-amber-400' : 'border-red-400';

// ─── Sub-components ───────────────────────────────────────────────────────────

const ScoreRing = ({ score, label, size = 'md' }) => {
  const dim = size === 'lg' ? 'w-28 h-28 text-3xl' : 'w-16 h-16 text-lg';
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`${dim} rounded-full border-4 ${scoreRing(score)} flex items-center justify-center font-bold ${scoreColor(score)} bg-white shadow-sm`}>
        {score}
      </div>
      <span className="text-xs font-medium text-gray-500 text-center uppercase tracking-wide leading-tight">{label}</span>
    </div>
  );
};

const SkillBar = ({ label, score }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className={`text-sm font-bold ${scoreColor(score)}`}>{score}/10</span>
    </div>
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${scoreBg(score)} transition-all duration-700`}
        style={{ width: `${score * 10}%` }}
      />
    </div>
  </div>
);

const Section = ({ icon: Icon, title, color = 'indigo', children }) => {
  const colors = {
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
    green:  'bg-emerald-50 border-emerald-100 text-emerald-700',
    amber:  'bg-amber-50 border-amber-100 text-amber-700',
    blue:   'bg-blue-50 border-blue-100 text-blue-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
    rose:   'bg-rose-50 border-rose-100 text-rose-700',
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4" />
        <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
};

const BulletList = ({ items, bullet = '•', bulletColor = 'text-current' }) => (
  <ul className="space-y-2">
    {items.map((item, i) => (
      <li key={i} className="flex items-start gap-2 text-sm">
        <span className={`font-bold mt-0.5 flex-shrink-0 ${bulletColor}`}>{bullet}</span>
        <span className="text-gray-700">{item}</span>
      </li>
    ))}
  </ul>
);

// ─── Leaderboard ──────────────────────────────────────────────────────────────

const Leaderboard = ({ roomId, currentUserId }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/feedback/leaderboard?roomId=${roomId}`)
      .then(r => setEntries(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [roomId]);

  const medals = ['🥇', '🥈', '🥉'];

  if (loading) return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 flex justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
    </div>
  );

  if (entries.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-300" />
        <h3 className="text-white font-bold text-base">Room Leaderboard</h3>
      </div>
      <div className="divide-y divide-gray-50">
        {entries.map((e, idx) => (
          <div
            key={e.userId}
            className={`flex items-center gap-4 px-5 py-3.5 ${e.userId === currentUserId ? 'bg-indigo-50' : ''}`}
          >
            <span className="text-xl w-7 flex-shrink-0">{medals[idx] ?? `#${idx + 1}`}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${e.userId === currentUserId ? 'text-indigo-700' : 'text-gray-800'}`}>
                {e.userName}{e.userId === currentUserId && ' (You)'}
              </p>
              <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${scoreBg(e.overallScore)}`}
                  style={{ width: `${e.overallScore * 10}%` }}
                />
              </div>
            </div>
            <span className={`text-base font-bold flex-shrink-0 ${scoreColor(e.overallScore)}`}>
              {e.overallScore}/10
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

const Skeleton = () => (
  <div className="animate-pulse space-y-4">
    {[1, 2, 3].map(i => (
      <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
    ))}
  </div>
);

// ─── Main Feedback Page ───────────────────────────────────────────────────────

const Feedback = () => {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('roomId');
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!roomId) { navigate('/dashboard'); return; }
    fetchFeedback();
  }, [roomId]);

  const fetchFeedback = async () => {
    try {
      const res = await api.post('/feedback', { roomId });
      const data = res.data;
      setFeedback(Array.isArray(data) ? data[0] : data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate feedback. Ensure the Groq API key is configured.');
    } finally {
      setLoading(false);
    }
  };

  // ── Loading ──
  if (loading) return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            <Zap className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">AI is evaluating your performance...</h2>
          <p className="text-gray-500 text-sm">Analyzing your transcript for personalised coaching feedback</p>
        </div>
        <Skeleton />
      </div>
    </div>
  );

  // ── Error ──
  if (error) return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-red-50 border border-red-100 text-red-600 p-8 rounded-2xl max-w-md w-full text-center shadow-sm">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Target className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold mb-2">Analysis Failed</h2>
        <p className="text-sm mb-6">{error}</p>
        <Link to="/dashboard"><Button variant="secondary">Return to Dashboard</Button></Link>
      </div>
    </div>
  );

  if (!feedback) return null;

  const ext = parseExtended(feedback.summary);
  const overallScore = ext.overallScore ?? Math.round(
    (feedback.communicationScore + feedback.confidenceScore + feedback.grammarScore + feedback.participationScore) / 4
  );
  const summaryText = ext.text ?? feedback.summary;
  const betterExpressions  = ext.betterExpressions ?? [];
  const vocabSuggestions   = ext.vocabularySuggestions ?? [];
  const commTips           = ext.communicationTips ?? [];
  const motivation         = ext.motivation ?? '';
  const fluency            = ext.fluencyScore;
  const vocabulary         = ext.vocabularyScore;
  const logicalThinking    = ext.logicalThinkingScore;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      {/* ── Hero Header ── */}
      <div className="bg-gradient-to-br from-indigo-700 via-purple-700 to-blue-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-indigo-200 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end gap-6">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold flex-shrink-0">
              {feedback.userName?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-indigo-200 text-sm font-medium mb-1">AI Evaluation Report</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold truncate">{feedback.userName}</h1>
              <p className="text-indigo-300 text-sm mt-1">Group Discussion · Personalised Feedback</p>
            </div>
            {/* Overall Score */}
            <div className="flex-shrink-0 flex flex-col items-center bg-white/15 backdrop-blur rounded-2xl px-6 py-4">
              <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">Overall</p>
              <p className="text-4xl font-extrabold">{overallScore}<span className="text-xl font-medium text-indigo-300">/10</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Skill Scores ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-5">Skill Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
            <ScoreRing score={feedback.communicationScore} label="Communication" />
            <ScoreRing score={feedback.confidenceScore}    label="Confidence" />
            <ScoreRing score={feedback.grammarScore}       label="Grammar" />
            <ScoreRing score={feedback.participationScore} label="Participation" />
          </div>
          {(fluency !== null && fluency !== undefined) && (
            <div className="border-t border-gray-100 pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {fluency         !== null && <SkillBar label="Fluency"          score={fluency} />}
              {vocabulary      !== null && <SkillBar label="Vocabulary"       score={vocabulary} />}
              {logicalThinking !== null && <SkillBar label="Logical Thinking" score={logicalThinking} />}
            </div>
          )}
        </div>

        {/* ── Performance Summary ── */}
        <Section icon={MessageSquare} title="Performance Summary" color="indigo">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{summaryText}</p>
        </Section>

        {/* ── Strengths + Improvements ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Section icon={Award} title="Key Strengths" color="green">
            <BulletList items={feedback.strengths} bullet="✓" bulletColor="text-emerald-600" />
          </Section>
          <Section icon={Target} title="Areas for Improvement" color="amber">
            <BulletList items={feedback.improvements} bullet="→" bulletColor="text-amber-600" />
          </Section>
        </div>

        {/* ── Better Expressions ── */}
        {betterExpressions.length > 0 && (
          <Section icon={Mic2} title="Better Ways to Express" color="blue">
            <div className="space-y-4">
              {betterExpressions.map((b, i) => (
                <div key={i} className="bg-white rounded-xl border border-blue-100 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-blue-100 bg-red-50/50">
                    <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-0.5">Instead of</p>
                    <p className="text-sm text-gray-700 italic">"{b.original}"</p>
                  </div>
                  <div className="px-4 py-2.5">
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-0.5">Say instead</p>
                    <p className="text-sm text-gray-800 font-medium">"{b.improved}"</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Vocabulary ── */}
        {vocabSuggestions.length > 0 && (
          <Section icon={BookOpen} title="Vocabulary Upgrades" color="purple">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {vocabSuggestions.map((v, i) => (
                <div key={i} className="bg-white rounded-xl border border-purple-100 px-3 py-2.5 flex items-center gap-2">
                  <span className="text-sm text-red-500 line-through flex-1 truncate">{v.word}</span>
                  <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-purple-700 flex-1 truncate">{v.replacement}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Communication Tips ── */}
        {commTips.length > 0 && (
          <Section icon={Lightbulb} title="Communication Tips" color="rose">
            <ul className="space-y-3">
              {commTips.map((tip, i) => (
                <li key={i} className="flex items-start gap-3 bg-white rounded-xl border border-rose-100 px-4 py-3">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700">{tip}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* ── Motivation ── */}
        {motivation && (
          <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-yellow-300" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Final Note</h3>
            </div>
            <p className="text-indigo-100 leading-relaxed text-sm">{motivation}</p>
          </div>
        )}

        {/* ── Leaderboard ── */}
        <Leaderboard roomId={roomId} currentUserId={user?.id} />

      </div>
    </div>
  );
};

export default Feedback;
