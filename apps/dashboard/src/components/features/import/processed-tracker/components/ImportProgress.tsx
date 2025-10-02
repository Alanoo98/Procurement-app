import React from 'react';
import { Download, CheckCircle, Clock, AlertCircle, Database, FileText, Search } from 'lucide-react';
import { ImportStep, ImportProgress as ImportProgressType } from '../types';

interface ImportProgressProps {
  progress: ImportProgressType | null;
  onDismiss?: () => void;
}

export const ImportProgress: React.FC<ImportProgressProps> = ({ progress, onDismiss }) => {
  if (!progress || !progress.isActive) return null;

  const { totalSteps, completedSteps, steps, overallMessage, estimatedTime, startTime } = progress;
  
  // Calculate overall progress
  const overallProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  
  // Calculate elapsed time
  const elapsedTime = Math.floor((Date.now() - startTime.getTime()) / 1000);
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStepIcon = (step: ImportStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStepIconForType = (stepId: string) => {
    if (stepId.includes('fetch')) return <Search className="h-4 w-4" />;
    if (stepId.includes('voucher')) return <FileText className="h-4 w-4" />;
    if (stepId.includes('document')) return <Download className="h-4 w-4" />;
    if (stepId.includes('database')) return <Database className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-lg p-6 mb-6 shadow-sm animate-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Download className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-emerald-900">
              Importing Documents
            </h3>
            <p className="text-sm text-emerald-700">{overallMessage}</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm text-emerald-600">
            Step {completedSteps + 1} of {totalSteps}
          </div>
          <div className="text-xs text-emerald-500">
            {formatTime(elapsedTime)}
            {estimatedTime && ` / ~${estimatedTime}`}
          </div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-emerald-700 mb-2">
          <span>Overall Progress</span>
          <span>{Math.round(overallProgress)}%</span>
        </div>
        <div className="w-full bg-emerald-200 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-blue-500 h-3 rounded-full transition-all duration-700 ease-out shadow-sm"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => (
          <div 
            key={step.id}
            className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300 ease-out transform ${
              step.status === 'processing' 
                ? 'bg-emerald-100 border border-emerald-300 scale-[1.02] shadow-sm' 
                : step.status === 'completed'
                ? 'bg-green-50 border border-green-200'
                : step.status === 'failed'
                ? 'bg-red-50 border border-red-200'
                : 'bg-gray-50 border border-gray-200'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {step.status === 'pending' ? getStepIconForType(step.id) : getStepIcon(step)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className={`text-sm font-medium transition-colors duration-200 ${
                  step.status === 'processing' ? 'text-emerald-800' :
                  step.status === 'completed' ? 'text-green-800' :
                  step.status === 'failed' ? 'text-red-800' :
                  'text-gray-600'
                }`}>
                  {step.name}
                </h4>
                {step.status === 'processing' && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                )}
              </div>
              
              {step.message && (
                <p className={`text-xs mt-1 transition-colors duration-200 ${
                  step.status === 'processing' ? 'text-emerald-600' :
                  step.status === 'completed' ? 'text-green-600' :
                  step.status === 'failed' ? 'text-red-600' :
                  'text-gray-500'
                }`}>
                  {step.message}
                </p>
              )}
              
              {step.details && (
                <p className="text-xs text-gray-500 mt-1">
                  {step.details}
                </p>
              )}
              
              {step.status === 'processing' && step.startTime && (
                <p className="text-xs text-emerald-500 mt-1">
                  Started {formatTime(Math.floor((Date.now() - step.startTime.getTime()) / 1000))} ago
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Dismiss Button */}
      {onDismiss && completedSteps === totalSteps && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-sm text-emerald-700 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors duration-200 hover:scale-105 transform"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

