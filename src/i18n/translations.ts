import type { AppLanguage, PermissionKey } from '../types';

export interface LearnLesson {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  checks: string[];
}

export interface TranslationBundle {
  header: {
    subtitle: string;
  };
  nav: {
    inicio: string;
    verificar: string;
    noticias: string;
    historico: string;
    aprender: string;
    perfil: string;
  };
  inicio: {
    slogan: string;
    subcopy: string;
    inputLabel: string;
    placeholder: string;
    verifyNow: string;
    chooseTitle: string;
    quickText: string;
    quickLink: string;
    recentVerificationsTitle: string;
    recentVerificationsSubtitle: string;
    viewArchive: string;
    openReport: string;
    verifyHeadline: string;
    catFinance: string;
    catHealth: string;
    catMedia: string;
    catPolicy: string;
    quickPromptsTitle: string;
    quickPrompts: Array<{ label: string; type: 'link' | 'text'; prompt: string }>;
    howItWorks: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
  };
  verificar: {
    title: string;
    subtitle: string;
    typeLink: string;
    typeText: string;
    remove: string;
    labelLink: string;
    labelText: string;
    paste: string;
    placeholderLink: string;
    placeholderText: string;
    ragToggle: string;
    ragLabel: string;
    ragPlaceholder: string;
    verifyBtn: string;
    verifyingBtn: string;
    stageCache: string;
    stageUnderstanding: string;
    stageClaimExtraction: string;
    stageSources: string;
    stageReranking: string;
    stageDocument: string;
    stageAnalyzing: string;
    stageGuardrails: string;
    stageStreaming: string;
    filterDateLabel: string;
    dateAny: string;
    date7d: string;
    date30d: string;
    date1y: string;
    filterCategoryLabel: string;
    catAll: string;
    catFactCheck: string;
    catPress: string;
    catOfficial: string;
    sidebarTitle: string;
    sidebarToggle: string;
    searchHistoryPlaceholder: string;
    allFolders: string;
    newFolderPlaceholder: string;
    addFolder: string;
    noThreads: string;
    moveToFolder: string;
    dailyLimitReached: string;
    usageCounter: string;
    errClipboardEmpty: string;
    errClipboardDenied: string;
    errEmptyInput: string;
    errVerifyFailed: string;
    errConnection: string;
  };
  result: {
    sealHeading: string;
    certaintyHeading: string;
    verdictSummaryHeading: string;
    originalClaimLabel: string;
    conclusionLabel: string;
    evidenceTransparencyHeading: string;
    badgeTrue: string;
    badgeFalse: string;
    badgeMisleading: string;
    badgeUnverified: string;
    reliabilityHeading: string;
    scoreDisclaimer: string;
    sourceMatchDisclaimer: string;
    sourceCorroboratesClaim: string;
    sourceDirectSupport: string;
    sourceDirectRefutation: string;
    sourceRelatedOnly: string;
    sourceInsufficient: string;
    redFlagsHeading: string;
    noRedFlags: string;
    limitationsHeading: string;
    limitationsBody: string;
    unverified: string;
    verifiedPublic: string;
    outOfContext: string;
    exaggerated: string;
    falseClaim: string;
    certaintyConfirmed: string;
    certaintyNoEvidence: string;
    certaintyOutOfContext: string;
    certaintyExaggerated: string;
    certaintyFalse: string;
    analysisHeading: string;
    claimsBreakdownHeading: string;
    claimStatusSupported: string;
    claimStatusRefuted: string;
    claimStatusMisleading: string;
    claimStatusUnverified: string;
    auditHeading: string;
    auditNormalized: string;
    auditRewritten: string;
    auditIntent: string;
    auditHybridRerank: string;
    auditGuardrails: string;
    auditGuardrailPassed: string;
    auditGuardrailAdjusted: string;
    auditGuardrailInsufficient: string;
    dateWarningHeading: string;
    factChecksHeading: string;
    trustFactChecker: string;
    trustOfficialInstitutional: string;
    trustEstablishedPress: string;
    trustWebSource: string;
    source: string;
    date: string;
    originalLink: string;
    openOriginalLink: string;
    sourcesCountLabel: string;
    notAvailable: string;
    publicSourcesFound: string;
    copyCode: string;
    copiedCode: string;
    modelLabel: string;
    cachedLabel: string;
    ragUsedLabel: string;
    save: string;
    saved: string;
    report: string;
    reported: string;
  };
  noticias: {
    title: string;
    refresh: string;
    searchPlaceholder: string;
    clearSearch: string;
    countryLabel: string;
    autoLabel: string;
    otherCountryOption: string;
    otherCountryPlaceholder: string;
    apply: string;
    filterAll: string;
    filterSaved: string;
    filterReported: string;
    clearFilters: string;
    loadingTitle: string;
    loadingDesc: string;
    errorTitle: string;
    errorDesc: string;
    retry: string;
    emptyFiltered: string;
    readOriginal: string;
    verify: string;
    verifying: string;
    openSource: string;
    save: string;
    saved: string;
    report: string;
    reported: string;
    sourceField: string;
    dateField: string;
    sourcesCountField: string;
    originalLinkField: string;
    notAvailable: string;
    tapToLoadImage: string;
    liteModeBadge: string;
    wifiPausedBadge: string;
  };
  historico: {
    title: string;
    subtitle: string;
    all: string;
    saved: string;
    reported: string;
    emptyTitle: string;
    emptyDesc: string;
    savedBadge: string;
    reportedBadge: string;
    verify: string;
    openLink: string;
    remove: string;
  };
  aprender: {
    title: string;
    subtitle: string;
    ctaTitle: string;
    ctaDesc: string;
    ctaBtn: string;
    lessons: LearnLesson[];
  };
  perfil: {
    subtitle: string;
    freePlan: string;
    permissionsBtn: string;
    darkModeBtn: string;
    lightModeBtn: string;
    checkStorageBtn: string;
    checkingStorage: string;
    languageTitle: string;
    languageDesc: string;
    memoryTitle: string;
    memoryDesc: string;
    toneLabel: string;
    toneObjective: string;
    toneDetailed: string;
    toneSimple: string;
    focusAreaLabel: string;
    focusAreaPlaceholder: string;
    customInstructionsLabel: string;
    customInstructionsPlaceholder: string;
    saveMemoryBtn: string;
    planTitle: string;
    planDesc: string;
    usageTodayLabel: string;
    freePlanFeatures: string[];
    activePlanBadge: string;
    privacyTitle: string;
    privacyDesc: string;
    clearAllDataBtn: string;
    storageTitle: string;
    usedPercent: string;
    usedSpace: string;
    savedLabel: string;
    reportedLabel: string;
    browserEstimate: string;
    storageWarningInline: string;
    clearSavedReported: string;
    permissionsTitle: string;
    permissionsDesc: string;
    allowAllBtn: string;
    requestingAll: string;
    allowed: string;
    denied: string;
    toggleAria: string;
    permissionsMeta: Record<
      PermissionKey,
      { label: string; description: string; fallbackText: string }
    >;
    dataSaverTitle: string;
    dataSaverDesc: string;
    imageModeAlways: string;
    imageModeAlwaysDesc: string;
    imageModeWifi: string;
    imageModeWifiDesc: string;
    imageModeLite: string;
    imageModeLiteDesc: string;
    ramCacheLabel: string;
    clearRamCacheBtn: string;
    pwaInstallBtn: string;
    pwaInstallIosBtn: string;
    pwaIosTitle: string;
    pwaIosSteps: string;
    pwaCloseBtn: string;
    brandIdentityLabel: string;
    adaptiveIconNote: string;
  };
  toasts: {
    moreInfoUnavailable: string;
    verifyError: string;
    removedSaved: string;
    savedHistory: string;
    reportRegistered: string;
    removedReported: string;
    allPermissionsGranted: string;
    partialPermissionsGranted: string;
    permissionDeniedFallback: string;
    permissionGranted: string;
    permissionBlockedBrowser: string;
    historyCleared: string;
    memorySaved: string;
    allDataCleared: string;
    storageFullBanner: string;
    storageNearBanner: string;
    notificationDone: string;
    ramCacheCleared: string;
    imageModeUpdated: string;
    offlineNotice: string;
  };
  countries: Record<string, string>;
}

