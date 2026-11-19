import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ClipboardPaste,
  Clock,
  FileText,
  Folder,
  FolderPlus,
  Link2,
  PanelLeft,
  Search,
  Trash2,
} from 'lucide-react';
import type {
  AppLanguage,
  DateFilterWindow,
  MediaType,
  MetadataSearchFilters,
  SourceCategoryFilter,
  StreamStage,
  VerificationFolder,
  VerificationResult,
  VerificationThread,
} from '../types';
import { getTranslations } from '../i18n/translations';
import { formatDateLocalized } from '../utils/formatDate';
import { RichContentRenderer } from './RichContentRenderer';
import { VerificationResultCard } from './VerificationResultCard';

interface TabVerificarProps {
  lang: AppLanguage;
  selectedType: MediaType;
  onSelectType: (type: MediaType) => void;
  content: string;
  onChangeContent: (value: string) => void;
  ragContext: string;
  onChangeRagContext: (value: string) => void;
  metadataFilters: MetadataSearchFilters;
  onChangeMetadataFilters: (filters: MetadataSearchFilters) => void;
  result: VerificationResult | null;
  loading: boolean;
  streamStage: StreamStage;
  streamingText: string;
  error: string | null;
  onRunVerify: (payload: {
    type: MediaType;
    content: string;
    ragContext?: string;
    metadataFilters?: MetadataSearchFilters;
  }) => void;
  isResultSaved: boolean;
  isResultReported: boolean;
  onSaveResult: () => void;
  onReportResult: () => void;
  threads: VerificationThread[];
  folders: VerificationFolder[];
  activeThreadId: string | null;
  onSelectThread: (thread: VerificationThread) => void;
  onDeleteThread: (threadId: string) => void;
  onCreateFolder: (name: string) => void;
  onMoveThreadToFolder: (threadId: string, folderId: string) => void;
}

