'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = {
  ayurveda: '#6699cc', // Main Blue
  siddha: '#4d80b3',   // Darker Blue
  unani: '#99c2ff',    // Lighter Blue
};

export function SystemsChart({ data }) {
  if (!data?.namasteSystems) return null;

  const chartData = data.namasteSystems.map(s => ({
    name: s.label,
    value: s.count,
    color: COLORS[s.system] || '#6b7280',
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>NAMASTE Systems</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => value.toLocaleString()}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
