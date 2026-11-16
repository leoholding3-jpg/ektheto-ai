export type AppLanguage = 'en' | 'pt' | 'es';

export type TabId = 'inicio' | 'verificar' | 'noticias' | 'historico' | 'aprender' | 'perfil';

export type MediaType = 'link' | 'text';

export type ImageLoadMode = 'always' | 'wifi_only' | 'lite';

export type SealStatus =
  | 'unverified'
  | 'verified_public_sources'
  | 'out_of_context'
  | 'exaggerated'
  | 'false_claim';

export type SourceTrustTier =
  | 'fact_checker'
  | 'official_institutional'
  | 'established_press'
  | 'web_source';

export type StreamStage =
  | 'idle'
  | 'checking_cache'
  | 'understanding_input'
  | 'extracting_claims'
  | 'reading_document'
  | 'retrieving_sources'
  | 'reranking_sources'
  | 'analyzing_content'
  | 'validating_guardrails'
  | 'streaming_response';

export type VerificationIntent =
  | 'factual_claim'
  | 'document_audit'
  | 'technical_question'
  | 'vague_followup';

export type DateFilterWindow = 'any' | '7d' | '30d' | '1y';
export type SourceCategoryFilter = 'all' | 'fact_check' | 'press' | 'official_science';

export interface MetadataSearchFilters {
  dateWindow: DateFilterWindow;
  category: SourceCategoryFilter;
}

export interface ExtractedClaimResult {
  claim: string;
  status: 'supported' | 'refuted' | 'misleading' | 'unverified';
  note?: string;
}

export interface PipelineAuditSummary {
  intent: VerificationIntent;
  normalizedQuery: string;
  rewrittenQuery?: string;
  claimsExtractedCount: number;
  retrievedCandidatesCount: number;
  keptAfterRerankCount: number;
  discardedLowRelevanceCount: number;
  hybridVectorUsed: boolean;
  guardrailStatus: 'passed' | 'adjusted_ungrounded' | 'insufficient_evidence';
  dateWarning?: string | null;
}

export interface MatchedSourceItem {
  title: string;
  source: string;
  publishedAt: string;
  link: string;
  snippet?: string;
  isFactCheck?: boolean;
  trustTier?: SourceTrustTier;
  relevanceScore?: number;
  claimOverlapScore?: number;
  corroboratesClaim?: boolean;
}

export interface FactCheckEntry {
  claimText: string;
  claimant?: string;
  publisher: string;
  rating: string;
  url: string;
  reviewDate?: string;
}

export interface VerificationResult {
  ok: boolean;
  type: MediaType;
  seal: SealStatus;
  sealLabel: string;
  certaintyLabel: string;
  reliabilityScore: number;
  redFlags: string[];
  source: string;
  publishedAt: string;
  originalLink: string | null;
  sourcesCount: number;
  matchedSources: MatchedSourceItem[];
  factChecks?: FactCheckEntry[];
  citedAnalysis?: string;
  extractedClaims?: ExtractedClaimResult[];
  dateWarning?: string | null;
  pipelineAudit?: PipelineAuditSummary;
  queryUsed: string;
  note: string;
  checkedAt: string;
  modelUsed?: string;
  cached?: boolean;
  ragChunksUsed?: number;
}

export interface VerificationFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface VerificationThread {
  id: string;
  folderId: string;
  title: string;
  type: MediaType;
  content: string;
  result: VerificationResult;
  createdAt: string;
}

export interface CustomMemorySettings {
  tone: 'objective' | 'detailed' | 'simple';
  focusArea: string;
  instructions: string;
}

export interface DailyUsage {
  date: string;
  count: number;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  sourceUrl?: string;
  publishedAt: string;
  link: string;
  imageUrl?: string;
  country?: string;
  verification?: VerificationResult;
}

export interface HistoryItem {
  id: string;
  kind: 'saved' | 'reported';
  folderId?: string;
  title: string;
  source: string;
  publishedAt: string;
  link: string | null;
  seal: SealStatus;
  sealLabel: string;
  sourcesCount?: number;
  createdAt: string;
}

export type PermissionKey = 'notifications' | 'location';

export type PermissionStatus = 'granted' | 'denied';

export type PermissionsState = Record<PermissionKey, PermissionStatus>;

export interface StorageInfo {
  usedBytes: number;
  limitBytes: number;
  percentUsed: number;
  isNearLimit: boolean;
  isFull: boolean;
  savedCount: number;
  reportedCount: number;
  threadsCount?: number;
  browserEstimateUsageMB?: string;
  browserEstimateQuotaMB?: string;
}