export function TabVerificar({
  lang,
  selectedType,
  onSelectType,
  content,
  onChangeContent,
  ragContext,
  onChangeRagContext,
  metadataFilters,
  onChangeMetadataFilters,
  result,
  loading,
  streamStage,
  streamingText,
  error,
  onRunVerify,
  isResultSaved,
  isResultReported,
  onSaveResult,
  onReportResult,
  threads,
  folders,
  activeThreadId,
  onSelectThread,
  onDeleteThread,
  onCreateFolder,
  onMoveThreadToFolder,
}: TabVerificarProps) {
  const bundle = getTranslations(lang);
  const t = bundle.verificar;
  const resultT = bundle.result;
  const quickPrompts = bundle.inicio.quickPrompts;

  const [localError, setLocalError] = useState<string | null>(null);
  const [showRag, setShowRag] = useState(Boolean(ragContext));
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [threadSearch, setThreadSearch] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    setLocalError(null);
  }, [selectedType]);

  const typeOptions: Array<{ type: MediaType; label: string; icon: typeof Link2 }> = [
    { type: 'link', label: t.typeLink, icon: Link2 },
    { type: 'text', label: t.typeText, icon: FileText },
  ];

  const filteredThreads = useMemo(() => {
    const q = threadSearch.trim().toLowerCase();
    return threads.filter((item) => {
      if (selectedFolderId !== 'all' && item.folderId !== selectedFolderId) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.result.source.toLowerCase().includes(q)
      );
    });
  }, [threads, selectedFolderId, threadSearch]);

  const handlePasteClipboard = async () => {
    setLocalError(null);
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          onChangeContent(text);
          return;
        }
      }
      setLocalError(t.errClipboardEmpty);
    } catch {
      setLocalError(t.errClipboardDenied);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const trimmed = content.trim();
    if (!trimmed) {
      setLocalError(t.errEmptyInput);
      return;
    }

    onRunVerify({
      type: selectedType,
      content: trimmed,
      ragContext: ragContext.trim() || undefined,
      metadataFilters,
    });
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    onCreateFolder(trimmed);
    setNewFolderName('');
  };

  const stageLabel = (() => {
    switch (streamStage) {
      case 'checking_cache':
        return t.stageCache;
      case 'understanding_input':
        return t.stageUnderstanding;
      case 'extracting_claims':
        return t.stageClaimExtraction;
      case 'reading_document':
        return t.stageDocument;
      case 'retrieving_sources':
        return t.stageSources;
      case 'reranking_sources':
        return t.stageReranking;
      case 'analyzing_content':
        return t.stageAnalyzing;
      case 'validating_guardrails':
        return t.stageGuardrails;
      case 'streaming_response':
        return t.stageStreaming;
      default:
        return t.verifyingBtn;
    }
  })();

  const stageProgressPct = (() => {
    switch (streamStage) {
      case 'checking_cache':
        return 10;
      case 'understanding_input':
        return 22;
      case 'extracting_claims':
        return 34;
      case 'reading_document':
        return 44;
      case 'retrieving_sources':
        return 58;
      case 'reranking_sources':
        return 72;
      case 'analyzing_content':
        return 84;
      case 'validating_guardrails':
        return 92;
      case 'streaming_response':
        return 97;
      default:
        return 8;
    }
  })();

  const sidebarContent = (
    <aside className="rounded-lg border border-[#E5E7EB] bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
      <div className="flex items-center justify-between gap-2 border-b border-[#E5E7EB] pb-3 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-[#111827] dark:text-white">
          {t.sidebarTitle}
        </h3>
        <span className="text-xs text-[#6B7280] dark:text-slate-400 tabular-nums">
          {threads.length}
        </span>
      </div>

      {/* Search past checks */}
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6B7280]" />
        <input
          type="search"
          value={threadSearch}
          onChange={(e) => setThreadSearch(e.target.value)}
          placeholder={t.searchHistoryPlaceholder}
          className="min-h-[38px] w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] pl-8 pr-2.5 text-xs text-[#111827] placeholder:text-[#6B7280] focus:border-[#0F172A] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-white"
        />
      </div>

      {/* Folders list */}
      <div className="mt-3 space-y-1">
        <button
          type="button"
          onClick={() => setSelectedFolderId('all')}
          className={`flex min-h-[34px] w-full items-center justify-between rounded-md px-2.5 py-1 text-left text-xs transition-colors ${
            selectedFolderId === 'all'
              ? 'bg-[#F3F4F6] font-semibold text-[#111827] dark:bg-slate-800 dark:text-white'
              : 'font-medium text-[#4B5563] hover:bg-[#F9FAFB] dark:text-slate-300 dark:hover:bg-slate-800/50'
          }`}
        >
          <span className="flex items-center gap-1.5 truncate">
            <Folder className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t.allFolders}</span>
          </span>
          <span className="text-[11px] text-[#6B7280] tabular-nums">{threads.length}</span>
        </button>

        {folders.map((folder) => {
          const count = threads.filter((th) => th.folderId === folder.id).length;
          const active = selectedFolderId === folder.id;
          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => setSelectedFolderId(folder.id)}
              className={`flex min-h-[34px] w-full items-center justify-between rounded-md px-2.5 py-1 text-left text-xs transition-colors ${
                active
                  ? 'bg-[#F3F4F6] font-semibold text-[#111827] dark:bg-slate-800 dark:text-white'
                  : 'font-medium text-[#4B5563] hover:bg-[#F9FAFB] dark:text-slate-300 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <Folder className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{folder.name}</span>
              </span>
              <span className="text-[11px] text-[#6B7280] tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Create folder form */}
      <form onSubmit={handleCreateFolderSubmit} className="mt-3 flex gap-1.5">
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder={t.newFolderPlaceholder}
          className="min-h-[34px] min-w-0 flex-1 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 text-xs text-[#111827] placeholder:text-[#6B7280] focus:border-[#0F172A] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-white"
        />
        <button
          type="submit"
          aria-label={t.addFolder}
          className="inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-2.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB] dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
      </form>

      {/* Thread items */}
      <div className="mt-4 max-h-[340px] space-y-2 overflow-y-auto border-t border-[#E5E7EB] pt-3 dark:border-slate-800">
        {filteredThreads.length === 0 ? (
          <p className="py-3 text-center text-xs text-[#6B7280] dark:text-slate-400">
            {t.noThreads}
          </p>
        ) : (
          filteredThreads.map((th) => {
            const isSelected = activeThreadId === th.id;
            return (
              <div
                key={th.id}
                className={`rounded-md border p-2.5 transition-colors ${
                  isSelected
                    ? 'border-[#0F172A] bg-[#F9FAFB] dark:border-slate-400 dark:bg-slate-800/70'
                    : 'border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] dark:border-slate-800 dark:bg-[#111827] dark:hover:bg-slate-800/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectThread(th);
                    setMobileSidebarOpen(false);
                  }}
                  className="w-full text-left"
                >
                  <p className="line-clamp-2 text-xs font-semibold text-[#111827] dark:text-white">
                    {th.title}
                  </p>
                  <p className="mt-1 text-[11px] text-[#6B7280] dark:text-slate-400 tabular-nums">
                    {th.result.certaintyLabel} · {formatDateLocalized(th.createdAt, lang)}
                  </p>
                </button>

                <div className="mt-2 flex items-center justify-between gap-2 border-t border-[#E5E7EB] pt-1.5 dark:border-slate-800">
                  <select
                    aria-label={t.moveToFolder}
                    value={th.folderId}
                    onChange={(e) => onMoveThreadToFolder(th.id, e.target.value)}
                    className="min-w-0 flex-1 rounded border border-[#E5E7EB] bg-white px-1.5 py-0.5 text-[11px] text-[#374151] dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-300"
                  >
                    <option value="default">{t.allFolders}</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label={t.remove}
                    onClick={() => onDeleteThread(th.id)}
                    className="rounded p-1 text-[#6B7280] hover:bg-rose-50 hover:text-rose-700 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );

  return (
    <div className="space-y-4">
      {/* Mobile Sidebar Drawer Toggle */}
      <div className="flex items-center justify-between lg:hidden">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen((v) => !v)}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-xs font-medium text-[#111827] dark:border-slate-800 dark:bg-[#111827] dark:text-slate-100"
        >
          <PanelLeft className="h-4 w-4 text-[#4B5563]" />
          <span>
            {t.sidebarToggle} ({threads.length})
          </span>
        </button>

      </div>

      {mobileSidebarOpen && <div className="lg:hidden">{sidebarContent}</div>}

      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:items-start lg:gap-4">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">{sidebarContent}</div>

        {/* Main Verification Workspace */}
        <div className="min-w-0 space-y-4">
          <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[#111827] dark:text-white">
                  {t.title}
                </h2>
                <p className="mt-1 text-sm text-[#4B5563] dark:text-slate-400">{t.subtitle}</p>
              </div>
            </div>

            <div
              className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-[#F3F4F6] p-1 dark:bg-slate-800/80"
              role="tablist"
            >
              {typeOptions.map(({ type, label, icon: Icon }) => {
                const active = selectedType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onSelectType(type)}
                    className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs transition-colors whitespace-nowrap ${
                      active
                        ? 'border border-[#E5E7EB] bg-white font-semibold text-[#111827] dark:border-slate-700 dark:bg-[#111827] dark:text-white'
                        : 'border border-transparent font-medium text-[#4B5563] hover:text-[#111827] dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="verificar-textarea"
                    className="text-sm font-medium text-[#111827] dark:text-slate-200"
                  >
                    {selectedType === 'link' ? t.labelLink : t.labelText}
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827] dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    <ClipboardPaste className="h-4 w-4" />
                    <span>{t.paste}</span>
                  </button>
                </div>

                <textarea
                  id="verificar-textarea"
                  rows={selectedType === 'link' ? 2 : 4}
                  value={content}
                  onChange={(e) => onChangeContent(e.target.value)}
                  placeholder={selectedType === 'link' ? t.placeholderLink : t.placeholderText}
                  className="mt-1.5 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-2.5 text-sm text-[#111827] placeholder:text-[#6B7280] focus:border-[#0F172A] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-white dark:placeholder:text-slate-400 dark:focus:border-slate-400"
                />
              </div>

              {/* Metadata Filters Row (Timeframe & Source Scope) */}
              <div className="grid grid-cols-1 gap-3 border-t border-[#E5E7EB] pt-3 dark:border-slate-800 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="verificar-filter-date"
                    className="block text-xs font-medium text-[#4B5563] dark:text-slate-300"
                  >
                    {t.filterDateLabel}
                  </label>
                  <select
                    id="verificar-filter-date"
                    value={metadataFilters.dateWindow}
                    onChange={(e) =>
                      onChangeMetadataFilters({
                        ...metadataFilters,
                        dateWindow: e.target.value as DateFilterWindow,
                      })
                    }
                    className="mt-1 min-h-[38px] w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 text-xs font-medium text-[#111827] focus:border-[#0F172A] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-white"
                  >
                    <option value="any">{t.dateAny}</option>
                    <option value="7d">{t.date7d}</option>
                    <option value="30d">{t.date30d}</option>
                    <option value="1y">{t.date1y}</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="verificar-filter-category"
                    className="block text-xs font-medium text-[#4B5563] dark:text-slate-300"
                  >
                    {t.filterCategoryLabel}
                  </label>
                  <select
                    id="verificar-filter-category"
                    value={metadataFilters.category}
                    onChange={(e) =>
                      onChangeMetadataFilters({
                        ...metadataFilters,
                        category: e.target.value as SourceCategoryFilter,
                      })
                    }
                    className="mt-1 min-h-[38px] w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 text-xs font-medium text-[#111827] focus:border-[#0F172A] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-white"
                  >
                    <option value="all">{t.catAll}</option>
                    <option value="fact_check">{t.catFactCheck}</option>
                    <option value="official_science">{t.catOfficial}</option>
                    <option value="press">{t.catPress}</option>
                  </select>
                </div>
              </div>

              {/* Optional Context Engineering (RAG) drawer */}
              <div className="border-t border-[#E5E7EB] pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRag((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#4B5563] hover:text-[#111827] dark:text-slate-300 dark:hover:text-white"
                >
                  {showRag ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  <span>{t.ragToggle}</span>
                  {ragContext.trim().length > 0 && (
                    <span className="text-[11px] text-[#0F172A] dark:text-slate-200">· active</span>
                  )}
                </button>

                {showRag && (
                  <div className="mt-2.5">
                    <label
                      htmlFor="verificar-rag-textarea"
                      className="block text-xs font-medium text-[#4B5563] dark:text-slate-300"
                    >
                      {t.ragLabel}
                    </label>
                    <textarea
                      id="verificar-rag-textarea"
                      rows={3}
                      value={ragContext}
                      onChange={(e) => onChangeRagContext(e.target.value)}
                      placeholder={t.ragPlaceholder}
                      className="mt-1.5 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-xs text-[#111827] placeholder:text-[#6B7280] focus:border-[#0F172A] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-white dark:placeholder:text-slate-400"
                    />
                  </div>
                )}
              </div>

              {(localError || error) && (
                <div
                  role="alert"
                  className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                >
                  {localError || error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1E293B] disabled:opacity-60 dark:bg-slate-100 dark:text-[#0F172A] dark:hover:bg-white"
              >
                {loading ? (
                  <>
                    <Clock className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">{t.verifyingBtn}</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">{t.verifyBtn}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Subtle Phase Indicator + Live Word-by-Word Streaming Preview */}
          {loading && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-lg border border-[#E5E7EB] bg-white p-5 dark:border-slate-800 dark:bg-[#111827]"
            >
              <div className="flex items-center justify-between gap-2 text-xs font-medium text-[#374151] dark:text-slate-300">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-[#4B5563] dark:text-slate-400" />
                  <span>{stageLabel}</span>
                </span>
                <span className="tabular-nums text-[#6B7280] dark:text-slate-400">
                  {stageProgressPct}%
                </span>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-sm bg-[#E5E7EB] dark:bg-slate-800">
                <div
                  className="h-full bg-[#0F172A] transition-all duration-300 dark:bg-slate-200"
                  style={{ width: `${stageProgressPct}%` }}
                />
              </div>

              {streamingText && (
                <div className="mt-4 border-t border-[#E5E7EB] pt-3 dark:border-slate-800">
                  <RichContentRenderer
                    content={streamingText}
                    copyLabel={resultT.copyCode}
                    copiedLabel={resultT.copiedCode}
                  />
                </div>
              )}
            </div>
          )}

          {/* Quick prompts when workspace is empty */}
          {!loading && !result && (
            <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
              <p className="text-xs font-semibold text-[#6B7280] dark:text-slate-400">
                {bundle.inicio.quickPromptsTitle}
              </p>
              <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onSelectType(qp.type);
                      onChangeContent(qp.prompt);
                      onRunVerify({
                        type: qp.type,
                        content: qp.prompt,
                        ragContext: ragContext.trim() || undefined,
                        metadataFilters,
                      });
                    }}
                    className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-left text-xs font-medium text-[#111827] transition-colors hover:bg-[#F3F4F6] dark:border-slate-800 dark:bg-[#0B1120] dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && result && (
            <VerificationResultCard
              result={result}
              lang={lang}
              isSaved={isResultSaved}
              isReported={isResultReported}
              onSave={onSaveResult}
              onReport={onReportResult}
            />
          )}
        </div>
      </div>
    </div>
  );
}
