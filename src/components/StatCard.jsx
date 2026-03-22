import React from 'react';

const StatCard = ({ title, value, icon, color, bgColor, change, changeType, prefix = '', suffix = '' }) => {
  return (
    <div className="stat-card card-hover" style={{ cursor: 'default' }}>
      <div className="stat-icon" style={{ backgroundColor: bgColor || `${color}20` }}>
        <span className="material-icons" style={{ color: color, fontSize: '24px' }}>
          {icon}
        </span>
      </div>
      <div className="stat-value">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </div>
      <div className="stat-label">{title}</div>
      {change !== undefined && (
        <div className={`stat-change ${changeType === 'positive' ? 'positive' : 'negative'}`}>
          <span className="material-icons" style={{ fontSize: '14px', verticalAlign: 'middle' }}>
            {changeType === 'positive' ? 'trending_up' : 'trending_down'}
          </span>
          {' '}{change}% vs last month
        </div>
      )}
    </div>
  );
};

export default StatCard;
