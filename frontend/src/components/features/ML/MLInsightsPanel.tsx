import { useState, useEffect } from 'react';
import { Brain, BarChart3, RefreshCw, Zap } from 'lucide-react';
import { api } from '../../../services/api';

interface MLStats {
  totalTrainingDocs: number;
  userCorrections: number;
  vocabularySize: number;
  categories: Array<{ name: string; documentCount: number }>;
}

export function MLInsightsPanel() {
  const [stats, setStats] = useState<MLStats | null>(null);
  const [testMerchant, setTestMerchant] = useState('');
  const [prediction, setPrediction] = useState<{ category: string; confidence: number; method?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);

  useEffect(() => {
    api.mlStats()
      .then((data: any) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePredict = async () => {
    if (!testMerchant.trim()) return;
    setPredicting(true);
    try {
      const result = await api.mlPredict(testMerchant) as any;
      setPrediction(result);
    } catch { setPrediction(null); }
    finally { setPredicting(false); }
  };

  if (loading) {
    return <div className="animate-pulse h-48 bg-gray-100 rounded-xl" />;
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-50 rounded-xl p-6 border border-indigo-200 space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-lg font-bold text-indigo-900">ML Model</h3>
        <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-600 text-white rounded-full">Naive Bayes</span>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/70 rounded-lg p-3 border border-indigo-100">
            <p className="text-xs text-gray-600">Training Docs</p>
            <p className="text-xl font-bold text-indigo-600">{stats.totalTrainingDocs}</p>
          </div>
          <div className="bg-white/70 rounded-lg p-3 border border-indigo-100">
            <p className="text-xs text-gray-600">Your Corrections</p>
            <p className="text-xl font-bold text-purple-600">{stats.userCorrections}</p>
          </div>
          <div className="bg-white/70 rounded-lg p-3 border border-indigo-100">
            <p className="text-xs text-gray-600">Vocabulary</p>
            <p className="text-xl font-bold text-indigo-600">{stats.vocabularySize}</p>
          </div>
        </div>
      )}

      {/* Category distribution */}
      {stats?.categories && stats.categories.length > 0 && (
        <div className="bg-white/70 rounded-lg p-3 border border-indigo-100">
          <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <BarChart3 className="w-3 h-3" /> Category Distribution
          </p>
          <div className="flex flex-wrap gap-1.5">
            {stats.categories.map(c => (
              <span key={c.name} className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                {c.name} ({c.documentCount})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Test prediction */}
      <div className="bg-white/70 rounded-lg p-3 border border-indigo-100">
        <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
          <Zap className="w-3 h-3" /> Test Prediction
        </p>
        <div className="flex gap-2">
          <input type="text" value={testMerchant} onChange={e => setTestMerchant(e.target.value)}
            placeholder="Enter merchant name..."
            onKeyDown={e => e.key === 'Enter' && handlePredict()}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button onClick={handlePredict} disabled={predicting}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
            {predicting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
            Predict
          </button>
        </div>
        {prediction && (
          <div className="mt-2 flex items-center gap-2">
            <span className="px-2 py-1 bg-indigo-600 text-white text-xs rounded-full font-medium">{prediction.category}</span>
            <span className="text-xs text-gray-500">Confidence: {Math.round(prediction.confidence * 100)}%</span>
            {prediction.method && <span className="text-xs text-gray-400">({prediction.method})</span>}
          </div>
        )}
      </div>
    </div>
  );
}
