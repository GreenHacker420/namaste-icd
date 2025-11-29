'use client';

import { Card, CardContent } from '@/components/ui/Card';
import {
  FileText,
  GitCompare,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';

export function StatsCards({ data }) {
  if (!data) return null;

  const stats = [
    {
      label: 'NAMASTE Codes',
      value: data.overview?.totalNamasteCodes?.toLocaleString() || '0',
      icon: FileText,
      color: 'text-[#6699cc]',
      bgColor: 'bg-[#6699cc]/10',
    },
    {
      label: 'TM2 Codes',
      value: data.overview?.totalTm2Codes?.toLocaleString() || '0',
      icon: GitCompare,
      color: 'text-[#e58c8a]',
      bgColor: 'bg-[#e58c8a]/10',
    },
    {
      label: 'Mappings Created',
      value: data.overview?.totalMappings?.toLocaleString() || '0',
      icon: CheckCircle2,
      color: 'text-[#5588bb]',
      bgColor: 'bg-[#5588bb]/10',
    },
    {
      label: 'Coverage',
      value: data.overview?.mappingCoverage || '0%',
      icon: TrendingUp,
      color: 'text-[#d47b79]',
      bgColor: 'bg-[#d47b79]/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
