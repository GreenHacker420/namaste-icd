'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { getNamasteCodes, getTm2Codes } from '@/lib/api';
import {
  getSystemBadgeClass,
  getEquivalenceBadgeClass,
  formatConfidence
} from '@/lib/utils';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  GitCompare
} from 'lucide-react';

export default function BrowsePage() {
  const [activeTab, setActiveTab] = useState('namaste');
  const [search, setSearch] = useState('');
  const [system, setSystem] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'namaste') {
        const result = await getNamasteCodes({ search, system, page, limit: 15 });
        setData(result);
      } else {
        const result = await getTm2Codes({ search, category, page, limit: 15 });
        setData(result);
        if (result.categories) {
          setCategories(result.categories);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, page]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search, system, category]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-black font-fraunces text-[#1a1a1a]">Browse Codes</h1>
          <p className="text-gray-500 mt-2 font-medium">
            Explore NAMASTE and ICD-11 TM2 code systems
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('namaste')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'namaste'
              ? 'bg-[#6699cc] text-white shadow-lg shadow-blue-200'
              : 'bg-white text-gray-600 hover:bg-[#6699cc]/5 border border-[#6699cc]/20'
              }`}
          >
            <FileText className="w-4 h-4" />
            NAMASTE Codes
          </button>
          <button
            onClick={() => setActiveTab('tm2')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'tm2'
              ? 'bg-[#e58c8a] text-white shadow-lg shadow-pink-200'
              : 'bg-white text-gray-600 hover:bg-[#e58c8a]/5 border border-[#e58c8a]/20'
              }`}
          >
            <GitCompare className="w-4 h-4" />
            TM2 Codes
          </button>
        </div>

        {/* Search & Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder={activeTab === 'namaste' ? 'Search by code, term, or English name...' : 'Search by code, title, or definition...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {activeTab === 'namaste' ? (
                <Select value={system} onChange={(e) => setSystem(e.target.value)} className="w-full sm:w-40">
                  <option value="">All Systems</option>
                  <option value="ayurveda">Ayurveda</option>
                  <option value="siddha">Siddha</option>
                  <option value="unani">Unani</option>
                </Select>
              ) : (
                <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full sm:w-48">
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name} ({cat.count})
                    </option>
                  ))}
                </Select>
              )}

              <Button type="submit">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {activeTab === 'namaste' ? 'NAMASTE Codes' : 'ICD-11 TM2 Codes'}
            </CardTitle>
            {data?.pagination && (
              <span className="text-sm text-gray-500">
                {data.pagination.total.toLocaleString()} total
              </span>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-100">
                  {data?.data?.map((item) => (
                    <div key={item.id} className="px-6 py-4 hover:bg-[#6699cc]/5 transition-colors">
                      {activeTab === 'namaste' ? (
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm font-semibold text-gray-900">
                                {item.code}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSystemBadgeClass(item.system)}`}>
                                {item.system}
                              </span>
                              {item.hasMappings && (
                                <Badge variant="success">Mapped</Badge>
                              )}
                            </div>
                            <p className="text-gray-700">{item.term}</p>
                            {item.englishName && (
                              <p className="text-sm text-gray-500 mt-1">{item.englishName}</p>
                            )}
                            {item.shortDefinition && (
                              <p className="text-sm text-gray-400 mt-1 line-clamp-2">{item.shortDefinition}</p>
                            )}
                          </div>
                          {item.bestMapping && (
                            <div className="text-right flex-shrink-0">
                              <span className="font-mono text-sm text-indigo-600">{item.bestMapping.tm2Code}</span>
                              <div className="flex items-center gap-2 mt-1 justify-end">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getEquivalenceBadgeClass(item.bestMapping.equivalence)}`}>
                                  {item.bestMapping.equivalence}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {formatConfidence(item.bestMapping.confidence)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
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
                          <p className="text-gray-700">{item.title}</p>
                          {item.definition && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.definition}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {data?.pagination && data.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!data.pagination.hasPrev}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {data.pagination.page} of {data.pagination.totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!data.pagination.hasNext}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
