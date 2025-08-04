import React from 'react';
import { useHealthMonitor } from '../utils/healthMonitor.jsx';

export function HealthStatusIndicator() {
  const { health } = useHealthMonitor();

  if (!health) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'healthy': return 'Alle systemer fungerer';
      case 'degraded': return 'Noen problemer oppdaget';
      case 'critical': return 'Kritiske problemer';
      default: return 'Status ukjent';
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`w-2 h-2 rounded-full ${getStatusColor(health.status)}`}
        title={getStatusText(health.status)}
      />
      <span className="text-gray-600">
        {getStatusText(health.status)}
      </span>
    </div>
  );
}

export default HealthStatusIndicator;

