import React, { useMemo, useState } from 'react';
import {
  Flag,
  Edit3,
  Trash2,
  MessageSquare,
  X,
  Save,
  Users,
  MoreHorizontal,
  CheckCircle,
  RotateCcw
} from 'lucide-react';
import { useCasesOfConcern } from '@/hooks/data/useCasesOfConcern';
import { formatDate } from '@/utils/format';
import { ProductLink } from '@/components/features/cases/ProductLink';
import { ConcernType, CreateCaseOfConcernInput, UpdateCaseOfConcernInput } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { MentionSuggestions } from '@/components/features/cases/MentionSuggestions';
import { MentionRenderer } from '@/components/features/cases/MentionRenderer';
import { useMentions } from '@/hooks/useMentions';

const concernTypeConfig: Record<ConcernType, { label: string; color: string; bgColor: string }> = {
  product: { label: 'Product', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  supplier: { label: 'Supplier', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  spend_per_pax: { label: 'Spend per Pax', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  price_variation: { label: 'Price Variation', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  efficiency: { label: 'Efficiency', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  quality: { label: 'Quality', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  delivery: { label: 'Delivery', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  contract: { label: 'Contract', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  other: { label: 'Other', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

export const CasesOfConcern: React.FC = () => {
  const { cases, isLoading, error, createCase, updateCase, deleteCase, addComment, deleteComment } = useCasesOfConcern(undefined, { simple: true });
  const { user } = useAuth();
  const [editingCase, setEditingCase] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown) {
        const target = event.target as Element;
        // Check if click is outside the dropdown menu
        if (!target.closest('[data-dropdown-menu]')) {
          setShowDropdown(null);
        }
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Communication composer
  const [composerTitle, setComposerTitle] = useState('');
  const [composerDescription, setComposerDescription] = useState('');
  const [isStartingCase, setIsStartingCase] = useState(false);
  const [newCaseType, setNewCaseType] = useState<ConcernType>('other');

  const [editData, setEditData] = useState<UpdateCaseOfConcernInput>({});
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Mention system
  const {
    showSuggestions,
    mentionPosition,
    suggestionPosition,
    textareaRef,
    handleTextChange,
    insertMention,
    closeSuggestions,
    handleKeyDown,
    parseMentions
  } = useMentions();

  // Participants list derived from case creators and commenters
  const participants = useMemo(() => {
    const participantIdToInfo = new Map<string, { id: string; name: string; count: number }>();

    for (const caseItem of cases) {
      const creatorId = (caseItem as { created_by?: string }).created_by;
      const creatorName = (caseItem as { users?: { full_name?: string } }).users?.full_name;

      if (creatorId) {
        const existing = participantIdToInfo.get(creatorId);
        participantIdToInfo.set(creatorId, {
          id: creatorId,
          name: creatorName || existing?.name || 'Unknown',
          count: (existing?.count || 0) + 1,
        });
      }

      if ((caseItem as { case_comments?: Array<{ user_id?: string; users?: { full_name?: string } }> }).case_comments) {
        for (const comment of (caseItem as { case_comments: Array<{ user_id?: string; users?: { full_name?: string } }> }).case_comments) {
          const commentUserId = comment.user_id;
          if (!commentUserId) continue;
          const existing = participantIdToInfo.get(commentUserId);
          participantIdToInfo.set(commentUserId, {
            id: commentUserId,
            name: comment.users?.full_name || existing?.name || 'Unknown',
            count: (existing?.count || 0) + 1,
          });
        }
      }
    }

    const everyone = Array.from(participantIdToInfo.values());
    return everyone.sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name));
  }, [cases]);

  const [activeParticipant, setActiveParticipant] = useState<string | null>(null);

  const filteredCases = useMemo(() => {
    let list = cases;
    if (activeParticipant) {
      list = list.filter(c => {
        if ((c as { created_by?: string }).created_by === activeParticipant) return true;
        const comments = (c as { case_comments?: Array<{ user_id?: string }> }).case_comments || [];
        return comments.some((cm: { user_id?: string }) => cm.user_id === activeParticipant);
      });
    }
    // Exclusive toggle: show only open when off, only resolved when on
    list = list.filter(c => (showResolved ? c.status === 'resolved' : c.status === 'open'));
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(c => {
        const inTitle = (c.title || '').toLowerCase().includes(q);
        const inDesc = (c.description || '').toLowerCase().includes(q);
        const comments = (c as { case_comments?: Array<{ comment?: string }> }).case_comments || [];
        const inComments = comments.some((cm: { comment?: string }) => (cm.comment || '').toLowerCase().includes(q));
        return inTitle || inDesc || inComments;
      });
    }
    return list;
  }, [cases, activeParticipant, showResolved, searchQuery]);

  const handleSaveEdit = async (id: string) => {
    try {
      await updateCase(id, editData);
      setEditingCase(null);
      setEditData({});
    } catch (err) {
      console.error('Error updating case:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditingCase(null);
    setEditData({});
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      await updateCase(id, {
        status: currentStatus === 'open' ? 'resolved' : 'open'
      });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteCase = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this case?')) {
      try {
        await deleteCase(id);
      } catch (err) {
        console.error('Error deleting case:', err);
      }
    }
  };

  const handleAddComment = async (caseId: string) => {
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    
    try {
      await addComment({ case_id: caseId, comment: newComment.trim() });
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      // Show user-friendly error message
      alert('Failed to add comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const startCaseFromComposer = async () => {
    const title = composerTitle.trim();
    const description = composerDescription.trim();
    if (!title) return;
    const payload: CreateCaseOfConcernInput = {
      title: title.slice(0, 140),
      description,
      concern_type: newCaseType,
    };
    setIsStartingCase(true);
    try {
      await createCase(payload);
      setComposerTitle('');
      setComposerDescription('');
    } catch (err) {
      console.error('Error creating case:', err);
    } finally {
      setIsStartingCase(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cases of Concern</h1>
              <p className="mt-2 text-gray-600">Team communication around issues that need attention</p>
            </div>
          </div>
        </div>

        {/* Layout: participants sidebar + center feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Participants */}
          <aside className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Participants</h3>
              </div>
              <div className="p-2 max-h-[28rem] overflow-auto">
                <button
                  onClick={() => setActiveParticipant(null)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-gray-50 ${!activeParticipant ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">ALL</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">All</div>
                    <div className="text-xs text-gray-500">{cases.length} cases</div>
                  </div>
                </button>
                <div className="mt-1 space-y-1">
                  {participants.map((p) => {
                    const initials = (p.name || 'U')
                      .split(/\s|\./)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((s: string) => s[0]?.toUpperCase())
                      .join('');
                    return (
                      <button
                        key={p.id}
                        onClick={() => setActiveParticipant(p.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-gray-50 ${activeParticipant === p.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">{initials || 'U'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{p.name}</div>
                          <div className="text-xs text-gray-500">{p.count} messages</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* Conversation feed */}
          <section className="lg:col-span-9 space-y-4">
            {/* Filters */}
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cases..."
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showResolved}
                  onChange={(e) => setShowResolved(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Show resolved
              </label>
            </div>
            {/* Composer */}
            <div className="bg-white rounded-lg shadow p-4 relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Flag a new case of concern</label>
              <input
                type="text"
                value={composerTitle}
                onChange={(e) => setComposerTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                placeholder="Short, clear title..."
              />
              <textarea
                ref={textareaRef}
                value={composerDescription}
                onChange={(e) => {
                  const value = e.target.value;
                  setComposerDescription(value);
                  handleTextChange(value, e.target.selectionStart);
                }}
                onKeyDown={handleKeyDown}
                onSelect={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  handleTextChange(target.value, target.selectionStart);
                }}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Details... Use @ to mention users, products, suppliers, locations, or invoices"
              />
              <div className="mt-3 flex justify-end items-center gap-2">
                <label className="text-sm text-gray-600" htmlFor="new-case-type">Type</label>
                <select
                  id="new-case-type"
                  value={newCaseType}
                  onChange={(e) => setNewCaseType(e.target.value as ConcernType)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isStartingCase}
                >
                  {Object.keys(concernTypeConfig).map((key) => (
                    <option key={key} value={key}>
                      {concernTypeConfig[key as ConcernType].label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={startCaseFromComposer}
                  disabled={!composerTitle.trim() || isStartingCase}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  {isStartingCase ? 'Starting...' : 'Start Case'}
                </button>
              </div>
              
              {/* Mention Suggestions */}
              {showSuggestions && mentionPosition && (
                <MentionSuggestions
                  query={mentionPosition.query}
                  onSelect={(suggestion) => {
                    const newText = insertMention(suggestion, composerDescription, textareaRef.current?.selectionStart || 0);
                    setComposerDescription(newText);
                  }}
                  onClose={closeSuggestions}
                  position={suggestionPosition}
                />
              )}
            </div>

            {/* Feed items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {filteredCases.length === 0 ? (
                <div className="p-12 text-center">
                  <Flag className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No conversations yet</h3>
                  <p className="mt-2 text-gray-500">Use the composer above to start one</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredCases.map((caseItem) => {
                    const typeConfig = concernTypeConfig[caseItem.concern_type];
                    const isEditing = editingCase === caseItem.id;
                    const isShowing = showComments === caseItem.id;

                    const initials = (((caseItem as { users?: { full_name?: string } }).users?.full_name) || 'U')
                      .split(/\s|\./)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((s: string) => s[0]?.toUpperCase())
                      .join('');

                    return (
                      <div key={caseItem.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        {/* Post Header */}
                        <div className="p-4 border-b border-gray-100">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                                {initials}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editData.title || ''}
                                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                        className="w-full text-lg font-semibold bg-white border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                                      />
                                    ) : (
                                      caseItem.title
                                    )}
                                  </h3>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeConfig.bgColor} ${typeConfig.color}`}>
                                    {typeConfig.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <span className="font-medium">{((caseItem as { users?: { full_name?: string } }).users?.full_name) || 'Unknown User'}</span>
                                  <span>•</span>
                                  <span>{formatDate(caseItem.created_at)}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Three-dot menu */}
                            <div className="relative" data-dropdown-menu>
                              <button
                                onClick={() => setShowDropdown(showDropdown === caseItem.id ? null : caseItem.id)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                              >
                                <MoreHorizontal className="h-5 w-5" />
                              </button>
                              
                              {showDropdown === caseItem.id && (
                                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]" data-dropdown-menu>
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => handleSaveEdit(caseItem.id)}
                                        className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                      >
                                        <Save className="h-4 w-4" />
                                        Save changes
                                      </button>
                                      <button
                                        onClick={handleCancelEdit}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <X className="h-4 w-4" />
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      {user?.id === (caseItem as { created_by?: string }).created_by && (
                                        <>
                                          <button
                                            onClick={() => { 
                                              setEditingCase(caseItem.id); 
                                              setEditData({ title: caseItem.title, description: caseItem.description, concern_type: caseItem.concern_type }); 
                                              setShowDropdown(null);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                                          >
                                            <Edit3 className="h-4 w-4" />
                                            Edit case
                                          </button>
                                          <button
                                            onClick={() => {
                                              handleDeleteCase(caseItem.id);
                                              setShowDropdown(null);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                            Delete case
                                          </button>
                                        </>
                                      )}
                                      <button
                                        onClick={() => {
                                          handleToggleStatus(caseItem.id, caseItem.status);
                                          setShowDropdown(null);
                                        }}
                                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                                          caseItem.status === 'open'
                                            ? 'text-green-600 hover:bg-green-50'
                                            : 'text-orange-600 hover:bg-orange-50'
                                        }`}
                                      >
                                        {caseItem.status === 'open' ? (
                                          <>
                                            <CheckCircle className="h-4 w-4" />
                                            Resolve
                                          </>
                                        ) : (
                                          <>
                                            <RotateCcw className="h-4 w-4" />
                                            Reopen
                                          </>
                                        )}
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Post Content */}
                        <div className="p-4">
                          {isEditing ? (
                            <div className="space-y-4">
                              {/* Concern Type Selector */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Concern Type</label>
                                <select
                                  value={editData.concern_type || caseItem.concern_type}
                                  onChange={(e) => setEditData({ ...editData, concern_type: e.target.value as ConcernType })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  {Object.keys(concernTypeConfig).map((key) => (
                                    <option key={key} value={key}>
                                      {concernTypeConfig[key as ConcernType].label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              
                              {/* Description */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                  value={editData.description || ''}
                                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                  rows={3}
                                  className="w-full text-gray-600 bg-white border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                  placeholder="Describe the concern..."
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {caseItem.description && (
                                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                  <MentionRenderer 
                                    text={caseItem.description} 
                                    mentions={parseMentions(caseItem.description)} 
                                  />
                                </div>
                              )}
                              
                              {/* Related Product Link */}
                              {(caseItem as unknown as { related_product_code?: string }).related_product_code && (
                                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                  <span className="text-sm font-medium text-gray-500">Related Product:</span>
                                  <ProductLink 
                                    productCode={(caseItem as unknown as { related_product_code: string }).related_product_code}
                                    supplierId={(caseItem as unknown as { related_supplier_id?: string }).related_supplier_id}
                                    supplierName={(caseItem as unknown as { related_supplier_name?: string }).related_supplier_name}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Post Actions */}
                        <div className="px-4 py-3 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => setShowComments(isShowing ? null : caseItem.id)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                (((caseItem as { case_comments?: unknown[] }).case_comments?.length || 0) > 0)
                                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                                  : 'text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              <MessageSquare className="h-4 w-4" />
                              {((caseItem as { case_comments?: unknown[] }).case_comments?.length || 0) > 0
                                ? `${(caseItem as { case_comments?: unknown[] }).case_comments!.length} comment${((caseItem as { case_comments?: unknown[] }).case_comments!.length) !== 1 ? 's' : ''}`
                                : 'Comment'
                              }
                            </button>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              {/* Status removed as requested */}
                            </div>
                          </div>
                        </div>

                        {/* Comments Section */}
                        {isShowing && (
                          <div className="border-t border-gray-100 bg-gray-50">
                            <div className="p-4 space-y-4">
                              {/* Existing Comments */}
                              {(caseItem as { case_comments?: Array<{ id: string; comment: string; created_at: string; user_id: string; users?: { full_name?: string } }> }).case_comments && (caseItem as { case_comments?: Array<{ id: string; comment: string; created_at: string; user_id: string; users?: { full_name?: string } }> }).case_comments!.length > 0 && (
                                <div className="space-y-3">
                                  {(caseItem as { case_comments: Array<{ id: string; comment: string; created_at: string; user_id: string; users?: { full_name?: string } }> }).case_comments.map((comment) => (
                                    <div key={comment.id} className="bg-white rounded-lg p-3 border border-gray-200">
                                      <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                                          {(comment.users?.full_name || 'U').charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-gray-900">{comment.users?.full_name || 'Unknown'}</span>
                                            <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                                          </div>
                                          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                            <MentionRenderer 
                                              text={comment.comment} 
                                              mentions={parseMentions(comment.comment)} 
                                            />
                                          </div>
                                        </div>
                                        {user?.id === comment.user_id && (
                                          <button
                                            onClick={() => deleteComment(comment.id)}
                                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                                            title="Delete comment"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Add Comment Form */}
                              <form 
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  handleAddComment(caseItem.id);
                                }}
                                className="bg-white rounded-lg p-3 border border-gray-200"
                              >
                                <div className="flex gap-3">
                                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                                    {user?.email?.charAt(0)?.toUpperCase() || 'U'}
                                  </div>
                                  <div className="flex-1 space-y-3">
                                    <div className="relative">
                                      <textarea
                                        ref={textareaRef}
                                        value={newComment}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          setNewComment(value);
                                          handleTextChange(value, e.target.selectionStart || 0);
                                        }}
                                        onSelect={(e) => {
                                          const target = e.target as HTMLTextAreaElement;
                                          handleTextChange(target.value, target.selectionStart || 0);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAddComment(caseItem.id);
                                          } else {
                                            handleKeyDown();
                                          }
                                        }}
                                        placeholder="Write a comment..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                                        rows={2}
                                      />
                                      
                                      {/* Mention Suggestions */}
                                      {showSuggestions && mentionPosition && (
                                        <MentionSuggestions
                                          query={mentionPosition.query}
                                          onSelect={(suggestion) => {
                                            console.log('🔥 SELECTION CLICKED:', suggestion);
                                            console.log('🔥 Current text:', newComment);
                                            console.log('🔥 Mention position:', mentionPosition);
                                            
                                            const cursorPosition = textareaRef.current?.selectionStart || 0;
                                            console.log('🔥 Cursor position:', cursorPosition);
                                            
                                            const newText = insertMention(suggestion, newComment, cursorPosition);
                                            console.log('🔥 New text after insertMention:', newText);
                                            
                                            // Force update the textarea directly
                                            if (textareaRef.current) {
                                              textareaRef.current.value = newText;
                                            }
                                            
                                            setNewComment(newText);
                                            console.log('🔥 State updated with:', newText);
                                          }}
                                          onClose={closeSuggestions}
                                          position={suggestionPosition}
                                        />
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                      <div className="text-xs text-gray-500">
                                        Press Enter to submit, Shift+Enter for new line
                                      </div>
                                      
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setNewComment('')}
                                          disabled={!newComment.trim()}
                                          className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                          Clear
                                        </button>
                                        
                                        <button
                                          type="submit"
                                          disabled={!newComment.trim() || isSubmittingComment}
                                          className="px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                                        >
                                          {isSubmittingComment ? 'Posting...' : 'Post'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </form>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};



