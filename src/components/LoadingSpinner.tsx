import React from 'react'

export const LoadingSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`flex items-center justify-center py-20 ${className || ''}`}>
    <div className="relative">
      <div className="w-12 h-12 border-4 border-gray-200 rounded-full" />
      <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin absolute inset-0" />
    </div>
  </div>
)