const TRANSLATIONS: Record<AppLanguage, TranslationBundle> = {
  en: {
    header: {
      subtitle: 'Authenticity Verification',
    },
    nav: {
      inicio: 'Home',
      verificar: 'Verify',
      noticias: 'News',
      historico: 'History',
      aprender: 'Learn',
      perfil: 'Profile',
    },
    inicio: {
      slogan: 'Truth has proof',
      subcopy: 'Paste a link or suspicious text to cross-check it against public sources.',
      inputLabel: 'Paste a link or text to verify',
      placeholder: 'Paste a link, suspicious claim, or headline to verify...',
      verifyNow: 'Verify now',
      chooseTitle: 'Choose content format',
      quickText: 'Text',
      quickLink: 'Link',
      recentVerificationsTitle: 'Recent Verifications & Public Feed',
      recentVerificationsSubtitle: 'Your verified checks alongside live headlines ready for one-tap verification.',
      viewArchive: 'Open archive',
      openReport: 'Read verdict',
      verifyHeadline: 'Verify claim',
      catFinance: 'Economy & Banking',
      catHealth: 'Public Health & Science',
      catMedia: 'Media & Technology',
      catPolicy: 'Society & Policy',
      quickPromptsTitle: 'Quick prompts',
      quickPrompts: [
        {
          label: 'Verify viral bank shutdown rumor',
          type: 'text',
          prompt: 'They say all banks will freeze customer accounts tomorrow morning',
        },
        {
          label: 'Check sensationalist emergency alert',
          type: 'text',
          prompt: 'URGENT!! Share before deleted: government ordered internet shutdown nationwide tonight!!',
        },
        {
          label: 'Cross-check public health claim',
          type: 'text',
          prompt: '5G mobile towers spread viral respiratory infections according to leaked memo',
        },
      ],
      howItWorks: 'How Ektheto works',
      step1Title: '1. Paste content',
      step1Desc: 'Paste a link or text, including a claim, rumor, or headline.',
      step2Title: '2. Read source, date, and link',
      step2Desc: 'Checks the original page, publication date, fact-checkers, and corroborating public sources.',
      step3Title: '3. Show Ektheto seal',
      step3Desc: 'If there is no real public proof, the seal always stays "Unverified".',
    },
    verificar: {
      title: 'Verify authenticity',
      subtitle: 'Choose a link or text and follow the verification as it runs.',
      typeLink: 'Link',
      typeText: 'Text',
      remove: 'Remove',
      labelLink: 'Paste the link here',
      labelText: 'Paste the text, news, or rumor',
      paste: 'Paste',
      placeholderLink: 'https://example.com/article...',
      placeholderText: 'Paste the message, rumor, or headline you want to check...',
      ragToggle: 'Reference context (RAG)',
      ragLabel: 'Reference notes or trusted excerpts to ground the check (optional)',
      ragPlaceholder: 'Paste official policy excerpts, verified numbers, or context notes to prevent fabricated claims...',
      verifyBtn: 'Verify content',
      verifyingBtn: 'Verifying...',
      stageCache: 'Checking response cache...',
      stageUnderstanding: 'Normalizing query, intent & conversational context...',
      stageClaimExtraction: 'Separating factual claims from opinion...',
      stageSources: 'Running hybrid search on fact-checkers & whitelist sources...',
      stageReranking: 'Reranking top 20 candidates & applying quality cutoff...',
      stageDocument: 'Processing reference context...',
      stageAnalyzing: 'Cross-checking facts, dates & contradictions...',
      stageGuardrails: 'Validating against source documents & safety guardrails...',
      stageStreaming: 'Streaming verified analysis...',
      filterDateLabel: 'Timeframe',
      dateAny: 'Any date',
      date7d: 'Last 7 days',
      date30d: 'Last 30 days',
      date1y: 'Last 12 months',
      filterCategoryLabel: 'Source scope',
      catAll: 'All high-credibility',
      catFactCheck: 'Fact-check agencies',
      catOfficial: 'Gov / Science / Academic',
      catPress: 'Established press',
      sidebarTitle: 'Checks & Folders',
      sidebarToggle: 'History & Folders',
      searchHistoryPlaceholder: 'Search checks...',
      allFolders: 'All checks',
      newFolderPlaceholder: 'New folder name...',
      addFolder: 'Add',
      noThreads: 'No saved checks yet.',
      moveToFolder: 'Folder',
      dailyLimitReached: 'Daily check limit reached (15 checks/day). Try again tomorrow.',
      usageCounter: 'checks today',
      errClipboardEmpty: 'Paste the text directly in the box below.',
      errClipboardDenied: 'Browser did not allow reading the clipboard. Please paste in the box below.',
      errEmptyInput: 'Please paste a link or write text to verify.',
      errVerifyFailed: 'Could not verify right now.',
      errConnection: 'Connection error while verifying. Please try again.',
    },
    result: {
      sealHeading: 'Verification verdict',
      certaintyHeading: 'Certainty level',
      verdictSummaryHeading: 'Verdict summary',
      originalClaimLabel: 'Original claim',
      conclusionLabel: 'Conclusion',
      evidenceTransparencyHeading: 'Evidence & source transparency',
      badgeTrue: 'Verified',
      badgeFalse: 'False',
      badgeMisleading: 'Misleading / Out of Context',
      badgeUnverified: 'Insufficient Evidence / Unverified',
      reliabilityHeading: 'Evidence strength (indicator)',
      scoreDisclaimer: 'Evidence-strength indicator, not the probability that the claim is true.',
      sourceMatchDisclaimer:
        'Search results may be related without proving the exact claim. Only sources marked as directly supporting or refuting it count as evidence.',
      sourceCorroboratesClaim: 'Meets independent evidence criteria',
      sourceDirectSupport: 'Directly supports this claim',
      sourceDirectRefutation: 'Directly contradicts this claim',
      sourceRelatedOnly: 'Related only — not counted as evidence',
      sourceInsufficient: 'This source does not establish the claim',
      redFlagsHeading: 'Detected signals',
      noRedFlags: 'No linguistic warning signs detected',
      limitationsHeading: 'Important limitations',
      limitationsBody:
        'No automated system offers 100% certainty. Automated analysis evaluates writing patterns and cross-checks public data, but may fail on satire, subjective opinions, or breaking events without official sources. Use this index as a supporting indicator, never as absolute truth.',
      unverified: 'Unverified',
      verifiedPublic: 'Confirmed by multiple sources',
      outOfContext: 'Out of context / Misleading',
      exaggerated: 'Exaggerated / Overstated',
      falseClaim: 'False',
      certaintyConfirmed: 'Confirmed by multiple sources',
      certaintyNoEvidence: 'Insufficient evidence',
      certaintyOutOfContext: 'Out of context',
      certaintyExaggerated: 'Exaggerated',
      certaintyFalse: 'False',
      analysisHeading: 'Source comparison & cited findings',
      claimsBreakdownHeading: 'Extracted factual claims',
      claimStatusSupported: 'Supported',
      claimStatusRefuted: 'Refuted',
      claimStatusMisleading: 'Misleading / Out of context',
      claimStatusUnverified: 'Unverified',
      auditHeading: 'Pipeline audit & grounding',
      auditNormalized: 'Normalized input',
      auditRewritten: 'Context-rewritten query',
      auditIntent: 'Detected intent',
      auditHybridRerank: 'Hybrid retrieval & rerank',
      auditGuardrails: 'Final guardrail check',
      auditGuardrailPassed: 'Analysis stayed within retrieved evidence',
      auditGuardrailAdjusted: 'Adjusted to stay strictly grounded in retrieved sources',
      auditGuardrailInsufficient: 'Quality cutoff triggered — insufficient corroborated evidence',
      dateWarningHeading: 'Publication date alert',
      factChecksHeading: 'Fact-checking agencies',
      trustFactChecker: 'Certified fact-checker',
      trustOfficialInstitutional: 'Official / Scientific / Academic',
      trustEstablishedPress: 'Established press',
      trustWebSource: 'Web source',
      source: 'Source',
      date: 'Source publication date',
      originalLink: 'Primary source link',
      openOriginalLink: 'Open source link',
      sourcesCountLabel: 'Independent credible sources with a strong match',
      notAvailable: 'not available',
      publicSourcesFound: 'Retrieved sources & citations',
      copyCode: 'Copy',
      copiedCode: 'Copied',
      modelLabel: 'Model',
      cachedLabel: 'Instant cache',
      ragUsedLabel: 'Context chunks',
      save: 'Save',
      saved: 'Saved',
      report: 'Report',
      reported: 'Reported',
    },
    noticias: {
      title: 'News',
      refresh: 'Refresh',
      searchPlaceholder: 'Search by title or source...',
      clearSearch: 'Clear search',
      countryLabel: 'News country',
      autoLabel: 'Automatic',
      otherCountryOption: 'Write another country',
      otherCountryPlaceholder: 'Type a country name...',
      apply: 'Apply',
      filterAll: 'All',
      filterSaved: 'Saved',
      filterReported: 'Reported',
      clearFilters: 'Clear filters',
      loadingTitle: 'Loading real news...',
      loadingDesc: 'Fetching live public RSS feeds for',
      errorTitle: 'Unable to load real news right now',
      errorDesc: 'Check your internet connection or try again in a moment.',
      retry: 'Try again',
      emptyFiltered: 'No news matched these filters',
      readOriginal: 'Read original',
      verify: 'Verify',
      verifying: 'Checking...',
      openSource: 'Open source',
      save: 'Save',
      saved: 'Saved',
      report: 'Report',
      reported: 'Reported',
      sourceField: 'Source:',
      dateField: 'Date:',
      sourcesCountField: 'Sources with same story:',
      originalLinkField: 'Original link:',
      notAvailable: 'not available',
      tapToLoadImage: 'Tap to load photo',
      liteModeBadge: 'Lite Mode active',
      wifiPausedBadge: 'Wi-Fi only mode',
    },
    historico: {
      title: 'History',
      subtitle: 'Everything you saved or reported stays here even after closing the app.',
      all: 'All',
      saved: 'Saved',
      reported: 'Reported',
      emptyTitle: 'Nothing here yet',
      emptyDesc: 'When you save or report a news story or verification, it appears here automatically.',
      savedBadge: 'Saved',
      reportedBadge: 'Reported',
      verify: 'Verify',
      openLink: 'Open link',
      remove: 'Remove',
    },
    aprender: {
      title: 'Learn to spot fake info',
      subtitle: 'Simple, practical tips to protect yourself and your family on mobile.',
      ctaTitle: 'Received something suspicious?',
      ctaDesc: 'Use the Verify tab to check the real source, date, and original link before sharing.',
      ctaBtn: 'Go to Verify',
      lessons: [
        {
          id: 'deepfake',
          title: 'Deepfake',
          subtitle: 'Fake videos and audio mimicking real people',
          description:
            'A deepfake uses software to put a real person’s face or voice saying things they never said.',
          checks: [
            'Watch the mouth and eyes: do lip movements look unnatural or out of sync with the voice?',
            'Does the voice sound robotic, flat, or have repeated background noise?',
            'Search for the same video on established news outlets before believing or sharing it.',
          ],
        },
        {
          id: 'ai-images',
          title: 'AI Images',
          subtitle: 'Computer-generated photos that look real',
          description:
            'Fake photos can now be generated in seconds. They may look convincing at first glance, but hide small flaws.',
          checks: [
            'Check hands, fingers, ears, and teeth: AI often distorts these small details.',
            'Look at background text (signs, posters, shirts): letters often look warped or meaningless.',
            'Be cautious of overly smooth skin, unnatural lighting, or dramatic viral scenes with no source.',
          ],
        },
        {
          id: 'misleading-titles',
          title: 'Misleading Headlines',
          subtitle: 'Exaggerated claims designed to cause panic or clicks',
          description:
            'Many viral posts use alarming words like "URGENT" or "SHARE BEFORE DELETED" to push people to share without reading.',
          checks: [
            'Read the full article — often the text contradicts the sensational headline.',
            'Check the date: old news is frequently reposted as if it happened today.',
            'Confirm whether multiple reliable outlets published the exact same story.',
          ],
        },
        {
          id: 'fake-links',
          title: 'Fake Links',
          subtitle: 'Web addresses mimicking trusted brands to deceive you',
          description:
            'Scam sites swap a letter or use strange endings (like ".xyz") to imitate banks, governments, or newspapers.',
            checks: [
              'Read the full web address carefully before tapping.',
              'Beware of shortened links in group chats promising free money, prizes, or urgent support.',
              'Paste the link into Ektheto’s Verify tab first to check its real source.',
            ],
        },
        {
          id: 'limitations',
          title: 'Automated Check Limitations',
          subtitle: 'Why automated reliability scores are supporting guides',
          description:
            'No automated system offers 100% certainty. Automated analysis evaluates writing patterns and cross-checks public data, but context still requires human judgment.',
          checks: [
            'Satire and irony can be misread by automated language models.',
            'Subjective opinions and commentary cannot be rated purely as true or false.',
            'Breaking events may lack official sources in the first minutes or hours.',
          ],
        },
      ],
    },
    perfil: {
      subtitle: 'Authenticity Verification',
      freePlan: 'Free Plan',
      permissionsBtn: 'Permissions',
      darkModeBtn: 'Dark mode',
      lightModeBtn: 'Light mode',
      checkStorageBtn: 'Check storage',
      checkingStorage: 'Checking...',
      languageTitle: 'App language',
      languageDesc: 'English is the default language. Portuguese and Spanish are optional.',
      memoryTitle: 'Memory & custom instructions',
      memoryDesc: 'Personalize response tone and focus area remembered across verifications.',
      toneLabel: 'Response tone',
      toneObjective: 'Objective & concise',
      toneDetailed: 'Detailed & technical',
      toneSimple: 'Simple everyday language',
      focusAreaLabel: 'Focus area / role',
      focusAreaPlaceholder: 'e.g. Journalism, Finance, Public Health, Legal...',
      customInstructionsLabel: 'Custom instructions',
      customInstructionsPlaceholder: 'e.g. Always highlight missing primary dates and summarize tables concisely...',
      saveMemoryBtn: 'Save preferences',
      planTitle: 'Plan & usage limit',
      planDesc: 'One plan with smart model routing: lightweight models for simple summaries and advanced grounding for complex claims.',
      usageTodayLabel: 'Daily usage',
      freePlanFeatures: [
        '15 verifications per day',
        'Lightweight + standard RSS & fact-check routing',
        'Local folders, history & response caching',
      ],
      activePlanBadge: 'Current plan',
      privacyTitle: 'Privacy & data transparency',
      privacyDesc: 'Your saved history, folders, and custom instructions stay locally in your browser. Submitted queries are checked strictly against public sources and are never sold.',
      clearAllDataBtn: 'Delete all history & memory',
      storageTitle: 'Local storage status',
      usedPercent: '% used',
      usedSpace: 'Space used',
      savedLabel: 'Saved',
      reportedLabel: 'Reported',
      browserEstimate: 'Estimated browser storage:',
      storageWarningInline:
        'Warning: local storage is near or at the ~5 MB limit. The app keeps working normally, but you can clear old items to save more.',
      clearSavedReported: 'Clear saved and reported',
      permissionsTitle: 'Device permissions',
      permissionsDesc: 'Notifications and location are optional. The app works if you deny either permission.',
      allowAllBtn: 'Allow notifications and location',
      requestingAll: 'Requesting permissions...',
      allowed: 'Allowed',
      denied: 'Denied',
      toggleAria: 'Toggle permission',
      permissionsMeta: {
        notifications: {
          label: 'Notifications',
          description: 'Receive alerts when verification finishes.',
          fallbackText: 'Alternative active: alerts appear directly inside the app.',
        },
        location: {
          label: 'Location',
          description: 'Detect your country automatically in News.',
          fallbackText: 'Alternative active: uses Angola by default or lets you choose manually.',
        },
      },
      dataSaverTitle: 'Data Saver & image streaming',
      dataSaverDesc:
        'News photos stream via URL as resized WebP/AVIF thumbnails with a temporary 2-hour RAM cache — never stored permanently on your device.',
      imageModeAlways: 'Standard (WebP/AVIF)',
      imageModeAlwaysDesc: 'Lazy-loads resized thumbnails as you scroll',
      imageModeWifi: 'Wi-Fi only',
      imageModeWifiDesc: 'Pauses image downloads on cellular or metered data',
      imageModeLite: 'Lite Mode',
      imageModeLiteDesc: 'Blurred micro-preview until you tap to load a photo',
      ramCacheLabel: 'Temporary RAM cache (auto-purges after 2h):',
      clearRamCacheBtn: 'Clear RAM image cache',
      pwaInstallBtn: 'Install App',
      pwaInstallIosBtn: 'Install on iOS',
      pwaIosTitle: 'Install Ektheto on iPhone / iPad',
      pwaIosSteps: 'Tap Share in Safari, scroll down, and choose Add to Home Screen.',
      pwaCloseBtn: 'Close',
      brandIdentityLabel: 'Official emblem & adaptive app icon',
      adaptiveIconNote: 'Padded safe-zone launcher icon avoids edge clipping on Android & iOS.',
    },
    toasts: {
      moreInfoUnavailable: 'Could not retrieve extra details for this article right now.',
      verifyError: 'Error while verifying. Please try again.',
      removedSaved: 'Removed from saved.',
      savedHistory: 'Saved to History.',
      reportRegistered: 'Report registered. Thank you.',
      removedReported: 'Report removed from history.',
      allPermissionsGranted: 'All permissions were granted.',
      partialPermissionsGranted: 'permissions granted. The rest use manual alternatives.',
      permissionDeniedFallback: 'Permission set to Denied. Manual alternative active.',
      permissionGranted: 'Permission granted.',
      permissionBlockedBrowser: 'Permission denied by browser. You can use the in-app alternatives.',
      historyCleared: 'History cleared.',
      memorySaved: 'Custom preferences saved.',
      allDataCleared: 'All conversation history, folders, and custom memory cleared.',
      storageFullBanner:
        'Local storage is full (~5 MB limit). The app keeps working, please clear old items in History or Profile.',
      storageNearBanner: 'Local storage is almost full',
      notificationDone: 'Verification complete:',
      ramCacheCleared: 'Temporary image RAM cache cleared.',
      imageModeUpdated: 'Data saver preference updated.',
      offlineNotice: 'Offline mode — showing cached verification data.',
    },
    countries: {
      Automático: 'Automatic',
      Angola: 'Angola',
      Brasil: 'Brazil',
      Portugal: 'Portugal',
      Moçambique: 'Mozambique',
      'Cabo Verde': 'Cape Verde',
      'Guiné-Bissau': 'Guinea-Bissau',
      'São Tomé e Príncipe': 'São Tomé and Príncipe',
      'Timor-Leste': 'Timor-Leste',
      'Escrever outro país': 'Write another country',
    },
  },
  pt: {
    header: {
      subtitle: 'Verificação de Autenticidade',
    },
    nav: {
      inicio: 'Início',
      verificar: 'Verificar',
      noticias: 'Notícias',
      historico: 'Histórico',
      aprender: 'Aprender',
      perfil: 'Perfil',
    },
    inicio: {
      slogan: 'A verdade tem uma prova',
      subcopy: 'Cole um link ou texto suspeito para cruzar com fontes públicas.',
      inputLabel: 'Cole um link ou texto para verificar',
      placeholder: 'Cole aqui um link, texto suspeito ou boato...',
      verifyNow: 'Verificar agora',
      chooseTitle: 'Escolher formato do conteúdo',
      quickText: 'Texto',
      quickLink: 'Link',
      recentVerificationsTitle: 'Verificações Recentes e Arquivo',
      recentVerificationsSubtitle: 'As suas checagens recentes e notícias reais prontas para verificação imediata.',
      viewArchive: 'Abrir arquivo',
      openReport: 'Ler relatório',
      verifyHeadline: 'Verificar notícia',
      catFinance: 'Economia e Bancos',
      catHealth: 'Saúde e Ciência',
      catMedia: 'Média e Tecnologia',
      catPolicy: 'Sociedade e Política',
      quickPromptsTitle: 'Ações rápidas',
      quickPrompts: [
        {
          label: 'Verificar boato sobre fecho de bancos',
          type: 'text',
          prompt: 'Dizem que todos os bancos vão bloquear as contas amanhã de manhã',
        },
        {
          label: 'Analisar mensagem alarmista viral',
          type: 'text',
          prompt: 'URGENTE!! Repassa antes que apaguem: corte total da internet decretado hoje à noite!!',
        },
        {
          label: 'Checar boato de saúde pública',
          type: 'text',
          prompt: 'Antenas 5G transmitem infeções respiratórias segundo documento secreto',
        },
      ],
      howItWorks: 'Como funciona o Ektheto',
      step1Title: '1. Colas conteúdo',
      step1Desc: 'Cola um link ou texto, incluindo uma alegação, fofoca ou título.',
      step2Title: '2. Lê fonte, data e link',
      step2Desc: 'Consulta a página original, a data real, agências de checagem e fontes públicas.',
      step3Title: '3. Mostra o selo Ektheto',
      step3Desc: 'Se não houver confirmação real em fontes públicas, mostra sempre "Não verificado".',
    },
    verificar: {
      title: 'Verificar autenticidade',
      subtitle: 'Escolha um link ou texto e acompanhe a verificação.',
      typeLink: 'Link',
      typeText: 'Texto',
      remove: 'Remover',
      labelLink: 'Cole o link aqui',
      labelText: 'Cole o texto, notícia ou fofoca',
      paste: 'Colar',
      placeholderLink: 'https://exemplo.com/noticia...',
      placeholderText: 'Cole aqui a mensagem, fofoca ou título que quer verificar...',
      ragToggle: 'Contexto de referência (RAG)',
      ragLabel: 'Notas ou excertos oficiais de referência para ancorar a resposta (opcional)',
      ragPlaceholder: 'Cole comunicados oficiais, dados verificados ou contexto para evitar respostas inventadas...',
      verifyBtn: 'Verificar conteúdo',
      verifyingBtn: 'A verificar...',
      stageCache: 'A consultar cache de respostas...',
      stageUnderstanding: 'A normalizar pesquisa, intenção e contexto...',
      stageClaimExtraction: 'A separar factos verificáveis de opiniões...',
      stageSources: 'A realizar busca híbrida em checadores e fontes credíveis...',
      stageReranking: 'A reclassificar os 20 principais resultados e aplicar corte de qualidade...',
      stageDocument: 'A processar o contexto de referência...',
      stageAnalyzing: 'A cruzar datas, contradições e sinais de sensacionalismo...',
      stageGuardrails: 'A validar alucinações, fontes originais e tom seguro...',
      stageStreaming: 'A transmitir análise em tempo real...',
      filterDateLabel: 'Período',
      dateAny: 'Qualquer data',
      date7d: 'Últimos 7 dias',
      date30d: 'Últimos 30 dias',
      date1y: 'Últimos 12 meses',
      filterCategoryLabel: 'Âmbito das fontes',
      catAll: 'Todas as credíveis',
      catFactCheck: 'Agências de checagem',
      catOfficial: 'Gov / Ciência / Academia',
      catPress: 'Imprensa estabelecida',
      sidebarTitle: 'Histórico e Pastas',
      sidebarToggle: 'Histórico e Pastas',
      searchHistoryPlaceholder: 'Pesquisar verificações...',
      allFolders: 'Todas as verificações',
      newFolderPlaceholder: 'Nova pasta...',
      addFolder: 'Criar',
      noThreads: 'Ainda sem verificações.',
      moveToFolder: 'Pasta',
      dailyLimitReached: 'O limite diário de 15 verificações foi atingido. Tente novamente amanhã.',
      usageCounter: 'verificações hoje',
      errClipboardEmpty: 'Cole o texto diretamente na caixa abaixo.',
      errClipboardDenied: 'O navegador não permitiu ler a área de transferência. Cole na caixa abaixo.',
      errEmptyInput: 'Cole um link ou escreva um texto para verificar.',
      errVerifyFailed: 'Não foi possível verificar agora.',
      errConnection: 'Erro de ligação ao verificar. Tente novamente.',
    },
    result: {
      sealHeading: 'Veredito Ektheto',
      certaintyHeading: 'Nível de certeza',
      verdictSummaryHeading: 'Resumo do veredito',
      originalClaimLabel: 'Alegação original',
      conclusionLabel: 'Conclusão',
      evidenceTransparencyHeading: 'Transparência de fontes e provas',
      badgeTrue: 'Verdadeiro',
      badgeFalse: 'Falso',
      badgeMisleading: 'Enganador / Fora de Contexto',
      badgeUnverified: 'Evidência insuficiente / Não verificado',
      reliabilityHeading: 'Força das evidências (indicador)',
      scoreDisclaimer: 'Indicador da força das evidências, não da probabilidade de a alegação ser verdadeira.',
      sourceMatchDisclaimer:
        'Os resultados podem ser relacionados sem provar a alegação exata. Só fontes marcadas como apoio ou refutação direta contam como prova.',
      sourceCorroboratesClaim: 'Cumpre os critérios de evidência independente',
      sourceDirectSupport: 'Apoia diretamente esta alegação',
      sourceDirectRefutation: 'Contradiz diretamente esta alegação',
      sourceRelatedOnly: 'Apenas relacionada — não conta como prova',
      sourceInsufficient: 'Esta fonte não comprova a alegação',
      redFlagsHeading: 'Sinais de alerta detetados',
      noRedFlags: 'Sem sinais de alerta linguísticos detetados',
      limitationsHeading: 'Limitações importantes',
      limitationsBody:
        'Nenhum sistema automático oferece 100% de certeza. Os algoritmos avaliam padrões de escrita e cruzam dados conhecidos, mas podem falhar perante sátiras, opiniões subjetivas ou acontecimentos muito recentes sem fontes oficiais. Este índice serve como indicador de apoio, nunca como verdade absoluta.',
      unverified: 'Não verificado',
      verifiedPublic: 'Confirmado por múltiplas fontes',
      outOfContext: 'Fora de contexto / Enganoso',
      exaggerated: 'Exagerado / Distorcido',
      falseClaim: 'Falso',
      certaintyConfirmed: 'Confirmado por múltiplas fontes',
      certaintyNoEvidence: 'Evidência insuficiente',
      certaintyOutOfContext: 'Fora de contexto',
      certaintyExaggerated: 'Exagerado',
      certaintyFalse: 'Falso',
      analysisHeading: 'Análise cruzada e citações',
      claimsBreakdownHeading: 'Alegações factuais extraídas',
      claimStatusSupported: 'Confirmada',
      claimStatusRefuted: 'Desmentida',
      claimStatusMisleading: 'Enganosa / Fora de contexto',
      claimStatusUnverified: 'Não verificada',
      auditHeading: 'Auditoria do fluxo e provas',
      auditNormalized: 'Pesquisa normalizada',
      auditRewritten: 'Pesquisa reescrita com contexto',
      auditIntent: 'Intenção detetada',
      auditHybridRerank: 'Busca híbrida e reclassificação',
      auditGuardrails: 'Validação final (Guardrails)',
      auditGuardrailPassed: 'A análise ficou limitada às evidências recuperadas',
      auditGuardrailAdjusted: 'Ajustado para se limitar estritamente às fontes recuperadas',
      auditGuardrailInsufficient: 'Corte de qualidade ativado — provas insuficientes',
      dateWarningHeading: 'Alerta de data da publicação',
      factChecksHeading: 'Agências de checagem',
      trustFactChecker: 'Agência de checagem',
      trustOfficialInstitutional: 'Oficial / Ciência / Academia',
      trustEstablishedPress: 'Imprensa conhecida',
      trustWebSource: 'Fonte web',
      source: 'Fonte',
      date: 'Data de publicação da fonte',
      originalLink: 'Link da fonte principal',
      openOriginalLink: 'Abrir link da fonte',
      sourcesCountLabel: 'Fontes credíveis e independentes com correspondência forte',
      notAvailable: 'não disponível',
      publicSourcesFound: 'Fontes encontradas e citações',
      copyCode: 'Copiar',
      copiedCode: 'Copiado',
      modelLabel: 'Modelo',
      cachedLabel: 'Cache instantânea',
      ragUsedLabel: 'Fragmentos RAG',
      save: 'Guardar',
      saved: 'Guardada',
      report: 'Denunciar',
      reported: 'Denunciada',
    },
    noticias: {
      title: 'Notícias',
      refresh: 'Atualizar',
      searchPlaceholder: 'Pesquisar por título ou fonte...',
      clearSearch: 'Limpar pesquisa',
      countryLabel: 'País das notícias',
      autoLabel: 'Automático',
      otherCountryOption: 'Escrever outro país',
      otherCountryPlaceholder: 'Escreva o nome do país...',
      apply: 'Aplicar',
      filterAll: 'Todas',
      filterSaved: 'Guardadas',
      filterReported: 'Denunciadas',
      clearFilters: 'Limpar filtros',
      loadingTitle: 'A carregar notícias reais...',
      loadingDesc: 'A consultar fontes públicas via RSS para',
      errorTitle: 'Não foi possível carregar notícias reais agora',
      errorDesc: 'Verifique a ligação à internet ou tente novamente em instantes.',
      retry: 'Tentar de novo',
      emptyFiltered: 'Nenhuma notícia encontrada com estes filtros',
      readOriginal: 'Ler original',
      verify: 'Verificar',
      verifying: 'A ler...',
      openSource: 'Abrir fonte',
      save: 'Guardar',
      saved: 'Guardada',
      report: 'Denunciar',
      reported: 'Denunciada',
      sourceField: 'Fonte:',
      dateField: 'Data:',
      sourcesCountField: 'Nº de fontes com a mesma história:',
      originalLinkField: 'Link original:',
      notAvailable: 'não disponível',
      tapToLoadImage: 'Tocar para carregar foto',
      liteModeBadge: 'Modo leve ativo',
      wifiPausedBadge: 'Apenas no Wi-Fi',
    },
    historico: {
      title: 'Histórico',
      subtitle: 'Tudo o que guardou ou denunciou fica guardado aqui mesmo depois de fechar a app.',
      all: 'Tudo',
      saved: 'Guardadas',
      reported: 'Denunciadas',
      emptyTitle: 'Ainda não tem itens aqui',
      emptyDesc: 'Quando guardar ou denunciar uma notícia ou verificação, ela aparece aqui automaticamente.',
      savedBadge: 'Guardada',
      reportedBadge: 'Denunciada',
      verify: 'Verificar',
      openLink: 'Abrir link',
      remove: 'Remover',
    },
    aprender: {
      title: 'Aprender a identificar mentiras',
      subtitle: 'Dicas simples e rápidas para proteger a si e à sua família no telemóvel.',
      ctaTitle: 'Recebeu algo suspeito agora?',
      ctaDesc: 'Use a aba Verificar para confirmar a fonte, a data e o link original antes de partilhar.',
      ctaBtn: 'Ir para Verificar',
      lessons: [
        {
          id: 'deepfake',
          title: 'Deepfake',
          subtitle: 'Vídeos e áudios falsos que imitam pessoas reais',
          description:
            'Um deepfake usa computador para colocar a cara ou a voz de uma pessoa conhecida a dizer coisas que ela nunca disse.',
          checks: [
            'Olhe para a boca e os olhos: o movimento dos lábios parece estranho ou fora do som?',
            'A voz parece robótica, sem pausas naturais ou com ruído repetido?',
            'Procure o mesmo vídeo em jornais oficiais antes de acreditar ou partilhar.',
          ],
        },
        {
          id: 'ai-images',
          title: 'Imagens de IA',
          subtitle: 'Fotos criadas por computador que parecem verdadeiras',
          description:
            'Hoje é possível criar fotos falsas em segundos. Muitas vezes parecem reais à primeira vista, mas têm pequenos defeitos.',
          checks: [
            'Conte os dedos das mãos, orelhas e dentes: a IA costuma errar nestes detalhes.',
            'Veja textos ao fundo (cartazes, placas, camisolas): costumam aparecer letras tortas ou sem sentido.',
            'Desconfie de imagens demasiado perfeitas, com pele muito lisa ou luz artificial.',
          ],
        },
        {
          id: 'misleading-titles',
          title: 'Títulos enganosos',
          subtitle: 'Frases exageradas para provocar medo ou cliques',
          description:
            'Muitas mensagens usam títulos alarmantes como "URGENTE" ou "PARTILHE ANTES QUE APAGUEM" para fazer clicar sem ler.',
          checks: [
            'Leia a notícia completa até ao fim — muitas vezes o texto diz algo diferente do título.',
            'Veja a data: às vezes usam uma notícia antiga como se fosse de hoje.',
            'Confirme se outros jornais confiáveis também publicaram a mesma informação.',
          ],
        },
        {
          id: 'fake-links',
          title: 'Links falsos',
          subtitle: 'Endereços que imitam sites conhecidos para enganar',
          description:
            'Sites falsos trocam uma letra no endereço (por exemplo, usar ".xyz") para parecer um banco, governo ou jornal.',
          checks: [
            'Leia com atenção o endereço do link antes de tocar nele.',
            'Desconfie de links curtos enviados em grupos a prometer prémios, dinheiro ou apoios urgentes.',
            'Cole o link primeiro na aba Verificar do Ektheto para ver a fonte real.',
          ],
        },
        {
          id: 'limitations',
          title: 'Limitações da verificação automática',
          subtitle: 'Porque o índice de confiabilidade é um indicador de apoio',
          description:
            'Nenhum sistema automático oferece 100% de certeza. Os algoritmos avaliam padrões de escrita e cruzam dados públicos, mas não substituem a leitura crítica.',
          checks: [
            'Textos de sátira ou ironia podem ser interpretados incorretamente por modelos automáticos.',
            'Opiniões subjetivas não podem ser classificadas simplesmente como verdadeiras ou falsas.',
            'Acontecimentos muito recentes podem ainda não ter confirmação em fontes oficiais.',
          ],
        },
      ],
    },
    perfil: {
      subtitle: 'Verificação de Autenticidade',
      freePlan: 'Plano Grátis',
      permissionsBtn: 'Permissões',
      darkModeBtn: 'Modo escuro',
      lightModeBtn: 'Modo claro',
      checkStorageBtn: 'Verificar armazenamento',
      checkingStorage: 'A verificar...',
      languageTitle: 'Idioma da aplicação',
      languageDesc: 'Inglês é o idioma principal. Português e Espanhol são opcionais.',
      memoryTitle: 'Memória e instruções personalizadas',
      memoryDesc: 'Defina o tom de voz e a área de atuação para a IA adaptar as respostas.',
      toneLabel: 'Tom da resposta',
      toneObjective: 'Objetivo e conciso',
      toneDetailed: 'Detalhado e técnico',
      toneSimple: 'Linguagem simples',
      focusAreaLabel: 'Área de atuação / contexto',
      focusAreaPlaceholder: 'Ex.: Jornalismo, Finanças, Saúde Pública, Direito...',
      customInstructionsLabel: 'Instruções personalizadas',
      customInstructionsPlaceholder: 'Ex.: Destaque datas ausentes e resuma tabelas numéricas...',
      saveMemoryBtn: 'Guardar preferências',
      planTitle: 'Plano e limite de uso',
      planDesc: 'Plano único com roteamento inteligente: modelos leves para resumos simples e pesquisa avançada para alegações complexas.',
      usageTodayLabel: 'Uso diário',
      freePlanFeatures: [
        '15 verificações por dia',
        'Roteamento leve + RSS e checagem de factos',
        'Pastas locais, histórico e sistema de cache',
      ],
      activePlanBadge: 'Plano atual',
      privacyTitle: 'Privacidade transparente',
      privacyDesc: 'O histórico, pastas e instruções ficam guardados localmente no navegador. Os pedidos são consultados apenas em fontes públicas e nunca são vendidos.',
      clearAllDataBtn: 'Apagar todo o histórico e memória',
      storageTitle: 'Estado do armazenamento local',
      usedPercent: '% usado',
      usedSpace: 'Espaço usado',
      savedLabel: 'Guardadas',
      reportedLabel: 'Denunciadas',
      browserEstimate: 'Capacidade total estimada do navegador:',
      storageWarningInline:
        'Aviso: o armazenamento local está perto ou no limite de ~5 MB. A app continua a funcionar, mas pode limpar itens antigos.',
      clearSavedReported: 'Limpar guardadas e denunciadas',
      permissionsTitle: 'Permissões do telemóvel',
      permissionsDesc: 'As notificações e a localização são opcionais. A app funciona se negar qualquer uma delas.',
      allowAllBtn: 'Permitir notificações e localização',
      requestingAll: 'A pedir permissões...',
      allowed: 'Permitida',
      denied: 'Negada',
      toggleAria: 'Alternar permissão',
      permissionsMeta: {
        notifications: {
          label: 'Notificações',
          description: 'Receber avisos quando uma verificação terminar.',
          fallbackText: 'Alternativa ativa: os avisos aparecem diretamente no ecrã da app.',
        },
        location: {
          label: 'Localização',
          description: 'Detetar o seu país automaticamente nas Notícias.',
          fallbackText: 'Alternativa ativa: usa Angola por defeito ou escolha o país à mão.',
        },
      },
      dataSaverTitle: 'Economia de dados e imagens',
      dataSaverDesc:
        'As fotos vêm por streaming via URL já convertidas para WebP/AVIF em miniaturas leves, com cache temporário de 2h apenas em memória RAM.',
      imageModeAlways: 'Padrão (WebP/AVIF)',
      imageModeAlwaysDesc: 'Carrega miniaturas redimensionadas ao rolar o ecrã',
      imageModeWifi: 'Apenas no Wi-Fi',
      imageModeWifiDesc: 'Pausa downloads de fotos em dados móveis',
      imageModeLite: 'Modo leve',
      imageModeLiteDesc: 'Prévia borrada mínima até tocar para ver a foto',
      ramCacheLabel: 'Cache temporário em RAM (expira após 2h):',
      clearRamCacheBtn: 'Limpar cache RAM de imagens',
      pwaInstallBtn: 'Instalar App',
      pwaInstallIosBtn: 'Instalar no iOS',
      pwaIosTitle: 'Instalar o Ektheto no iPhone / iPad',
      pwaIosSteps: 'Toque em Partilhar no Safari, deslize e escolha Adicionar ao Ecrã Principal.',
      pwaCloseBtn: 'Fechar',
      brandIdentityLabel: 'Emblema oficial e ícone adaptativo',
      adaptiveIconNote: 'Margem interna segura evita cortes em círculos no Android e iOS.',
    },
    toasts: {
      moreInfoUnavailable: 'Não foi possível obter mais dados desta notícia agora.',
      verifyError: 'Erro ao verificar. Tente novamente.',
      removedSaved: 'Notícia removida das guardadas.',
      savedHistory: 'Guardada no Histórico.',
      reportRegistered: 'Denúncia registada. Obrigado.',
      removedReported: 'Denúncia removida do histórico.',
      allPermissionsGranted: 'Todas as permissões foram permitidas.',
      partialPermissionsGranted: 'permissões permitidas. As restantes funcionam com alternativas.',
      permissionDeniedFallback: 'Permissão alterada para Negada. Alternativa manual ativa.',
      permissionGranted: 'Permissão concedida.',
      permissionBlockedBrowser: 'Permissão negada pelo navegador. Pode usar as alternativas da app.',
      historyCleared: 'Histórico limpo com sucesso.',
      memorySaved: 'Preferências personalizadas guardadas.',
      allDataCleared: 'Todo o histórico, pastas e memória foram apagados.',
      storageFullBanner:
        'Armazenamento local cheio (limite aproximado de 5 MB). A app continua a funcionar, mas limpe itens antigos no Histórico ou Perfil.',
      storageNearBanner: 'Armazenamento quase cheio',
      notificationDone: 'Verificação concluída:',
      ramCacheCleared: 'Cache temporário de imagens em RAM limpo.',
      imageModeUpdated: 'Preferência de economia de dados atualizada.',
      offlineNotice: 'Modo offline — a mostrar dados locais em cache.',
    },
    countries: {
      Automático: 'Automático',
      Angola: 'Angola',
      Brasil: 'Brasil',
      Portugal: 'Portugal',
      Moçambique: 'Moçambique',
      'Cabo Verde': 'Cabo Verde',
      'Guiné-Bissau': 'Guiné-Bissau',
      'São Tomé e Príncipe': 'São Tomé e Príncipe',
      'Timor-Leste': 'Timor-Leste',
      'Escrever outro país': 'Escrever outro país',
    },
  },
  es: {
    header: {
      subtitle: 'Verificación de Autenticidad',
    },
    nav: {
      inicio: 'Inicio',
      verificar: 'Verificar',
      noticias: 'Noticias',
      historico: 'Historial',
      aprender: 'Aprender',
      perfil: 'Perfil',
    },
    inicio: {
      slogan: 'La verdad tiene una prueba',
      subcopy: 'Pega un enlace o texto sospechoso para contrastarlo con fuentes públicas.',
      inputLabel: 'Pega un enlace o texto para verificar',
      placeholder: 'Pega aquí un enlace, texto sospechoso o titular...',
      verifyNow: 'Verificar ahora',
      chooseTitle: 'Elegir formato del contenido',
      quickText: 'Texto',
      quickLink: 'Enlace',
      recentVerificationsTitle: 'Verificaciones Recientes y Archivo',
      recentVerificationsSubtitle: 'Tus comprobaciones recientes y noticias reales listas para verificar al instante.',
      viewArchive: 'Ver archivo',
      openReport: 'Leer veredicto',
      verifyHeadline: 'Verificar noticia',
      catFinance: 'Economía y Banca',
      catHealth: 'Salud y Ciencia',
      catMedia: 'Medios y Tecnología',
      catPolicy: 'Sociedad y Política',
      quickPromptsTitle: 'Acciones rápidas',
      quickPrompts: [
        {
          label: 'Comprobar rumor sobre cierre de bancos',
          type: 'text',
          prompt: 'Dicen que mañana cerrarán todos los bancos y congelarán las cuentas',
        },
        {
          label: 'Revisar alerta alarmista viral',
          type: 'text',
          prompt: 'URGENTE!! Comparte antes de que lo borren: apagón total de internet ordenado esta noche!!',
        },
        {
          label: 'Verificar rumor de salud pública',
          type: 'text',
          prompt: 'Las antenas 5G propagan infecciones respiratorias según documento filtrado',
        },
      ],
      howItWorks: 'Cómo funciona Ektheto',
      step1Title: '1. Pegas contenido',
      step1Desc: 'Pega un enlace o texto, incluida una afirmación, un rumor o un titular.',
      step2Title: '2. Lee fuente, fecha y enlace',
      step2Desc: 'Consulta la página original, fecha real, verificadores y fuentes públicas.',
      step3Title: '3. Muestra el sello Ektheto',
      step3Desc: 'Si no hay confirmación real en fuentes públicas, siempre muestra "No verificado".',
    },
    verificar: {
      title: 'Verificar autenticidad',
      subtitle: 'Elige un enlace o texto y sigue la verificación.',
      typeLink: 'Enlace',
      typeText: 'Texto',
      remove: 'Quitar',
      labelLink: 'Pega el enlace aquí',
      labelText: 'Pega el texto, noticia o rumor',
      paste: 'Pegar',
      placeholderLink: 'https://ejemplo.com/noticia...',
      placeholderText: 'Pega aquí el mensaje, rumor o titular que quieres comprobar...',
      ragToggle: 'Contexto de referencia (RAG)',
      ragLabel: 'Notas o extractos oficiales para respaldar el análisis (opcional)',
      ragPlaceholder: 'Pega comunicados oficiales, cifras verificadas o contexto para evitar respuestas inventadas...',
      verifyBtn: 'Verificar contenido',
      verifyingBtn: 'Verificando...',
      stageCache: 'Consultando caché de respuestas...',
      stageUnderstanding: 'Normalizando búsqueda, intención y contexto...',
      stageClaimExtraction: 'Separando afirmaciones verificables de opiniones...',
      stageSources: 'Ejecutando búsqueda híbrida en verificadores y fuentes fiables...',
      stageReranking: 'Reclasificando los 20 mejores resultados y filtrando calidad...',
      stageDocument: 'Procesando el contexto de referencia...',
      stageAnalyzing: 'Contrastando fechas, contradicciones y sensacionalismo...',
      stageGuardrails: 'Validando hechos contra fuentes y filtros de seguridad...',
      stageStreaming: 'Transmitiendo análisis en tiempo real...',
      filterDateLabel: 'Período',
      dateAny: 'Cualquier fecha',
      date7d: 'Últimos 7 días',
      date30d: 'Últimos 30 días',
      date1y: 'Últimos 12 meses',
      filterCategoryLabel: 'Ámbito de fuentes',
      catAll: 'Todas las fiables',
      catFactCheck: 'Agencias de verificación',
      catOfficial: 'Gob / Ciencia / Academia',
      catPress: 'Prensa reconocida',
      sidebarTitle: 'Historial y Carpetas',
      sidebarToggle: 'Historial y Carpetas',
      searchHistoryPlaceholder: 'Buscar verificaciones...',
      allFolders: 'Todas',
      newFolderPlaceholder: 'Nueva carpeta...',
      addFolder: 'Crear',
      noThreads: 'Aún no hay verificaciones.',
      moveToFolder: 'Carpeta',
      dailyLimitReached: 'Se alcanzó el límite diario de 15 verificaciones. Inténtalo de nuevo mañana.',
      usageCounter: 'consultas hoy',
      errClipboardEmpty: 'Pega el texto directamente en el cuadro de abajo.',
      errClipboardDenied: 'El navegador no permitió leer el portapapeles. Pega en el cuadro de abajo.',
      errEmptyInput: 'Pega un enlace o escribe texto para verificar.',
      errVerifyFailed: 'No se pudo verificar en este momento.',
      errConnection: 'Error de conexión al verificar. Inténtalo de nuevo.',
    },
    result: {
      sealHeading: 'Veredicto Ektheto',
      certaintyHeading: 'Nivel de certeza',
      verdictSummaryHeading: 'Resumen del veredicto',
      originalClaimLabel: 'Afirmación original',
      conclusionLabel: 'Conclusión',
      evidenceTransparencyHeading: 'Transparencia de fuentes y pruebas',
      badgeTrue: 'Verdadero',
      badgeFalse: 'Falso',
      badgeMisleading: 'Engañoso / Fuera de Contexto',
      badgeUnverified: 'Evidencia insuficiente / No verificado',
      reliabilityHeading: 'Fuerza de la evidencia (indicador)',
      scoreDisclaimer: 'Indicador de la fuerza de la evidencia, no de la probabilidad de que la afirmación sea verdadera.',
      sourceMatchDisclaimer:
        'Los resultados pueden estar relacionados sin probar la afirmación exacta. Solo las fuentes marcadas como apoyo o refutación directa cuentan como prueba.',
      sourceCorroboratesClaim: 'Cumple los criterios de evidencia independiente',
      sourceDirectSupport: 'Apoya directamente esta afirmación',
      sourceDirectRefutation: 'Contradice directamente esta afirmación',
      sourceRelatedOnly: 'Solo relacionada — no cuenta como prueba',
      sourceInsufficient: 'Esta fuente no demuestra la afirmación',
      redFlagsHeading: 'Señales de alerta detectadas',
      noRedFlags: 'Sin señales de alerta lingüísticas detectadas',
      limitationsHeading: 'Limitaciones importantes',
      limitationsBody:
        'Ningún sistema automático ofrece 100% de certeza. Los algoritmos evalúan patrones de escritura y cruzan datos conocidos, pero pueden fallar ante sátiras, opiniones subjetivas o hechos muy recientes sin fuentes oficiales. Usa este índice como indicador de apoyo, nunca como verdad absoluta.',
      unverified: 'No verificado',
      verifiedPublic: 'Confirmado por múltiples fuentes',
      outOfContext: 'Fuera de contexto / Engañoso',
      exaggerated: 'Exagerado / Distorsionado',
      falseClaim: 'Falso',
      certaintyConfirmed: 'Confirmado por múltiples fuentes',
      certaintyNoEvidence: 'Evidencia insuficiente',
      certaintyOutOfContext: 'Fuera de contexto',
      certaintyExaggerated: 'Exagerado',
      certaintyFalse: 'Falso',
      analysisHeading: 'Análisis cruzado y citas',
      claimsBreakdownHeading: 'Afirmaciones factuales extraídas',
      claimStatusSupported: 'Respaldada',
      claimStatusRefuted: 'Desmentida',
      claimStatusMisleading: 'Engañosa / Fuera de contexto',
      claimStatusUnverified: 'No verificada',
      auditHeading: 'Auditoría del flujo y respaldo',
      auditNormalized: 'Consulta normalizada',
      auditRewritten: 'Consulta reescrita con contexto',
      auditIntent: 'Intención detectada',
      auditHybridRerank: 'Búsqueda híbrida y reclasificación',
      auditGuardrails: 'Validación final (Guardrails)',
      auditGuardrailPassed: 'El análisis se limitó a la evidencia recuperada',
      auditGuardrailAdjusted: 'Ajustado para ceñirse estrictamente a las fuentes recuperadas',
      auditGuardrailInsufficient: 'Corte de calidad activado — evidencia insuficiente',
      dateWarningHeading: 'Alerta de fecha de publicación',
      factChecksHeading: 'Agencias de verificación',
      trustFactChecker: 'Agencia de verificación',
      trustOfficialInstitutional: 'Oficial / Ciencia / Academia',
      trustEstablishedPress: 'Prensa reconocida',
      trustWebSource: 'Fuente web',
      source: 'Fuente',
      date: 'Fecha de publicación de la fuente',
      originalLink: 'Enlace de la fuente principal',
      openOriginalLink: 'Abrir enlace de la fuente',
      sourcesCountLabel: 'Fuentes creíbles e independientes con coincidencia alta',
      notAvailable: 'no disponible',
      publicSourcesFound: 'Fuentes encontradas y citas',
      copyCode: 'Copiar',
      copiedCode: 'Copiado',
      modelLabel: 'Modelo',
      cachedLabel: 'Caché instantánea',
      ragUsedLabel: 'Fragmentos RAG',
      save: 'Guardar',
      saved: 'Guardada',
      report: 'Denunciar',
      reported: 'Denunciada',
    },
    noticias: {
      title: 'Noticias',
      refresh: 'Actualizar',
      searchPlaceholder: 'Buscar por título o fuente...',
      clearSearch: 'Limpiar búsqueda',
      countryLabel: 'País de las noticias',
      autoLabel: 'Automático',
      otherCountryOption: 'Escribir otro país',
      otherCountryPlaceholder: 'Escribe el nombre del país...',
      apply: 'Aplicar',
      filterAll: 'Todas',
      filterSaved: 'Guardadas',
      filterReported: 'Denunciadas',
      clearFilters: 'Limpiar filtros',
      loadingTitle: 'Cargando noticias reales...',
      loadingDesc: 'Consultando fuentes públicas vía RSS para',
      errorTitle: 'No fue posible cargar noticias reales ahora',
      errorDesc: 'Comprueba tu conexión a internet o inténtalo de nuevo en unos momentos.',
      retry: 'Intentar de nuevo',
      emptyFiltered: 'No se encontraron noticias con estos filtros',
      readOriginal: 'Leer original',
      verify: 'Verificar',
      verifying: 'Leyendo...',
      openSource: 'Abrir fuente',
      save: 'Guardar',
      saved: 'Guardada',
      report: 'Denunciar',
      reported: 'Denunciada',
      sourceField: 'Fuente:',
      dateField: 'Fecha:',
      sourcesCountField: 'Nº de fuentes con la misma historia:',
      originalLinkField: 'Enlace original:',
      notAvailable: 'no disponible',
      tapToLoadImage: 'Tocar para cargar foto',
      liteModeBadge: 'Modo ligero activo',
      wifiPausedBadge: 'Solo por Wi-Fi',
    },
    historico: {
      title: 'Historial',
      subtitle: 'Todo lo que guardaste o denunciaste permanece aquí incluso al cerrar la app.',
      all: 'Todo',
      saved: 'Guardadas',
      reported: 'Denunciadas',
      emptyTitle: 'Aún no hay elementos aquí',
      emptyDesc: 'Cuando guardes o denuncies una noticia o verificación, aparecerá aquí automáticamente.',
      savedBadge: 'Guardada',
      reportedBadge: 'Denunciada',
      verify: 'Verificar',
      openLink: 'Abrir enlace',
      remove: 'Eliminar',
    },
    aprender: {
      title: 'Aprender a detectar engaños',
      subtitle: 'Consejos simples y claros para protegerte en el móvil.',
      ctaTitle: '¿Recibiste algo sospechoso ahora?',
      ctaDesc: 'Usa la pestaña Verificar para confirmar la fuente, fecha y enlace original antes de compartir.',
      ctaBtn: 'Ir a Verificar',
      lessons: [
        {
          id: 'deepfake',
          title: 'Deepfake',
          subtitle: 'Videos y audios falsos que imitan a personas reales',
          description:
            'Un deepfake usa computadora para poner la cara o la voz de una persona conocida diciendo algo que nunca dijo.',
          checks: [
            'Observa la boca y los ojos: ¿el movimiento de los labios parece extraño o desfasado del audio?',
            '¿La voz suena robótica, sin pausas naturales o con ruido repetido?',
            'Busca el mismo video en medios oficiales antes de creerlo o compartirlo.',
          ],
        },
        {
          id: 'ai-images',
          title: 'Imágenes de IA',
          subtitle: 'Fotos creadas por computadora que parecen reales',
          description:
            'Hoy se pueden crear fotos falsas en segundos. Parecen reales a simple vista, pero tienen pequeños errores.',
          checks: [
            'Cuenta los dedos, orejas y dientes: la IA suele equivocarse en estos detalles.',
            'Mira los textos del fondo (carteles, placas, camisetas): suelen tener letras deformadas.',
            'Desconfía de imágenes demasiado perfectas, con piel muy lisa o luz artificial.',
          ],
        },
        {
          id: 'misleading-titles',
          title: 'Titulares engañosos',
          subtitle: 'Frases exageradas para provocar miedo o clics',
          description:
            'Muchos mensajes usan frases alarmantes como "URGENTE" o "COMPARTE ANTES DE QUE LO BORREN" para difundir sin leer.',
          checks: [
            'Lee la noticia completa hasta el final — muchas veces el texto dice otra cosa.',
            'Mira la fecha: a veces usan una noticia vieja como si fuera de hoy.',
            'Confirma si otros medios confiables publicaron exactamente la misma historia.',
          ],
        },
        {
          id: 'fake-links',
          title: 'Enlaces falsos',
          subtitle: 'Direcciones que imitan sitios conocidos para engañar',
          description:
            'Los sitios falsos cambian una letra o usan terminaciones raras (como ".xyz") para imitar bancos o periódicos.',
          checks: [
            'Lee con atención la dirección web antes de tocarla.',
            'Desconfía de enlaces cortos en chats prometiendo premios, dinero o ayudas urgentes.',
            'Pega primero el enlace en la pestaña Verificar de Ektheto.',
          ],
        },
        {
          id: 'limitations',
          title: 'Limitaciones de la verificación automática',
          subtitle: 'Por qué el índice de confiabilidad es una guía de apoyo',
          description:
            'Ningún sistema automático ofrece 100% de certeza. Los algoritmos analizan patrones de texto y fuentes públicas, pero no sustituyen el criterio humano.',
          checks: [
            'La sátira y la ironía pueden confundir a los modelos automáticos.',
            'Las opiniones subjetivas no pueden calificarse simplemente como verdaderas o falsas.',
            'Los acontecimientos muy recientes pueden carecer aún de fuentes oficiales.',
          ],
        },
      ],
    },
    perfil: {
      subtitle: 'Verificación de Autenticidad',
      freePlan: 'Plan Gratis',
      permissionsBtn: 'Permisos',
      darkModeBtn: 'Modo oscuro',
      lightModeBtn: 'Modo claro',
      checkStorageBtn: 'Comprobar almacenamiento',
      checkingStorage: 'Comprobando...',
      languageTitle: 'Idioma de la aplicación',
      languageDesc: 'El inglés es el idioma predeterminado. Portugués y español son opcionales.',
      memoryTitle: 'Memoria e instrucciones personalizadas',
      memoryDesc: 'Define el tono de respuesta y el área de enfoque que la IA recordará en tus análisis.',
      toneLabel: 'Tono de respuesta',
      toneObjective: 'Objetivo y conciso',
      toneDetailed: 'Detallado y técnico',
      toneSimple: 'Lenguaje cotidiano simple',
      focusAreaLabel: 'Área de enfoque / rol',
      focusAreaPlaceholder: 'Ej.: Periodismo, Finanzas, Salud Pública, Derecho...',
      customInstructionsLabel: 'Instrucciones personalizadas',
      customInstructionsPlaceholder: 'Ej.: Destaca fechas faltantes y resume tablas numéricas...',
      saveMemoryBtn: 'Guardar preferencias',
      planTitle: 'Plan y límite de uso',
      planDesc: 'Un único plan con enrutamiento inteligente: modelos ligeros para resúmenes simples y búsqueda avanzada para afirmaciones complejas.',
      usageTodayLabel: 'Uso diario',
      freePlanFeatures: [
        '15 verificaciones al día',
        'Enrutamiento ligero + RSS y verificadores',
        'Carpetas locales, historial y caché de respuestas',
      ],
      activePlanBadge: 'Plan actual',
      privacyTitle: 'Privacidad transparente',
      privacyDesc: 'Tu historial, carpetas e instrucciones se guardan localmente en el navegador. Las consultas se contrastan únicamente con fuentes públicas y nunca se venden.',
      clearAllDataBtn: 'Borrar todo el historial y memoria',
      storageTitle: 'Estado del almacenamiento local',
      usedPercent: '% usado',
      usedSpace: 'Espacio usado',
      savedLabel: 'Guardadas',
      reportedLabel: 'Denunciadas',
      browserEstimate: 'Capacidad estimada del navegador:',
      storageWarningInline:
        'Aviso: el almacenamiento local está cerca o en el límite de ~5 MB. La app sigue funcionando, pero puedes limpiar elementos antiguos.',
      clearSavedReported: 'Limpiar guardadas y denunciadas',
      permissionsTitle: 'Permisos del teléfono',
      permissionsDesc: 'Las notificaciones y la ubicación son opcionales. La app funciona si deniegas cualquiera de ellas.',
      allowAllBtn: 'Permitir notificaciones y ubicación',
      requestingAll: 'Solicitando permisos...',
      allowed: 'Permitido',
      denied: 'Denegado',
      toggleAria: 'Cambiar permiso',
      permissionsMeta: {
        notifications: {
          label: 'Notificaciones',
          description: 'Recibir avisos cuando termine una verificación.',
          fallbackText: 'Alternativa activa: los avisos aparecen directamente en la pantalla.',
        },
        location: {
          label: 'Ubicación',
          description: 'Detectar tu país automáticamente en Noticias.',
          fallbackText: 'Alternativa activa: usa Angola por defecto o elige el país manualmente.',
        },
      },
      dataSaverTitle: 'Ahorro de datos y streaming de imágenes',
      dataSaverDesc:
        'Las fotos se transmiten vía URL convertidas a WebP/AVIF en miniaturas ligeras, con caché temporal de 2h en memoria RAM.',
      imageModeAlways: 'Estándar (WebP/AVIF)',
      imageModeAlwaysDesc: 'Carga miniaturas redimensionadas al desplazarte',
      imageModeWifi: 'Solo en Wi-Fi',
      imageModeWifiDesc: 'Pausa descargas de fotos con datos móviles',
      imageModeLite: 'Modo ligero',
      imageModeLiteDesc: 'Vista previa borrosa mínima hasta tocar la foto',
      ramCacheLabel: 'Caché temporal en RAM (expira en 2h):',
      clearRamCacheBtn: 'Limpiar caché RAM de imágenes',
      pwaInstallBtn: 'Instalar App',
      pwaInstallIosBtn: 'Instalar en iOS',
      pwaIosTitle: 'Instalar Ektheto en iPhone / iPad',
      pwaIosSteps: 'Toca Compartir en Safari, baja y selecciona Añadir a pantalla de inicio.',
      pwaCloseBtn: 'Cerrar',
      brandIdentityLabel: 'Emblema oficial e icono adaptativo',
      adaptiveIconNote: 'Margen seguro interno evita recortes circulares en Android e iOS.',
    },
    toasts: {
      moreInfoUnavailable: 'No se pudieron obtener más datos de esta noticia ahora.',
      verifyError: 'Error al verificar. Inténtalo de nuevo.',
      removedSaved: 'Noticia eliminada de guardadas.',
      savedHistory: 'Guardada en el Historial.',
      reportRegistered: 'Denuncia registrada. Gracias.',
      removedReported: 'Denuncia eliminada del historial.',
      allPermissionsGranted: 'Todos los permisos fueron concedidos.',
      partialPermissionsGranted: 'permisos concedidos. El resto funciona con alternativas.',
      permissionDeniedFallback: 'Permiso cambiado a Denegado. Alternativa manual activa.',
      permissionGranted: 'Permiso concedido.',
      permissionBlockedBrowser: 'Permiso denegado por el navegador. Usa las alternativas de la app.',
      historyCleared: 'Historial limpiado con éxito.',
      memorySaved: 'Preferencias personalizadas guardadas.',
      allDataCleared: 'Todo el historial, carpetas y memoria fueron borrados.',
      storageFullBanner:
        'Almacenamiento local lleno (límite ~5 MB). La app sigue funcionando, limpia elementos antiguos en Historial o Perfil.',
      storageNearBanner: 'Almacenamiento casi lleno',
      notificationDone: 'Verificación completada:',
      ramCacheCleared: 'Caché temporal de imágenes en RAM limpiado.',
      imageModeUpdated: 'Preferencia de ahorro de datos actualizada.',
      offlineNotice: 'Modo sin conexión — mostrando datos guardados en caché.',
    },
    countries: {
      Automático: 'Automático',
      Angola: 'Angola',
      Brasil: 'Brasil',
      Portugal: 'Portugal',
      Moçambique: 'Mozambique',
      'Cabo Verde': 'Cabo Verde',
      'Guiné-Bissau': 'Guinea-Bisáu',
      'São Tomé e Príncipe': 'Santo Tomé y Príncipe',
      'Timor-Leste': 'Timor Oriental',
      'Escrever outro país': 'Escribir otro país',
    },
  },
};

export function getTranslations(lang: AppLanguage): TranslationBundle {
  return TRANSLATIONS[lang] || TRANSLATIONS.en;
}
