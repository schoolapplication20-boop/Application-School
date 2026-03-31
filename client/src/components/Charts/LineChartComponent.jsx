import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
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
              {entry.name.toLowerCase().includes('attendance') || entry.name.toLowerCase().includes('%')
                ? `${entry.value}%`
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

const LineChartComponent = ({
  data,
  lines = [
    { key: 'attendance', name: 'Attendance %', color: '#76C442' },
  ],
  height = 300,
  useArea = true,
}) => {
  const ChartComponent = useArea ? AreaChart : LineChart;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ChartComponent
        data={data}
        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
      >
        <defs>
          {lines.map((line) => (
            <linearGradient key={line.key} id={`gradient_${line.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={line.color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={line.color} stopOpacity={0.01} />
            </linearGradient>
          ))}
        </defs>
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
          domain={[60, 100]}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
          iconType="circle"
          iconSize={8}
        />
        {lines.map((line) => (
          useArea ? (
            <Area
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={2.5}
              fill={`url(#gradient_${line.key})`}
              dot={{ r: 4, fill: line.color, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, fill: line.color }}
            />
          ) : (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={2.5}
              dot={{ r: 4, fill: line.color, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, fill: line.color }}
            />
          )
        ))}
      </ChartComponent>
    </ResponsiveContainer>
  );
};

export default LineChartComponent;
