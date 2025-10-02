import React from 'react';
import { ProcessingProgress } from '../types';

interface ProcessedTrackerProgressProps {
  progress: ProcessingProgress | null;
}

export const ProcessedTrackerProgress: React.FC<ProcessedTrackerProgressProps> = ({ progress }) => {
  if (!progress) return null;

  const { total, processed, failed, pending, currentBatch, totalBatches, currentLocation, estimatedTime } = progress;
  
  // Calculate percentages
  const processedPercent = total > 0 ? (processed / total) * 100 : 0;
  const failedPercent = total > 0 ? (failed / total) * 100 : 0;
  const pendingPercent = total > 0 ? (pending / total) * 100 : 0;
  const batchProgress = totalBatches > 0 ? (currentBatch / totalBatches) * 100 : 0;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-blue-900">
          Processing Documents to Nanonets
        </h3>
        <span className="text-xs text-blue-600">
          Batch {currentBatch} of {totalBatches}
        </span>
      </div>

      {/* Current Location */}
      {currentLocation && (
        <div className="mb-3">
          <span className="text-xs text-blue-700">
            Current Location: {currentLocation}
          </span>
        </div>
      )}

      {/* Overall Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-blue-600 mb-1">
          <span>Overall Progress</span>
          <span>{Math.round(batchProgress)}%</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${batchProgress}%` }}
          />
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="text-center">
          <div className="text-green-600 font-medium">{processed}</div>
          <div className="text-green-500">Processed</div>
          <div className="w-full bg-green-200 rounded-full h-1 mt-1">
            <div 
              className="bg-green-500 h-1 rounded-full"
              style={{ width: `${processedPercent}%` }}
            />
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-red-600 font-medium">{failed}</div>
          <div className="text-red-500">Failed</div>
          <div className="w-full bg-red-200 rounded-full h-1 mt-1">
            <div 
              className="bg-red-500 h-1 rounded-full"
              style={{ width: `${failedPercent}%` }}
            />
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-yellow-600 font-medium">{pending}</div>
          <div className="text-yellow-500">Pending</div>
          <div className="w-full bg-yellow-200 rounded-full h-1 mt-1">
            <div 
              className="bg-yellow-500 h-1 rounded-full"
              style={{ width: `${pendingPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-3 text-xs text-blue-600">
        Total: {total} documents • {processed} processed • {failed} failed • {pending} pending
        {estimatedTime && (
          <span className="ml-2 text-blue-500">
            • Estimated time: {estimatedTime}
          </span>
        )}
      </div>
    </div>
  );
};

