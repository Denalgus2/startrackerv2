// Comprehensive loading system with different states and skeletons
import React from 'react';
import { motion } from 'framer-motion';

// Loading spinner component
export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <motion.div
        className="w-full h-full border-2 border-blue-200 border-t-blue-600 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

// Skeleton loading components
export function SkeletonLoader({ width = 'full', height = '4', className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-md h-${height} w-${width} ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <SkeletonLoader width="32" height="6" />
        <SkeletonLoader width="20" height="8" className="rounded-full" />
      </div>
      <div className="space-y-3">
        <SkeletonLoader width="full" height="4" />
        <SkeletonLoader width="3/4" height="4" />
        <SkeletonLoader width="1/2" height="4" />
      </div>
      <div className="flex gap-2 mt-4">
        <SkeletonLoader width="20" height="8" className="rounded-lg" />
        <SkeletonLoader width="24" height="8" className="rounded-lg" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonLoader key={i} width="full" height="6" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonLoader key={colIndex} width="full" height="4" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Page loading component
export function PageLoader({ message = 'Laster...' }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="xl" className="mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{message}</h2>
        <p className="text-gray-600">Vennligst vent...</p>
      </div>
    </div>
  );
}

// Suspense fallback component
export function SuspenseFallback({ message = 'Laster innhold...' }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-3" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

// Button loading state
export function LoadingButton({
  children,
  loading = false,
  disabled = false,
  onClick,
  className = '',
  size = 'md',
  variant = 'primary',
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 disabled:bg-blue-400',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500 disabled:bg-gray-400',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 disabled:bg-green-400',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 disabled:bg-red-400'
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <LoadingSpinner size="sm" className="mr-2" />}
      {children}
    </button>
  );
}

// Lazy loading wrapper with error boundary
export function LazyWrapper({ children, fallback = <SuspenseFallback /> }) {
  return (
    <React.Suspense fallback={fallback}>
      {children}
    </React.Suspense>
  );
}

// Progressive image loading
export function ProgressiveImage({
  src,
  alt,
  className = '',
  placeholderClassName = 'bg-gray-200',
  ...props
}) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {loading && (
        <div className={`absolute inset-0 animate-pulse ${placeholderClassName}`} />
      )}
      <img
        src={src}
        alt={alt}
        className={`transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'} ${className}`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        {...props}
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
          Kunne ikke laste bilde
        </div>
      )}
    </div>
  );
}
