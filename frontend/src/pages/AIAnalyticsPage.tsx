import { useQuery, useMutation } from '@tanstack/react-query';
import { Brain, TrendingUp, Target, AlertTriangle, BarChart3 } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardTitle, Button } from '@/shared/ui';
import { apiClient, unwrap } from '@/shared/api/client';
import toast from 'react-hot-toast';

interface AIStatus { enabled: boolean; features: Record<string, boolean>; }
interface ForecastResult { date: string; predicted: number; lower: number; upper: number; }
interface ForecastData { next7Days: ForecastResult[]; next30Days: ForecastResult[]; modelName: string; mape: number | null; trend: string; dailyAverage: number; }
interface EvalHistory { modelName: string; accuracy: number; precision: number; recall: number; f1: number; confusionMatrix: Record<string, Record<string, number>>; sampleSize: number; evaluatedAt: string; }
interface Insight { id: string; type: string; title: string; description: string; severity: string; data: any; generatedAt: string; }

function useAIStatus() { return useQuery({ queryKey: ['ai-status'], queryFn: async () => { const r = await apiClient.get('/ai-enhanced/status'); return unwrap<AIStatus>(r.data); } }); }
function useForecast() { return useQuery({ queryKey: ['ai-forecast'], queryFn: async () => { const r = await apiClient.get('/ai-enhanced/forecast'); return unwrap<ForecastData>(r.data); } }); }
function useEvalHistory() { return useQuery({ queryKey: ['ai-eval-history'], queryFn: async () => { const r = await apiClient.get('/ai-enhanced/evaluate/history'); return unwrap<EvalHistory[]>(r.data); } }); }
function useInsights() { return useQuery({ queryKey: ['ai-insights'], queryFn: async () => { const r = await apiClient.get('/ai-enhanced/insights'); return unwrap<Insight[]>(r.data); } }); }

function useGenerateInsights() {
  return useMutation({
    mutationFn: async () => { const r = await apiClient.post('/ai-enhanced/insights/generate'); return unwrap<Insight[]>(r.data); },
    onSuccess: () => toast.success('Insights generated'),
    onError: (e: Error) => toast.error(e.message),
  });
}

function useRunEvaluation() {
  return useMutation({
    mutationFn: async () => { const r = await apiClient.post('/ai-enhanced/evaluate', { modelName: 'hybrid' }); return unwrap<any>(r.data); },
    onSuccess: () => toast.success('Evaluation complete'),
  });
}

export function AIAnalyticsPage() {
  const { data: status } = useAIStatus();
  const { data: forecast } = useForecast();
  const { data: evalHistory = [] } = useEvalHistory();
  const { data: insights = [] } = useInsights();
  const generateInsights = useGenerateInsights();
  const runEval = useRunEvaluation();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Analytics</h1>
          <p className="text-gray-600 mt-1">ML models, forecasting, and intelligent insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={<Target className="w-4 h-4" />} onClick={() => runEval.mutate()} loading={runEval.isPending}>
            Run Evaluation
          </Button>
          <Button variant="primary" leftIcon={<Brain className="w-4 h-4" />} onClick={() => generateInsights.mutate()} loading={generateInsights.isPending}>
            Generate Insights
          </Button>
        </div>
      </header>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center"><Brain className="w-5 h-5" /></div>
            <div><p className="text-xs text-gray-500 uppercase">AI Status</p><p className="text-lg font-bold">{status?.enabled ? 'Active' : 'Limited'}</p></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
            <div><p className="text-xs text-gray-500 uppercase">Trend</p><p className="text-lg font-bold capitalize">{forecast?.trend || '—'}</p></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"><BarChart3 className="w-5 h-5" /></div>
            <div><p className="text-xs text-gray-500 uppercase">Daily Avg</p><p className="text-lg font-bold">₹{forecast?.dailyAverage || 0}</p></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div>
            <div><p className="text-xs text-gray-500 uppercase">MAPE</p><p className="text-lg font-bold">{forecast?.mape != null ? `${forecast.mape}%` : '—'}</p></div>
          </div>
        </Card>
      </div>

      {/* Forecast Chart */}
      {forecast && forecast.next30Days.length > 0 && (
        <Card>
          <CardTitle className="mb-4">30-Day Spending Forecast (Exponential Smoothing)</CardTitle>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={forecast.next30Days}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `₹${v}`} />
              <Area type="monotone" dataKey="upper" stroke="none" fill="#bfdbfe" name="Upper CI" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" name="Lower CI" />
              <Line type="monotone" dataKey="predicted" stroke="#2563eb" strokeWidth={2} dot={false} name="Predicted" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Model Evaluation */}
      {evalHistory.length > 0 && (
        <Card>
          <CardTitle className="mb-4">Model Performance History</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={evalHistory.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="evaluatedAt" tick={{ fontSize: 11 }} tickFormatter={d => new Date(d).toLocaleDateString()} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} name="Accuracy" />
              <Line type="monotone" dataKey="f1" stroke="#6366f1" strokeWidth={2} name="F1 Score" />
              <Line type="monotone" dataKey="precision" stroke="#f59e0b" strokeWidth={2} name="Precision" />
              <Line type="monotone" dataKey="recall" stroke="#ef4444" strokeWidth={2} name="Recall" />
            </LineChart>
          </ResponsiveContainer>
          {evalHistory[0]?.confusionMatrix && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Latest Confusion Matrix</h4>
              <ConfusionMatrix data={evalHistory[0].confusionMatrix} />
            </div>
          )}
        </Card>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardTitle className="mb-4">AI Insights</CardTitle>
          <div className="space-y-3">
            {insights.map(insight => (
              <div key={insight.id} className={`p-3 rounded-lg border-l-4 ${
                insight.severity === 'critical' ? 'bg-red-50 border-red-500' :
                insight.severity === 'warning' ? 'bg-amber-50 border-amber-500' :
                'bg-blue-50 border-blue-500'
              }`}>
                <h4 className="font-medium text-gray-900">{insight.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(insight.generatedAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ConfusionMatrix({ data }: { data: Record<string, Record<string, number>> }) {
  const categories = Object.keys(data).filter(k => Object.values(data[k]).some(v => v > 0));
  if (categories.length === 0) return <p className="text-sm text-gray-500">No data yet</p>;

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse">
        <thead>
          <tr><th className="p-1 border bg-gray-50">Actual \ Predicted</th>{categories.map(c => <th key={c} className="p-1 border bg-gray-50">{c}</th>)}</tr>
        </thead>
        <tbody>
          {categories.map(actual => (
            <tr key={actual}>
              <td className="p-1 border font-medium bg-gray-50">{actual}</td>
              {categories.map(predicted => {
                const val = data[actual]?.[predicted] || 0;
                const isCorrect = actual === predicted;
                return <td key={predicted} className={`p-1 border text-center ${isCorrect && val > 0 ? 'bg-green-100 font-bold' : val > 0 ? 'bg-red-50' : ''}`}>{val}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
