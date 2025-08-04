import React, { useEffect, useState } from 'react';

function getTimeLeft(targetDate) {
  const now = new Date();
  const diff = new Date(targetDate) - now;
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
}

export default function Countdown({ target, label }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(target));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(target));
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (!target) return null;
  if (!timeLeft) return <span className="text-red-600 font-semibold">Tiden er utløpt</span>;

  return (
    <div className="flex items-center gap-2">
      {label && <span className="font-medium text-gray-700">{label}:</span>}
      <span className="font-mono text-lg">
        {timeLeft.days}d {timeLeft.hours}t {timeLeft.minutes}m {timeLeft.seconds}s
      </span>
    </div>
  );
}

