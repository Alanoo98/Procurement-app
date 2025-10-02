import React, { useState } from 'react';
import { ArrowLeft, Edit, MessageSquare, Clock, User, Tag, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useCaseOfConcern } from '@/hooks/data/useCasesOfConcern';
import { formatDate } from '@/utils/format';
import { LoadingState, ErrorState } from '@/components/shared/ui/EmptyStates';

interface CaseOfConcernDetailProps {
  caseId: string;
  onClose: () => void;
  onEdit: () => void;
}

const statusConfig = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800', icon: AlertTriangle },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-800' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800' },
};

const concernTypeConfig = {
  product: { label: 'Product', color: 'bg-purple-100 text-purple-800' },
  supplier: { label: 'Supplier', color: 'bg-indigo-100 text-indigo-800' },
  spend_per_pax: { label: 'Spend per PAX', color: 'bg-green-100 text-green-800' },
  price_variation: { label: 'Price Variation', color: 'bg-yellow-100 text-yellow-800' },
  efficiency: { label: 'Efficiency', color: 'bg-blue-100 text-blue-800' },
  quality: { label: 'Quality', color: 'bg-pink-100 text-pink-800' },
  delivery: { label: 'Delivery', color: 'bg-orange-100 text-orange-800' },
  contract: { label: 'Contract', color: 'bg-teal-100 text-teal-800' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-800' },
};

const updateTypeConfig = {
  status_change: { label: 'Status Changed', color: 'bg-blue-100 text-blue-800' },
  assignment_change: { label: 'Assignment Changed', color: 'bg-purple-100 text-purple-800' },
  comment: { label: 'Comment Added', color: 'bg-gray-100 text-gray-800' },
  resolution: { label: 'Resolution', color: 'bg-green-100 text-green-800' },
  priority_change: { label: 'Priority Changed', color: 'bg-orange-100 text-orange-800' },
  target_date_change: { label: 'Target Date Changed', color: 'bg-yellow-100 text-yellow-800' },
  metadata_update: { label: 'Metadata Updated', color: 'bg-indigo-100 text-indigo-800' },
};

export const CaseOfConcernDetail: React.FC<CaseOfConcernDetailProps> = ({
  caseId,
  onClose,
  onEdit,
}) => {
  const { caseData, timeline, isLoading, error } = useCaseOfConcern(caseId);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  if (isLoading) {
    return <LoadingState message="Loading case details..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  if (!caseData) {
    return <ErrorState message="Case not found" onRetry={onClose} />;
  }

  const statusConfig = statusConfig[caseData.status];
  const priorityConfig = priorityConfig[caseData.priority];
  const typeConfig = concernTypeConfig[caseData.concern_type];
  const StatusIcon = statusConfig.icon;

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsAddingComment(true);
    try {
      // This would need to be implemented in the hook
      // await addComment(caseId, newComment.trim());
      setNewComment('');
      // Refresh timeline
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setIsAddingComment(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{caseData.title}</h1>
              <div className="flex items-center gap-4 mt-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                  <StatusIcon className="h-3 w-3" />
                  {statusConfig.label}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityConfig.color}`}>
                  {priorityConfig.label}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeConfig.color}`}>
                  {typeConfig.label}
                </span>
              </div>
            </div>
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {caseData.description && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-3">Description</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{caseData.description}</p>
              </div>
            )}

            {/* Context References */}
            {(caseData.related_supplier_id || caseData.related_location_id || caseData.related_product_code || caseData.related_invoice_number) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-3">Context References</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {caseData.related_supplier_id && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Related Supplier</label>
                      <p className="text-sm text-gray-900">{caseData.related_supplier_name || caseData.related_supplier_id}</p>
                    </div>
                  )}
                  {caseData.related_location_id && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Related Location</label>
                      <p className="text-sm text-gray-900">{caseData.related_location_name || caseData.related_location_id}</p>
                    </div>
                  )}
                  {caseData.related_product_code && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Related Product Code</label>
                      <p className="text-sm text-gray-900">{caseData.related_product_code}</p>
                    </div>
                  )}
                  {caseData.related_invoice_number && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Related Invoice Number</label>
                      <p className="text-sm text-gray-900">{caseData.related_invoice_number}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {caseData.tags.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-3">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {caseData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-emerald-800 bg-emerald-100 rounded-full"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Timeline</h2>
              {timeline.length === 0 ? (
                <p className="text-gray-500 text-sm">No timeline entries yet.</p>
              ) : (
                <div className="space-y-4">
                  {timeline.map((update) => {
                    const updateConfig = updateTypeConfig[update.update_type];
                    return (
                      <div key={update.id} className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className={`w-2 h-2 rounded-full ${updateConfig.color.replace('bg-', 'bg-').replace('text-', '')}`}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${updateConfig.color}`}>
                              {updateConfig.label}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(update.created_at)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700">
                            {update.update_type === 'status_change' && (
                              <span>Status changed from <strong>{update.old_value}</strong> to <strong>{update.new_value}</strong></span>
                            )}
                            {update.update_type === 'priority_change' && (
                              <span>Priority changed from <strong>{update.old_value}</strong> to <strong>{update.new_value}</strong></span>
                            )}
                            {update.update_type === 'assignment_change' && (
                              <span>Assignment changed from <strong>{update.old_value}</strong> to <strong>{update.new_value}</strong></span>
                            )}
                            {update.update_type === 'target_date_change' && (
                              <span>Target date changed from <strong>{update.old_value}</strong> to <strong>{update.new_value}</strong></span>
                            )}
                            {update.update_type === 'comment' && update.comment && (
                              <p className="whitespace-pre-wrap">{update.comment}</p>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            by {update.updated_by_name || update.updated_by_email || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Comment */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <form onSubmit={handleAddComment} className="space-y-3">
                  <label htmlFor="new_comment" className="block text-sm font-medium text-gray-700">
                    Add Comment
                  </label>
                  <textarea
                    id="new_comment"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Add a comment to the timeline..."
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isAddingComment || !newComment.trim()}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {isAddingComment ? 'Adding...' : 'Add Comment'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Case Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Case Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Created</label>
                  <p className="text-sm text-gray-900">{formatDate(caseData.created_at)}</p>
                  <p className="text-xs text-gray-500">by {caseData.created_by_name || caseData.created_by_email || 'Unknown'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="text-sm text-gray-900">{formatDate(caseData.updated_at)}</p>
                  <p className="text-xs text-gray-500">by {caseData.last_updated_by_name || caseData.last_updated_by_email || 'Unknown'}</p>
                </div>
                {caseData.assigned_to && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Assigned To</label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {caseData.assigned_to_name || caseData.assigned_to_email || 'Unknown'}
                      </span>
                    </div>
                  </div>
                )}
                {caseData.target_resolution_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Target Resolution</label>
                    <p className={`text-sm ${new Date(caseData.target_resolution_date) < new Date() && caseData.status !== 'resolved' && caseData.status !== 'closed' ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                      {formatDate(caseData.target_resolution_date)}
                    </p>
                  </div>
                )}
                {caseData.actual_resolution_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Actual Resolution</label>
                    <p className="text-sm text-gray-900">{formatDate(caseData.actual_resolution_date)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={onEdit}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Edit Case
                </button>
                {/* Add more quick actions as needed */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
