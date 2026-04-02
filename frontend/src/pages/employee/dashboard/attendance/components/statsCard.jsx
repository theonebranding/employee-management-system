// components/StatsCard.jsx
import React from 'react';

import SurfaceCard from '../../../../../components/ui/surfaceCard';

const StatsCard = ({ icon: Icon, title, value, colorClass, subText }) => (
  <SurfaceCard>
    <div className="flex items-center gap-4 mb-4">
      <div className={`p-2 ${colorClass} rounded-lg`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">{title}</h3>
    </div>
    {subText && <span className="text-xs text-warning">{subText}</span>}
    <p className="text-light-text dark:text-dark-text">{value}</p>
  </SurfaceCard>
);

export default StatsCard;
