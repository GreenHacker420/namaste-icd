'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { searchNamaste, searchTm2 } from '@/lib/api';
import { getSystemBadgeClass } from '@/lib/utils';
import { Search, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [system, setSystem] = useState('');
  const [loading, setLoading] = useState(false);
  const [namasteResults, setNamasteResults] = useState([]);
  const [tm2Results, setTm2Results] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim() || query.length < 2) return;

    setLoading(true);
    try {
      const [namaste, tm2] = await Promise.all([
        searchNamaste(query, system || undefined),
        searchTm2(query),
      ]);
      setNamasteResults(namaste.results || []);
      setTm2Results(tm2.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-black font-fraunces text-[#1a1a1a]">Search Codes</h1>
          <p className="text-gray-500 mt-2 font-medium">
            Search across NAMASTE and ICD-11 TM2 code systems
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardContent className="py-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by term, code, or keyword (e.g., headache, fever, A-1)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-12 py-3 text-lg"
                />
              </div>

              <div className="flex gap-4">
                <Select
                  value={system}
                  onChange={(e) => setSystem(e.target.value)}
                  className="w-48"
                >
                  <option value="">All Systems</option>
                  <option value="ayurveda">Ayurveda</option>
                  <option value="siddha">Siddha</option>
                  <option value="unani">Unani</option>
                </Select>

                <Button type="submit" disabled={loading || query.length < 2}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {(namasteResults.length > 0 || tm2Results.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* NAMASTE Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>NAMASTE Codes</span>
                  <span className="text-sm font-normal text-gray-500">
                    {namasteResults.length} results
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {namasteResults.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500">
                    No NAMASTE codes found
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {namasteResults.map((item, i) => (
                      <div key={i} className="px-6 py-3 hover:bg-[#6699cc]/5 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-semibold text-gray-900">
                            {item.code}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSystemBadgeClass(item.system)}`}>
                            {item.system}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{item.term || item.display}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* TM2 Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>ICD-11 TM2 Codes</span>
                  <span className="text-sm font-normal text-gray-500">
                    {tm2Results.length} results
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {tm2Results.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500">
                    No TM2 codes found
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {tm2Results.map((item, i) => (
                      <div key={i} className="px-6 py-3 hover:bg-[#e58c8a]/5 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-semibold text-gray-900">
                            {item.code}
                          </span>
                          {item.category && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                              {item.category}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{item.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {!loading && namasteResults.length === 0 && tm2Results.length === 0 && query && (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-500">
                Try a different search term or check your spelling
              </p>
            </CardContent>
          </Card>
        )}

        {/* Initial State */}
        {!query && (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Search for codes</h3>
              <p className="text-gray-500 mb-6">
                Enter a term, code, or keyword to search across both code systems
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['headache', 'fever', 'diabetes', 'pain', 'cough'].map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="px-3 py-1.5 bg-white border border-[#6699cc]/20 hover:bg-[#6699cc]/10 rounded-lg text-sm text-[#6699cc] font-medium transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Link to Mapping */}
        <div className="mt-8 text-center">
          <Link href="/mapping">
            <Button variant="secondary">
              Try AI Mapping
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
