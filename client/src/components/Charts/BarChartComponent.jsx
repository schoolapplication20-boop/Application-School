import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#fff',
        border: '1px solid #f0f4f8',
        borderRadius: '10px',
        padding: '12px 16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        fontSize: '13px'
      }}>
        <p style={{ fontWeight: 700, color: '#2d3748', marginBottom: '8px' }}>{label}</p>
        {payload.map((entry) => (
          <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: entry.color }} />
            <span style={{ color: '#718096' }}>{entry.name}:</span>
            <span style={{ fontWeight: 600, color: '#2d3748' }}>
              {entry.name.toLowerCase().includes('revenue') || entry.name.toLowerCase().includes('expense')
                ? `₹${entry.value.toLocaleString()}`
                : entry.value
              }
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const BarChartComponent = ({
  data,
  bars = [
    { key: 'revenue', name: 'Revenue', color: '#76C442' },
    { key: 'expenses', name: 'Expenses', color: '#e53e3e' },
  ],
  height = 300,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        barGap={4}
        barCategoryGap="30%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: '#a0aec0', fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#a0aec0', fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => {
            if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
            return value;
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
          iconType="circle"
          iconSize={8}
        />
        {bars.map((bar) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.name}
            fill={bar.color}
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BarChartComponent;
