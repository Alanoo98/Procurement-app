import React from 'react';

interface DashboardCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ title, subtitle, children }) => {
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">{title}</h2>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
};

