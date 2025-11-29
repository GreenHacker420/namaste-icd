'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getEquivalenceColor } from '@/lib/utils';

export function EquivalenceChart({ data }) {
  if (!data?.mappingsByEquivalence || data.mappingsByEquivalence.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mappings by Equivalence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            No mappings yet. Create your first mapping!
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.mappingsByEquivalence.map(m => ({
    name: m.equivalence,
    count: m.count,
    color: getEquivalenceColor(m.equivalence),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mappings by Equivalence</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
