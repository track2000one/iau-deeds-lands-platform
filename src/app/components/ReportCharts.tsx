import React from 'react';
import {
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#7c6f64', '#8f7a66', '#a38b73', '#5f6f73', '#8b6f47', '#8c7a6b', '#6e7d70', '#9c8f84'];

/** Isolated chart engine, downloaded only when a report chart enters the viewport. */
export const ReportCharts: React.FC<{
  variant: 'overview' | 'distribution' | 'pie';
  data: any[];
}> = ({ variant, data }) => {
  const height = variant === 'overview' ? 300 : 240;
  if (variant === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPie>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => entry.name}
            outerRadius={90}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </RechartsPie>
      </ResponsiveContainer>
    );
  }

  if (variant === 'distribution') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#8f7a66" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="4 6" stroke="rgba(120,113,108,0.18)" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#57534e' }} interval={0} />
        <YAxis tick={{ fontSize: 11, fill: '#57534e' }} />
        <Tooltip
          contentStyle={{
            borderRadius: 18,
            border: '1px solid rgba(255,255,255,0.7)',
            background: 'rgba(255,255,255,0.92)',
            boxShadow: '0 18px 50px rgba(15,23,42,0.14)',
            backdropFilter: 'blur(18px)',
          }}
        />
        <Bar dataKey="value" fill="#8f7a66" radius={[10, 10, 2, 2]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
