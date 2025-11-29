'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { SystemsChart } from '@/components/dashboard/SystemsChart';
import { EquivalenceChart } from '@/components/dashboard/EquivalenceChart';
import { RecentMappings } from '@/components/dashboard/RecentMappings';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { getDashboard } from '@/lib/api';
import {
  ArrowRight,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const dashboard = await getDashboard();
      setData(dashboard);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#6699cc] animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">Connection Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <p className="text-sm text-red-500 mb-4">
              Make sure the backend is running at http://localhost:3000
            </p>
            <Button onClick={fetchData} variant="danger">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black font-fraunces text-[#1a1a1a]">Dashboard</h1>
            <p className="text-gray-500 mt-2 font-medium">
              NAMASTE to ICD-11 TM2 Intelligent Mapping Engine
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Link href="/mapping">
              <Button className="bg-[#5693d1] hover:shadow-lg">
                <Sparkles className="w-4 h-4 mr-2" />
                New Mapping
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <StatsCards data={data} />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <SystemsChart data={data} />
          <EquivalenceChart data={data} />
        </div>

        {/* Recent Mappings */}
        <div className="mt-6">
          <RecentMappings data={data} />
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/mapping" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-[#6699cc]/20">
              <CardContent className="py-6 text-center">
                <div className="w-12 h-12 bg-[#6699cc]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-[#6699cc]" />
                </div>
                <h3 className="font-semibold text-gray-900">AI Mapping</h3>
                <p className="text-sm text-gray-500 mt-1">Map NAMASTE codes to TM2</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/browse" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-[#6699cc]/20">
              <CardContent className="py-6 text-center">
                <div className="w-12 h-12 bg-[#e58c8a]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#e58c8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6M12 9v6" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Browse Codes</h3>
                <p className="text-sm text-gray-500 mt-1">Explore NAMASTE & TM2 codes</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/search" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-[#6699cc]/20">
              <CardContent className="py-6 text-center">
                <div className="w-12 h-12 bg-[#e58c8a]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#e58c8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Search</h3>
                <p className="text-sm text-gray-500 mt-1">Find codes by term or keyword</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
