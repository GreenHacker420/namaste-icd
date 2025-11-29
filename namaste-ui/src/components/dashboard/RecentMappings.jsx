'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ArrowRight } from 'lucide-react';
import {
  getEquivalenceBadgeClass,
  getSystemBadgeClass,
  formatConfidence,
  formatDateTime
} from '@/lib/utils';

export function RecentMappings({ data }) {
  const mappings = data?.recentMappings || [];

  if (mappings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Mappings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>No mappings created yet.</p>
            <p className="text-sm mt-1">Use the AI Mapping tool to create your first mapping!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Mappings</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {mappings.map((mapping) => (
            <div key={mapping.id} className="px-6 py-4 hover:bg-[#6699cc]/5 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* NAMASTE Code */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {mapping.namasteCode}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSystemBadgeClass(mapping.namasteSystem)}`}>
                        {mapping.namasteSystem}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{mapping.namasteTerm}</p>
                  </div>

                  <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />

                  {/* TM2 Code */}
                  <div className="min-w-0">
                    {mapping.tm2Code ? (
                      <>
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {mapping.tm2Code}
                        </span>
                        <p className="text-sm text-gray-500 truncate">{mapping.tm2Title}</p>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">No match</span>
                    )}
                  </div>
                </div>

                {/* Equivalence & Confidence */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getEquivalenceBadgeClass(mapping.equivalence)}`}>
                    {mapping.equivalence}
                  </span>
                  <span className="text-sm font-medium text-gray-600">
                    {formatConfidence(mapping.confidence)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
