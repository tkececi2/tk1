import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'yellow' | 'blue' | 'green' | 'red';
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  color = 'yellow'
}) => {
  const colorClasses = {
    yellow: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      icon: 'text-yellow-500',
    },
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      icon: 'text-blue-500',
    },
    green: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      icon: 'text-green-500',
    },
    red: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      icon: 'text-red-500',
    },
  };

  return (
    <div className="stats-card">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className={`mt-2 text-3xl font-semibold ${colorClasses[color].text}`}>
          {value}
        </p>
        {trend && (
          <div className="mt-2 flex items-center">
            <span
              className={`text-sm font-medium ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend.isPositive ? '+' : '-'}{trend.value}%
            </span>
            <span className="text-sm text-gray-500 ml-2">geçen aydan</span>
          </div>
        )}
      </div>
      <div className={`stats-card-icon ${colorClasses[color].bg}`}>
        <Icon className={`h-6 w-6 ${colorClasses[color].icon}`} />
      </div>
    </div>
  );
};