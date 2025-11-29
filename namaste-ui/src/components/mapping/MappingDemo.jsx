'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { 
  Sparkles, 
  ArrowRight, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Brain
} from 'lucide-react';
import { createMapping, searchNamaste } from '@/lib/api';
import { 
  getEquivalenceBadgeClass, 
  getEquivalenceLabel,
  formatConfidence 
} from '@/lib/utils';

export function MappingDemo() {
  const [code, setCode] = useState('');
  const [system, setSystem] = useState('ayurveda');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  const handleSearch = async (query) => {
    setCode(query);
    if (query.length >= 2) {
      try {
        const data = await searchNamaste(query, system);
        setSuggestions(data.results?.slice(0, 5) || []);
      } catch (e) {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleMap = async () => {
    if (!code.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    setSuggestions([]);

    try {
      const data = await createMapping(code, system);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    setCode(suggestion.code);
    setSuggestions([]);
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-600" />
            AI-Powered Code Mapping
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NAMASTE Code
                </label>
                <Input
                  className="text-gray-900"
                  placeholder="Enter code (e.g., A-1) or search term"
                  value={code}
                  onChange={(e) => handleSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleMap()}
                />
                
                {/* Suggestions Dropdown */}
                {suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => selectSuggestion(s)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                      >
                        <span className="font-mono text-sm text-gray-900 font-bold">{s.code}</span>
                        <span className="text-sm text-gray-500 truncate ml-2">{s.term}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System
                </label>
                <Select className={"text-black"} value={system} onChange={(e) => setSystem(e.target.value)}>
                  <option value="ayurveda">Ayurveda</option>
                  <option value="siddha">Siddha</option>
                  <option value="unani">Unani</option>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleMap} 
              disabled={loading || !code.trim()}
              className="w-full md:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mapping with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Map to ICD-11 TM2
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card className="border-green-200">
          <CardHeader className="bg-green-50 border-b border-green-100">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="w-5 h-5" />
              Mapping Result
              {result.source === 'cached' && (
                <Badge variant="info" className="ml-2">Cached</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Source Code */}
              <div className="flex-1 text-center md:text-left">
                <p className="text-sm text-gray-500 mb-1">NAMASTE Code</p>
                <p className="text-2xl font-mono font-bold text-gray-900">
                  {result.mapping.namasteCode.code}
                </p>
                <p className="text-gray-600 mt-1">{result.mapping.namasteCode.term}</p>
                <span className="inline-block mt-2 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                  {result.mapping.namasteCode.system}
                </span>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center gap-2">
                <ArrowRight className="w-8 h-8 text-indigo-500" />
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getEquivalenceBadgeClass(result.mapping.equivalence)}`}>
                  {getEquivalenceLabel(result.mapping.equivalence)}
                </span>
              </div>

              {/* Target Code */}
              <div className="flex-1 text-center md:text-right">
                <p className="text-sm text-gray-500 mb-1">ICD-11 TM2 Code</p>
                {result.mapping.tm2Code ? (
                  <>
                    <p className="text-2xl font-mono font-bold text-gray-900">
                      {result.mapping.tm2Code.code}
                    </p>
                    <p className="text-gray-600 mt-1">{result.mapping.tm2Code.title}</p>
                  </>
                ) : (
                  <p className="text-xl text-gray-400">No match found</p>
                )}
              </div>
            </div>

            {/* Confidence & Reasoning */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">Confidence Score</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatConfidence(result.mapping.confidence)}
                </span>
              </div>
              
              {/* Confidence Bar */}
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${result.mapping.confidence * 100}%` }}
                />
              </div>

              {result.mapping.reasoning && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">AI Reasoning</p>
                  <p className="text-gray-700">{result.mapping.reasoning}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample Codes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Try These Sample Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              { code: 'A-1', system: 'unani', label: 'A-1 (Unani)' },
              { code: 'AAA-1', system: 'ayurveda', label: 'AAA-1 (Ayurveda)' },
              { code: 'S-1', system: 'siddha', label: 'S-1 (Siddha)' },
            ].map((sample) => (
              <button
                key={sample.code}
                onClick={() => {
                  setCode(sample.code);
                  setSystem(sample.system);
                }}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
