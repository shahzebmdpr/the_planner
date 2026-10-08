/**
 * PeerTrack — Dual Study & Topic Gap Analyzer
 * Collaborative tracker for chapters & sub-topics between two learners.
 */

// ===================================================================
// Default Seed Datasets
// ===================================================================

const SEED_DATA_DSA = {
  profiles: {
    user: { id: 'user', name: 'Alex', initials: 'ME' },
    friend: { id: 'friend', name: 'Sam', initials: 'FR' }
  },
  activePersona: 'user',
  chapters: [
    {
      id: 'chap-dp',
      title: 'Dynamic Programming',
      category: 'Algorithms',
      description: 'Tabulation, memoization, state transition equations and grid paths.',
      color: 'indigo',
      topics: [
        {
          id: 'top-dp-1',
          title: '0/1 Knapsack Problem',
          notes: 'Standard 2D DP array: dp[i][w] = max(dp[i-1][w], val[i] + dp[i-1][w - wt[i]])',
          difficulty: 'Medium',
          estHours: 3,
          userLearned: true,
          friendLearned: false
        },
        {
          id: 'top-dp-2',
          title: 'Longest Common Subsequence (LCS)',
          notes: 'Diagonal transition when characters match: dp[i][j] = dp[i-1][j-1] + 1',
          difficulty: 'Medium',
          estHours: 2.5,
          userLearned: false,
          friendLearned: true
        },
        {
          id: 'top-dp-3',
          title: 'Coin Change (Unbounded Knapsack)',
          notes: 'Minimum coins to reach amount. Base case dp[0] = 0, others Infinity.',
          difficulty: 'Medium',
          estHours: 2,
          userLearned: true,
          friendLearned: true
        },
        {
          id: 'top-dp-4',
          title: 'Matrix Chain Multiplication (Interval DP)',
          notes: 'Cost of multiplying chain of matrices; try all possible partition points k.',
          difficulty: 'Hard',
          estHours: 4,
          userLearned: false,
          friendLearned: false
        }
      ]
    },
    {
      id: 'chap-graphs',
      title: 'Graph Theory & Networks',
      category: 'Algorithms',
      description: 'Breadth/depth searches, shortest paths, minimum spanning trees and flow.',
      color: 'cyan',
      topics: [
        {
          id: 'top-g-1',
          title: 'Breadth-First Search & 2D Grid Shortest Path',
          notes: 'Queue-based traversal; guarantees shortest unweighted paths.',
          difficulty: 'Easy',
          estHours: 1.5,
          userLearned: true,
          friendLearned: true
        },
        {
          id: 'top-g-2',
          title: "Dijkstra's Algorithm with Min-Heap",
          notes: 'Greedy non-negative edge relaxation with priority queue O((V + E) log V).',
          difficulty: 'Medium',
          estHours: 3,
          userLearned: true,
          friendLearned: false
        },
        {
          id: 'top-g-3',
          title: 'Topological Sort (Kahn’s Algorithm & DFS)',
          notes: 'Track in-degrees of DAG vertices; detect cycles when queue empties early.',
          difficulty: 'Medium',
          estHours: 2,
          userLearned: false,
          friendLearned: true
        },
        {
          id: 'top-g-4',
          title: 'Disjoint Set Union (DSU) with Path Compression',
          notes: 'Find and Union with rank heuristic; virtually O(1) amortized alpha(n).',
          difficulty: 'Hard',
          estHours: 2.5,
          userLearned: false,
          friendLearned: false
        }
      ]
    },
    {
      id: 'chap-trees',
      title: 'Binary Trees & BST',
      category: 'Data Structures',
      description: 'Recursive divide-and-conquer, traversals, and self-balancing concepts.',
      color: 'emerald',
      topics: [
        {
          id: 'top-t-1',
          title: 'Inorder, Preorder, Postorder Traversals',
          notes: 'Both recursive and iterative using call-stack emulation.',
          difficulty: 'Easy',
          estHours: 1,
          userLearned: true,
          friendLearned: true
        },
        {
          id: 'top-t-2',
          title: 'Lowest Common Ancestor (LCA)',
          notes: 'In BST use values (left/right split); in generic Binary Tree check both subtrees.',
          difficulty: 'Medium',
          estHours: 2,
          userLearned: false,
          friendLearned: true
        },
        {
          id: 'top-t-3',
          title: 'Binary Search Tree Validation & Balancing',
          notes: 'Must ensure each node is within range (minVal, maxVal).',
          difficulty: 'Medium',
          estHours: 2,
          userLearned: true,
          friendLearned: false
        }
      ]
    }
  ]
};

const SEED_DATA_WEBDEV = {
  profiles: {
    user: { id: 'user', name: 'Alex', initials: 'ME' },
    friend: { id: 'friend', name: 'Sam', initials: 'FR' }
  },
  activePersona: 'user',
  chapters: [
    {
      id: 'chap-web-front',
      title: 'Modern Frontend Architecture',
      category: 'Frontend',
      description: 'Component lifecycles, state stores, hydration and CSS performance.',
      color: 'indigo',
      topics: [
        {
          id: 'top-wf-1',
          title: 'DOM Event Delegation & Event Bubbling',
          notes: 'Capturing vs target vs bubbling phases. Synthetic events under the hood.',
          difficulty: 'Easy',
          estHours: 2,
          userLearned: true,
          friendLearned: true
        },
        {
          id: 'top-wf-2',
          title: 'React Concurrent Mode & Server Components (RSC)',
          notes: 'Streaming HTML, React Suspense boundary, and zero-bundle server logic.',
          difficulty: 'Hard',
          estHours: 4,
          userLearned: false,
          friendLearned: true
        },
        {
          id: 'top-wf-3',
          title: 'Web Core Vitals (LCP, FID/INP, CLS)',
          notes: 'Optimizing font rendering, image sizes, and main-thread blocking tasks.',
          difficulty: 'Medium',
          estHours: 2,
          userLearned: true,
          friendLearned: false
        }
      ]
    },
    {
      id: 'chap-web-back',
      title: 'Backend Systems & API Design',
      category: 'Backend',
      description: 'REST, GraphQL, authentication protocols, and caching layers.',
      color: 'rose',
      topics: [
        {
          id: 'top-wb-1',
          title: 'OAuth2 & JWT Token Rotation',
          notes: 'Short-lived access token + HttpOnly secure cookie refresh tokens.',
          difficulty: 'Medium',
          estHours: 3,
          userLearned: true,
          friendLearned: false
        },
        {
          id: 'top-wb-2',
          title: 'Redis Caching & Cache Invalidation Strategies',
          notes: 'Cache-aside, write-through, TTL and cache stampede protection.',
          difficulty: 'Medium',
          estHours: 3,
          userLearned: false,
          friendLearned: true
        },
        {
          id: 'top-wb-3',
          title: 'PostgreSQL Indexing (B-Tree, GIN) & Query Tuning',
          notes: 'EXPLAIN ANALYZE, composite indexes, and index selectivity.',
          difficulty: 'Hard',
          estHours: 4,
          userLearned: false,
          friendLearned: false
        }
      ]
    }
  ]
};

const SEED_DATA_ML = {
  profiles: {
    user: { id: 'user', name: 'Alex', initials: 'ME' },
    friend: { id: 'friend', name: 'Sam', initials: 'FR' }
  },
  activePersona: 'user',
  chapters: [
    {
      id: 'chap-ml-math',
      title: 'Mathematics for Machine Learning',
      category: 'Foundations',
      description: 'Linear algebra, matrix decomposition, gradients, and probability.',
      color: 'purple',
      topics: [
        {
          id: 'top-mlm-1',
          title: 'Eigenvalues & Singular Value Decomposition (SVD)',
          notes: 'Dimension reduction, PCA projections, and matrix rank estimation.',
          difficulty: 'Hard',
          estHours: 4,
          userLearned: false,
          friendLearned: true
        },
        {
          id: 'top-mlm-2',
          title: 'Multivariate Calculus & Chain Rule',
          notes: 'Jacobians and Hessians for deep neural network gradient backpropagation.',
          difficulty: 'Medium',
          estHours: 3,
          userLearned: true,
          friendLearned: true
        }
      ]
    },
    {
      id: 'chap-ml-deep',
      title: 'Transformers & Large Language Models',
      category: 'Deep Learning',
      description: 'Self-attention, positional embeddings, decoding strategies and RAG.',
      color: 'cyan',
      topics: [
        {
          id: 'top-mld-1',
          title: 'Multi-Head Scaled Dot-Product Attention',
          notes: 'Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) * V.',
          difficulty: 'Hard',
          estHours: 4,
          userLearned: true,
          friendLearned: false
        },
        {
          id: 'top-mld-2',
          title: 'Retrieval Augmented Generation (RAG)',
          notes: 'Vector embeddings, chunking strategies, hybrid search, and reranking.',
          difficulty: 'Medium',
          estHours: 3,
          userLearned: false,
          friendLearned: true
        }
      ]
    }
  ]
};

// ===================================================================
// App State Management
// ===================================================================

const STORAGE_KEY = 'peertrack_study_planner_state_v1';
const UPSTASH_CONFIG_KEY = 'peertrack_upstash_config_v1';

class StudyTrackerApp {
  constructor() {
    this.state = this.loadState();
    this.activeFilter = 'all';
    this.searchQuery = '';
    this.collapsedChapters = new Set();
    this.upstash = this.loadUpstashConfig();
    this.syncPollTimer = null;
    this.autoPushTimer = null;
    this.lastLocalUpdatedAt = Date.now();
    this.lastRemoteUpdatedAt = 0;
    this.isSyncing = false;
    this.initElements();
    this.attachEvents();
    this.initUpstash();
    this.checkUrlForSharePayload();
    this.checkUrlForCloudPayload();
    this.render();
  }

  // Load state from localStorage or use default seed
  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.chapters && parsed.profiles) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved state:', e);
    }
    return JSON.parse(JSON.stringify(SEED_DATA_DSA));
  }

  // Save current state to localStorage and broadcast
  saveState() {
    this.lastLocalUpdatedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
    this.render();
    if (this.upstash && this.upstash.isConnected && this.upstash.autoSync) {
      this.triggerAutoPush();
    }
  }

  // Save state from cloud pull without echoing back push
  saveStateLocallyWithoutPush() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
    this.render();
  }

  // DOM Elements initialization
  initElements() {
    // Header & Persona
    this.btnPersonaUser = document.getElementById('btnPersonaUser');
    this.btnPersonaFriend = document.getElementById('btnPersonaFriend');
    this.avatarUser = document.getElementById('avatarUser');
    this.avatarFriend = document.getElementById('avatarFriend');
    this.labelUserName = document.getElementById('labelUserName');
    this.labelFriendName = document.getElementById('labelFriendName');

    // Dashboard Cards
    this.dashAvatarUser = document.getElementById('dashAvatarUser');
    this.dashNameUser = document.getElementById('dashNameUser');
    this.dashPercentUserBadge = document.getElementById('dashPercentUserBadge');
    this.dashProgressBarUser = document.getElementById('dashProgressBarUser');
    this.dashCountUser = document.getElementById('dashCountUser');
    this.dashUserLead = document.getElementById('dashUserLead');

    this.dashAvatarFriend = document.getElementById('dashAvatarFriend');
    this.dashNameFriend = document.getElementById('dashNameFriend');
    this.dashPercentFriendBadge = document.getElementById('dashPercentFriendBadge');
    this.dashProgressBarFriend = document.getElementById('dashProgressBarFriend');
    this.dashCountFriend = document.getElementById('dashCountFriend');
    this.dashFriendLead = document.getElementById('dashFriendLead');

    this.dashFriendShortName = document.getElementById('dashFriendShortName');
    this.dashFriendShortName2 = document.getElementById('dashFriendShortName2');

    // Gap Analyzer Counts
    this.countFriendOnly = document.getElementById('countFriendOnly');
    this.countUserOnly = document.getElementById('countUserOnly');
    this.countBoth = document.getElementById('countBoth');
    this.cardFilterFriendAhead = document.getElementById('cardFilterFriendAhead');
    this.cardFilterUserAhead = document.getElementById('cardFilterUserAhead');
    this.cardFilterBothMastered = document.getElementById('cardFilterBothMastered');

    // Toolbar & Filters
    this.topicSearchInput = document.getElementById('topicSearchInput');
    this.btnClearSearch = document.getElementById('btnClearSearch');
    this.filterPillsContainer = document.getElementById('filterPillsContainer');
    this.pillCountAll = document.getElementById('pillCountAll');
    this.pillCountFriendOnly = document.getElementById('pillCountFriendOnly');
    this.pillCountUserOnly = document.getElementById('pillCountUserOnly');
    this.pillCountBoth = document.getElementById('pillCountBoth');
    this.pillCountNeither = document.getElementById('pillCountNeither');

    this.btnToggleAllChapters = document.getElementById('btnToggleAllChapters');
    this.btnToggleAllText = document.getElementById('btnToggleAllText');
    this.btnQuickOptions = document.getElementById('btnQuickOptions');
    this.quickOptionsMenu = document.getElementById('quickOptionsMenu');
    this.btnLoadDSA = document.getElementById('btnLoadDSA');
    this.btnLoadWebDev = document.getElementById('btnLoadWebDev');
    this.btnLoadML = document.getElementById('btnLoadML');
    this.btnClearAllData = document.getElementById('btnClearAllData');

    // Active filter banner
    this.filterNoticeBanner = document.getElementById('filterNoticeBanner');
    this.filterNoticeText = document.getElementById('filterNoticeText');
    this.btnResetFilter = document.getElementById('btnResetFilter');

    // Main content
    this.chaptersContainer = document.getElementById('chaptersContainer');
    this.emptyStateContainer = document.getElementById('emptyStateContainer');
    this.btnEmptyAddChapter = document.getElementById('btnEmptyAddChapter');
    this.btnEmptyLoadSample = document.getElementById('btnEmptyLoadSample');

    // Modals
    this.modalChapter = document.getElementById('modalChapter');
    this.formChapter = document.getElementById('formChapter');
    this.btnOpenAddChapter = document.getElementById('btnOpenAddChapter');
    this.btnCloseModalChapter = document.getElementById('btnCloseModalChapter');
    this.btnCancelChapter = document.getElementById('btnCancelChapter');
    this.inputChapterId = document.getElementById('inputChapterId');
    this.inputChapterTitle = document.getElementById('inputChapterTitle');
    this.inputChapterDescription = document.getElementById('inputChapterDescription');
    this.inputChapterCategory = document.getElementById('inputChapterCategory');
    this.modalChapterTitle = document.getElementById('modalChapterTitle');

    this.modalTopic = document.getElementById('modalTopic');
    this.formTopic = document.getElementById('formTopic');
    this.btnCloseModalTopic = document.getElementById('btnCloseModalTopic');
    this.btnCancelTopic = document.getElementById('btnCancelTopic');
    this.inputTopicId = document.getElementById('inputTopicId');
    this.inputTopicChapterId = document.getElementById('inputTopicChapterId');
    this.modalTopicChapterName = document.getElementById('modalTopicChapterName');
    this.inputTopicTitle = document.getElementById('inputTopicTitle');
    this.inputTopicNotes = document.getElementById('inputTopicNotes');
    this.selectTopicDifficulty = document.getElementById('selectTopicDifficulty');
    this.inputTopicEstTime = document.getElementById('inputTopicEstTime');
    this.checkInitialUserLearned = document.getElementById('checkInitialUserLearned');
    this.checkInitialFriendLearned = document.getElementById('checkInitialFriendLearned');
    this.labelInitialUser = document.getElementById('labelInitialUser');
    this.labelInitialFriend = document.getElementById('labelInitialFriend');
    this.modalTopicTitle = document.getElementById('modalTopicTitle');

    // Settings Modal
    this.modalSettings = document.getElementById('modalSettings');
    this.btnSettingsModal = document.getElementById('btnSettingsModal');
    this.btnCloseModalSettings = document.getElementById('btnCloseModalSettings');
    this.btnCancelSettings = document.getElementById('btnCancelSettings');
    this.formSettings = document.getElementById('formSettings');
    this.inputUserName = document.getElementById('inputUserName');
    this.inputUserInitials = document.getElementById('inputUserInitials');
    this.inputFriendName = document.getElementById('inputFriendName');
    this.inputFriendInitials = document.getElementById('inputFriendInitials');
    this.settingsPreviewAvatarUser = document.getElementById('settingsPreviewAvatarUser');
    this.settingsPreviewAvatarFriend = document.getElementById('settingsPreviewAvatarFriend');

    // Share & Sync Modal
    this.modalShare = document.getElementById('modalShare');
    this.btnShareModal = document.getElementById('btnShareModal');
    this.btnCloseModalShare = document.getElementById('btnCloseModalShare');
    this.btnCloseShare = document.getElementById('btnCloseShare');
    this.shareUrlInput = document.getElementById('shareUrlInput');
    this.btnCopyShareUrl = document.getElementById('btnCopyShareUrl');
    this.btnCopyText = document.getElementById('btnCopyText');
    this.btnExportJSON = document.getElementById('btnExportJSON');
    this.fileImportJSON = document.getElementById('fileImportJSON');

    // Comparison Matrix Modal
    this.modalMatrix = document.getElementById('modalMatrix');
    this.btnComparisonMatrix = document.getElementById('btnComparisonMatrix');
    this.btnCloseModalMatrix = document.getElementById('btnCloseModalMatrix');
    this.btnCloseMatrix = document.getElementById('btnCloseMatrix');
    this.matrixTableBody = document.getElementById('matrixTableBody');
    this.thMatrixUser = document.getElementById('thMatrixUser');
    this.thMatrixFriend = document.getElementById('thMatrixFriend');

    // Upstash Cloud Sync Elements
    this.btnOpenUpstashModal = document.getElementById('btnOpenUpstashModal');
    this.cloudStatusDot = document.getElementById('cloudStatusDot');
    this.cloudStatusLabel = document.getElementById('cloudStatusLabel');
    this.modalUpstash = document.getElementById('modalUpstash');
    this.btnCloseModalUpstash = document.getElementById('btnCloseModalUpstash');
    this.btnCloseUpstash = document.getElementById('btnCloseUpstash');
    this.upstashStatusBanner = document.getElementById('upstashStatusBanner');
    this.bannerStatusDot = document.getElementById('bannerStatusDot');
    this.bannerStatusTitle = document.getElementById('bannerStatusTitle');
    this.bannerStatusSub = document.getElementById('bannerStatusSub');
    this.bannerLastSyncText = document.getElementById('bannerLastSyncText');
    this.formUpstash = document.getElementById('formUpstash');
    this.inputUpstashUrl = document.getElementById('inputUpstashUrl');
    this.inputUpstashToken = document.getElementById('inputUpstashToken');
    this.btnToggleTokenVisibility = document.getElementById('btnToggleTokenVisibility');
    this.inputUpstashRoom = document.getElementById('inputUpstashRoom');
    this.selectSyncInterval = document.getElementById('selectSyncInterval');
    this.checkUpstashAutoSync = document.getElementById('checkUpstashAutoSync');
    this.btnConnectUpstash = document.getElementById('btnConnectUpstash');
    this.btnPushToUpstash = document.getElementById('btnPushToUpstash');
    this.btnPullFromUpstash = document.getElementById('btnPullFromUpstash');
    this.btnCopyFriendCloudInvite = document.getElementById('btnCopyFriendCloudInvite');
    this.btnDisconnectUpstash = document.getElementById('btnDisconnectUpstash');

    // Toast Container & Canvas
    this.toastContainer = document.getElementById('toastContainer');
    this.confettiCanvas = document.getElementById('confettiCanvas');
  }

  // ===================================================================
  // Event Listeners
  // ===================================================================
  attachEvents() {
    // Tab Sync: Keep changes in sync across open tabs in real-time
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          this.state = JSON.parse(event.newValue);
          this.render();
          this.showToast('Synced updates from your study buddy!', 'info');
        } catch (e) {
          console.error(e);
        }
      }
    });

    // Persona switcher
    this.btnPersonaUser.addEventListener('click', () => this.setActivePersona('user'));
    this.btnPersonaFriend.addEventListener('click', () => this.setActivePersona('friend'));

    // Dashboard gap cards click to filter
    this.cardFilterFriendAhead.addEventListener('click', () => this.setFilter('friend-only'));
    this.cardFilterUserAhead.addEventListener('click', () => this.setFilter('user-only'));
    this.cardFilterBothMastered.addEventListener('click', () => this.setFilter('both-done'));

    // Search Box
    this.topicSearchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.btnClearSearch.classList.toggle('hidden', !this.searchQuery);
      this.renderChapters();
    });

    this.btnClearSearch.addEventListener('click', () => {
      this.topicSearchInput.value = '';
      this.searchQuery = '';
      this.btnClearSearch.classList.add('hidden');
      this.renderChapters();
    });

    // Keyboard shortcut '/' to search
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== this.topicSearchInput && !document.querySelector('.modal-overlay:not(.hidden)')) {
        e.preventDefault();
        this.topicSearchInput.focus();
      }
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });

    // Filter pills
    this.filterPillsContainer.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      const filter = pill.getAttribute('data-filter');
      this.setFilter(filter);
    });

    this.btnResetFilter.addEventListener('click', () => this.setFilter('all'));

    // Expand / Collapse all chapters
    this.btnToggleAllChapters.addEventListener('click', () => {
      const allChapterIds = this.state.chapters.map(c => c.id);
      if (this.collapsedChapters.size === allChapterIds.length) {
        // Expand all
        this.collapsedChapters.clear();
        this.btnToggleAllText.textContent = 'Collapse All';
      } else {
        // Collapse all
        allChapterIds.forEach(id => this.collapsedChapters.add(id));
        this.btnToggleAllText.textContent = 'Expand All';
      }
      this.renderChapters();
    });

    // Quick Options Dropdown
    this.btnQuickOptions.addEventListener('click', (e) => {
      e.stopPropagation();
      this.quickOptionsMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      this.quickOptionsMenu.classList.add('hidden');
    });

    this.btnLoadDSA.addEventListener('click', () => this.loadPreset(SEED_DATA_DSA, 'DSA & Algorithms'));
    this.btnLoadWebDev.addEventListener('click', () => this.loadPreset(SEED_DATA_WEBDEV, 'Full-Stack Web Dev'));
    this.btnLoadML.addEventListener('click', () => this.loadPreset(SEED_DATA_ML, 'AI & Machine Learning'));
    this.btnClearAllData.addEventListener('click', () => this.clearAllData());

    // Empty state triggers
    this.btnEmptyAddChapter.addEventListener('click', () => this.openAddChapterModal());
    this.btnEmptyLoadSample.addEventListener('click', () => this.loadPreset(SEED_DATA_DSA, 'DSA & Algorithms'));

    // Chapter Modal
    this.btnOpenAddChapter.addEventListener('click', () => this.openAddChapterModal());
    this.btnCloseModalChapter.addEventListener('click', () => this.modalChapter.classList.add('hidden'));
    this.btnCancelChapter.addEventListener('click', () => this.modalChapter.classList.add('hidden'));
    this.formChapter.addEventListener('submit', (e) => this.handleSaveChapter(e));

    // Topic Modal
    this.btnCloseModalTopic.addEventListener('click', () => this.modalTopic.classList.add('hidden'));
    this.btnCancelTopic.addEventListener('click', () => this.modalTopic.classList.add('hidden'));
    this.formTopic.addEventListener('submit', (e) => this.handleSaveTopic(e));

    // Settings Modal
    this.btnSettingsModal.addEventListener('click', () => this.openSettingsModal());
    this.btnCloseModalSettings.addEventListener('click', () => this.modalSettings.classList.add('hidden'));
    this.btnCancelSettings.addEventListener('click', () => this.modalSettings.classList.add('hidden'));
    this.formSettings.addEventListener('submit', (e) => this.handleSaveSettings(e));
    this.inputUserName.addEventListener('input', () => this.updateSettingsPreviews());
    this.inputUserInitials.addEventListener('input', () => this.updateSettingsPreviews());
    this.inputFriendName.addEventListener('input', () => this.updateSettingsPreviews());
    this.inputFriendInitials.addEventListener('input', () => this.updateSettingsPreviews());

    // Share & Sync Modal
    this.btnShareModal.addEventListener('click', () => this.openShareModal());
    this.btnCloseModalShare.addEventListener('click', () => this.modalShare.classList.add('hidden'));
    this.btnCloseShare.addEventListener('click', () => this.modalShare.classList.add('hidden'));
    this.btnCopyShareUrl.addEventListener('click', () => this.copyShareLink());
    this.btnExportJSON.addEventListener('click', () => this.exportJSONFile());
    this.fileImportJSON.addEventListener('change', (e) => this.importJSONFile(e));

    // Comparison Matrix Modal
    this.btnComparisonMatrix.addEventListener('click', () => this.openMatrixModal());
    this.btnCloseModalMatrix.addEventListener('click', () => this.modalMatrix.classList.add('hidden'));
    this.btnCloseMatrix.addEventListener('click', () => this.modalMatrix.classList.add('hidden'));

    // Upstash Cloud Sync Modal
    this.btnOpenUpstashModal.addEventListener('click', () => this.openUpstashModal());
    this.btnCloseModalUpstash.addEventListener('click', () => this.modalUpstash.classList.add('hidden'));
    this.btnCloseUpstash.addEventListener('click', () => this.modalUpstash.classList.add('hidden'));
    this.formUpstash.addEventListener('submit', (e) => this.handleConnectUpstash(e));
    this.btnPushToUpstash.addEventListener('click', () => this.pushToUpstash(true));
    this.btnPullFromUpstash.addEventListener('click', () => this.pullFromUpstash(true));
    this.btnCopyFriendCloudInvite.addEventListener('click', () => this.copyCloudInviteLink());
    this.btnDisconnectUpstash.addEventListener('click', () => this.disconnectUpstash());
    this.btnToggleTokenVisibility.addEventListener('click', () => this.toggleTokenVisibility());

    // Window focus: pull fresh updates when tab becomes active
    window.addEventListener('focus', () => {
      if (this.upstash && this.upstash.isConnected) {
        this.pullFromUpstash(false);
      }
    });

    // Modal background overlay click to close
    [this.modalChapter, this.modalTopic, this.modalSettings, this.modalShare, this.modalMatrix, this.modalUpstash].forEach(m => {
      m.addEventListener('click', (e) => {
        if (e.target === m) {
          m.classList.add('hidden');
        }
      });
    });
  }

  // ===================================================================
  // Persona & Filter Management
  // ===================================================================
  setActivePersona(persona) {
    this.state.activePersona = persona;
    this.saveState();
    const activeName = persona === 'user' ? this.state.profiles.user.name : this.state.profiles.friend.name;
    this.showToast(`Switched active marker to ${activeName}`, 'info');
  }

  setFilter(filterKey) {
    this.activeFilter = filterKey;
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.classList.toggle('active', pill.getAttribute('data-filter') === filterKey);
    });

    if (filterKey === 'all') {
      this.filterNoticeBanner.classList.add('hidden');
    } else {
      this.filterNoticeBanner.classList.remove('hidden');
      const friendName = this.state.profiles.friend.name;
      const userName = this.state.profiles.user.name;

      let msg = '';
      if (filterKey === 'friend-only') {
        msg = `Showing topics ${friendName} understood, but ${userName} hasn't yet (Knowledge Gap).`;
      } else if (filterKey === 'user-only') {
        msg = `Showing topics ${userName} understood, but ${friendName} hasn't yet.`;
      } else if (filterKey === 'both-done') {
        msg = `Showing topics both ${userName} and ${friendName} have understood.`;
      } else if (filterKey === 'neither-done') {
        msg = `Showing topics that neither learner has completed yet.`;
      }
      this.filterNoticeText.textContent = msg;
    }

    this.renderChapters();
  }

  closeAllModals() {
    [this.modalChapter, this.modalTopic, this.modalSettings, this.modalShare, this.modalMatrix, this.modalUpstash].forEach(m => {
      m.classList.add('hidden');
    });
    this.quickOptionsMenu.classList.add('hidden');
  }

  // ===================================================================
  // Calculations & Analytics
  // ===================================================================
  getStats() {
    let totalTopics = 0;
    let userCount = 0;
    let friendCount = 0;
    let friendOnlyCount = 0; // Friend understood, User didn't
    let userOnlyCount = 0;   // User understood, Friend didn't
    let bothCount = 0;       // Both understood
    let neitherCount = 0;    // Neither

    this.state.chapters.forEach(chap => {
      (chap.topics || []).forEach(t => {
        totalTopics++;
        if (t.userLearned) userCount++;
        if (t.friendLearned) friendCount++;

        if (t.friendLearned && !t.userLearned) {
          friendOnlyCount++;
        } else if (t.userLearned && !t.friendLearned) {
          userOnlyCount++;
        } else if (t.userLearned && t.friendLearned) {
          bothCount++;
        } else {
          neitherCount++;
        }
      });
    });

    const userPercent = totalTopics > 0 ? Math.round((userCount / totalTopics) * 100) : 0;
    const friendPercent = totalTopics > 0 ? Math.round((friendCount / totalTopics) * 100) : 0;
    const userLead = Math.max(0, userCount - friendCount);
    const friendLead = Math.max(0, friendCount - userCount);

    return {
      totalTopics,
      userCount,
      friendCount,
      userPercent,
      friendPercent,
      friendOnlyCount,
      userOnlyCount,
      bothCount,
      neitherCount,
      userLead,
      friendLead
    };
  }

  // ===================================================================
  // Rendering
  // ===================================================================
  render() {
    this.updateProfilesUI();
    this.updateStatsUI();
    this.renderChapters();
  }

  updateProfilesUI() {
    const { user, friend } = this.state.profiles;
    const active = this.state.activePersona || 'user';

    // Persona buttons in Header
    this.labelUserName.textContent = `${user.name} (You)`;
    this.labelFriendName.textContent = friend.name;
    this.avatarUser.textContent = user.initials || 'ME';
    this.avatarFriend.textContent = friend.initials || 'FR';

    this.btnPersonaUser.classList.toggle('active', active === 'user');
    this.btnPersonaFriend.classList.toggle('active', active === 'friend');

    // Dashboard avatars & names
    this.dashAvatarUser.textContent = user.initials || 'ME';
    this.dashNameUser.textContent = user.name;
    this.dashAvatarFriend.textContent = friend.initials || 'FR';
    this.dashNameFriend.textContent = friend.name;
    this.dashFriendShortName.textContent = friend.name;
    this.dashFriendShortName2.textContent = friend.name;

    // Initial topic modal labels
    this.labelInitialUser.textContent = `${user.name} (You)`;
    this.labelInitialFriend.textContent = friend.name;

    // Matrix headers
    this.thMatrixUser.textContent = `${user.name} (You)`;
    this.thMatrixFriend.textContent = `${friend.name} (Friend)`;
  }

  updateStatsUI() {
    const stats = this.getStats();

    // User stat card
    this.dashPercentUserBadge.textContent = `${stats.userPercent}%`;
    this.dashProgressBarUser.style.width = `${stats.userPercent}%`;
    this.dashCountUser.textContent = `${stats.userCount} / ${stats.totalTopics}`;
    this.dashUserLead.textContent = `+${stats.userLead}`;

    // Friend stat card
    this.dashPercentFriendBadge.textContent = `${stats.friendPercent}%`;
    this.dashProgressBarFriend.style.width = `${stats.friendPercent}%`;
    this.dashCountFriend.textContent = `${stats.friendCount} / ${stats.totalTopics}`;
    this.dashFriendLead.textContent = `+${stats.friendLead}`;

    // Knowledge Gap Analyzer card
    this.countFriendOnly.textContent = stats.friendOnlyCount;
    this.countUserOnly.textContent = stats.userOnlyCount;
    this.countBoth.textContent = stats.bothCount;

    // Pill badge counts
    this.pillCountAll.textContent = stats.totalTopics;
    this.pillCountFriendOnly.textContent = stats.friendOnlyCount;
    this.pillCountUserOnly.textContent = stats.userOnlyCount;
    this.pillCountBoth.textContent = stats.bothCount;
    this.pillCountNeither.textContent = stats.neitherCount;

    // Empty state visibility
    const hasChapters = this.state.chapters && this.state.chapters.length > 0;
    this.emptyStateContainer.classList.toggle('hidden', hasChapters);
  }

  renderChapters() {
    this.chaptersContainer.innerHTML = '';
    const { user, friend } = this.state.profiles;

    if (!this.state.chapters || this.state.chapters.length === 0) {
      return;
    }

    this.state.chapters.forEach(chapter => {
      // Filter topics based on active filter and search query
      const filteredTopics = (chapter.topics || []).filter(topic => {
        // Search filter
        if (this.searchQuery) {
          const matchTitle = topic.title.toLowerCase().includes(this.searchQuery);
          const matchNotes = (topic.notes || '').toLowerCase().includes(this.searchQuery);
          const matchChapter = chapter.title.toLowerCase().includes(this.searchQuery);
          if (!matchTitle && !matchNotes && !matchChapter) {
            return false;
          }
        }

        // Status Filter
        if (this.activeFilter === 'friend-only') {
          return topic.friendLearned && !topic.userLearned;
        }
        if (this.activeFilter === 'user-only') {
          return topic.userLearned && !topic.friendLearned;
        }
        if (this.activeFilter === 'both-done') {
          return topic.userLearned && topic.friendLearned;
        }
        if (this.activeFilter === 'neither-done') {
          return !topic.userLearned && !topic.friendLearned;
        }
        return true;
      });

      // Calculate chapter-level stats
      const chapTotal = (chapter.topics || []).length;
      const chapUserDone = (chapter.topics || []).filter(t => t.userLearned).length;
      const chapFriendDone = (chapter.topics || []).filter(t => t.friendLearned).length;
      const chapUserPercent = chapTotal > 0 ? Math.round((chapUserDone / chapTotal) * 100) : 0;
      const chapFriendPercent = chapTotal > 0 ? Math.round((chapFriendDone / chapTotal) * 100) : 0;

      const isCollapsed = this.collapsedChapters.has(chapter.id);

      // Chapter Card DOM
      const chapterCard = document.createElement('article');
      chapterCard.className = `chapter-card ${isCollapsed ? 'collapsed' : 'expanded'}`;
      chapterCard.dataset.chapterId = chapter.id;

      // Header
      const header = document.createElement('div');
      header.className = 'chapter-header';
      header.innerHTML = `
        <div class="chapter-title-area">
          <button type="button" class="chapter-collapse-btn" aria-label="Toggle chapter collapse">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <span class="chapter-badge-color swatch-${chapter.color || 'indigo'}"></span>
          <div class="chapter-text-info">
            <div class="chapter-title-row">
              <h3 class="chapter-title">${this.escapeHtml(chapter.title)}</h3>
              ${chapter.category ? `<span class="chapter-category-tag">${this.escapeHtml(chapter.category)}</span>` : ''}
              <span class="topic-est-time">${chapTotal} topics</span>
            </div>
            ${chapter.description ? `<p class="chapter-desc">${this.escapeHtml(chapter.description)}</p>` : ''}
          </div>
        </div>

        <div class="chapter-dual-progress">
          <div class="chapter-progress-item">
            <div class="chapter-progress-label">
              <span>${this.escapeHtml(user.name)}:</span>
              <span>${chapUserPercent}%</span>
            </div>
            <div class="chapter-progress-track">
              <div class="chapter-progress-fill fill-user" style="width: ${chapUserPercent}%"></div>
            </div>
          </div>
          <div class="chapter-progress-item">
            <div class="chapter-progress-label">
              <span>${this.escapeHtml(friend.name)}:</span>
              <span>${chapFriendPercent}%</span>
            </div>
            <div class="chapter-progress-track">
              <div class="chapter-progress-fill fill-friend" style="width: ${chapFriendPercent}%"></div>
            </div>
          </div>
        </div>

        <div class="chapter-actions">
          <button type="button" class="chapter-action-btn btn-add-topic" data-action="add-topic" title="Add topic to this chapter">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Add Topic</span>
          </button>
          <button type="button" class="chapter-action-btn" data-action="edit-chapter" title="Edit chapter">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <button type="button" class="chapter-action-btn btn-icon-subtle btn-delete" data-action="delete-chapter" title="Delete chapter">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      // Header click handling
      header.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-action]');
        if (actionBtn) {
          const action = actionBtn.dataset.action;
          if (action === 'add-topic') {
            this.openAddTopicModal(chapter.id, chapter.title);
          } else if (action === 'edit-chapter') {
            this.openEditChapterModal(chapter);
          } else if (action === 'delete-chapter') {
            this.deleteChapter(chapter.id);
          }
          return;
        }

        // Toggle collapse
        if (this.collapsedChapters.has(chapter.id)) {
          this.collapsedChapters.delete(chapter.id);
        } else {
          this.collapsedChapters.add(chapter.id);
        }
        this.renderChapters();
      });

      // Chapter Body (Topics list)
      const body = document.createElement('div');
      body.className = 'chapter-body';

      if (filteredTopics.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-chapter-topics';
        if (chapTotal === 0) {
          emptyMsg.innerHTML = `No topics in this chapter yet. <button type="button" class="btn btn-link" data-add-topic="${chapter.id}">Add your first topic</button>`;
        } else {
          emptyMsg.textContent = 'No topics matched the current filter/search.';
        }
        emptyMsg.addEventListener('click', (e) => {
          if (e.target.dataset.addTopic) {
            this.openAddTopicModal(chapter.id, chapter.title);
          }
        });
        body.appendChild(emptyMsg);
      } else {
        filteredTopics.forEach(topic => {
          body.appendChild(this.createTopicElement(chapter, topic));
        });
      }

      chapterCard.appendChild(header);
      chapterCard.appendChild(body);
      this.chaptersContainer.appendChild(chapterCard);
    });
  }

  // Create single topic DOM element
  createTopicElement(chapter, topic) {
    const { user, friend } = this.state.profiles;
    const row = document.createElement('div');

    // Gap analysis class and indicator badge
    let gapClass = '';
    let gapBadgeHtml = '';

    if (topic.friendLearned && !topic.userLearned) {
      gapClass = 'gap-friend-understands';
      gapBadgeHtml = `
        <span class="gap-tag tag-friend-only" title="${this.escapeHtml(friend.name)} mastered this! You need to catch up.">
          <span>💡</span> ${this.escapeHtml(friend.name)} Understood (You need this)
        </span>
      `;
    } else if (topic.userLearned && !topic.friendLearned) {
      gapClass = 'gap-user-understands';
      gapBadgeHtml = `
        <span class="gap-tag tag-user-only" title="You mastered this! You can explain it to ${this.escapeHtml(friend.name)}.">
          <span>🚀</span> You Understood (${this.escapeHtml(friend.name)} needs this)
        </span>
      `;
    } else if (topic.userLearned && topic.friendLearned) {
      gapClass = 'gap-both-mastered';
      gapBadgeHtml = `
        <span class="gap-tag tag-both" title="Both of you understand this topic!">
          <span>✓✓</span> Both Understood
        </span>
      `;
    } else {
      gapBadgeHtml = `
        <span class="gap-tag tag-neither" title="Neither of you have marked this yet.">
          <span>⏳</span> In Queue
        </span>
      `;
    }

    row.className = `topic-row ${gapClass}`;
    row.dataset.topicId = topic.id;

    row.innerHTML = `
      <div class="topic-details">
        <div class="topic-title-line">
          <span class="topic-title">${this.escapeHtml(topic.title)}</span>
          <span class="badge-difficulty difficulty-${topic.difficulty || 'Medium'}">${topic.difficulty || 'Medium'}</span>
          ${topic.estHours ? `<span class="topic-est-time">${topic.estHours}h</span>` : ''}
          ${gapBadgeHtml}
        </div>
        ${topic.notes ? `<div class="topic-notes" title="${this.escapeHtml(topic.notes)}">${this.escapeHtml(topic.notes)}</div>` : ''}
      </div>

      <div class="topic-controls">
        <div class="topic-checkers-group">
          <!-- Toggle for User -->
          <div class="learner-toggle ${topic.userLearned ? 'active-user' : ''}" data-learner="user" title="Click to toggle understood for ${this.escapeHtml(user.name)}">
            <div class="toggle-box">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span>${this.escapeHtml(user.name)} (You)</span>
          </div>

          <!-- Toggle for Friend -->
          <div class="learner-toggle ${topic.friendLearned ? 'active-friend' : ''}" data-learner="friend" title="Click to toggle understood for ${this.escapeHtml(friend.name)}">
            <div class="toggle-box">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span>${this.escapeHtml(friend.name)}</span>
          </div>
        </div>

        <div class="topic-actions-btn-group">
          <button type="button" class="btn-icon-subtle" data-action="edit-topic" title="Edit topic notes or difficulty">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button type="button" class="btn-icon-subtle btn-delete" data-action="delete-topic" title="Delete topic">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Toggle event listeners
    row.querySelectorAll('.learner-toggle').forEach(toggleBtn => {
      toggleBtn.addEventListener('click', () => {
        const learner = toggleBtn.dataset.learner;
        this.toggleTopicLearner(chapter.id, topic.id, learner);
      });
    });

    // Action buttons
    row.querySelector('[data-action="edit-topic"]').addEventListener('click', () => {
      this.openEditTopicModal(chapter.id, chapter.title, topic);
    });

    row.querySelector('[data-action="delete-topic"]').addEventListener('click', () => {
      this.deleteTopic(chapter.id, topic.id);
    });

    return row;
  }

  // ===================================================================
  // Chapter & Topic CRUD
  // ===================================================================
  toggleTopicLearner(chapterId, topicId, learner) {
    const chapter = this.state.chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    const topic = chapter.topics.find(t => t.id === topicId);
    if (!topic) return;

    if (learner === 'user') {
      topic.userLearned = !topic.userLearned;
    } else {
      topic.friendLearned = !topic.friendLearned;
    }

    const learnerName = learner === 'user' ? this.state.profiles.user.name : this.state.profiles.friend.name;
    const isDone = learner === 'user' ? topic.userLearned : topic.friendLearned;

    this.saveState();

    if (isDone) {
      this.showToast(`Marked "${topic.title}" as understood by ${learnerName}!`, 'success');
      // If both completed, fire celebration confetti!
      if (topic.userLearned && topic.friendLearned) {
        this.triggerConfetti();
      }
    } else {
      this.showToast(`Unmarked "${topic.title}" for ${learnerName}`, 'info');
    }
  }

  openAddChapterModal() {
    this.modalChapterTitle.textContent = 'Add New Chapter';
    this.inputChapterId.value = '';
    this.inputChapterTitle.value = '';
    this.inputChapterDescription.value = '';
    this.inputChapterCategory.value = '';
    document.querySelector('input[name="chapterColor"][value="indigo"]').checked = true;
    this.modalChapter.classList.remove('hidden');
    this.inputChapterTitle.focus();
  }

  openEditChapterModal(chapter) {
    this.modalChapterTitle.textContent = 'Edit Chapter';
    this.inputChapterId.value = chapter.id;
    this.inputChapterTitle.value = chapter.title;
    this.inputChapterDescription.value = chapter.description || '';
    this.inputChapterCategory.value = chapter.category || '';
    const colorRadio = document.querySelector(`input[name="chapterColor"][value="${chapter.color || 'indigo'}"]`);
    if (colorRadio) colorRadio.checked = true;
    this.modalChapter.classList.remove('hidden');
    this.inputChapterTitle.focus();
  }

  handleSaveChapter(e) {
    e.preventDefault();
    const id = this.inputChapterId.value;
    const title = this.inputChapterTitle.value.trim();
    const description = this.inputChapterDescription.value.trim();
    const category = this.inputChapterCategory.value.trim();
    const selectedColor = document.querySelector('input[name="chapterColor"]:checked')?.value || 'indigo';

    if (!title) return;

    if (id) {
      // Edit existing
      const chap = this.state.chapters.find(c => c.id === id);
      if (chap) {
        chap.title = title;
        chap.description = description;
        chap.category = category;
        chap.color = selectedColor;
        this.showToast(`Chapter "${title}" updated.`, 'info');
      }
    } else {
      // Create new
      const newChap = {
        id: 'chap-' + Date.now(),
        title,
        description,
        category,
        color: selectedColor,
        topics: []
      };
      this.state.chapters.push(newChap);
      this.showToast(`Chapter "${title}" created!`, 'success');
    }

    this.modalChapter.classList.add('hidden');
    this.saveState();
  }

  deleteChapter(chapterId) {
    const chap = this.state.chapters.find(c => c.id === chapterId);
    if (!chap) return;
    if (confirm(`Are you sure you want to delete chapter "${chap.title}" and all its sub-topics?`)) {
      this.state.chapters = this.state.chapters.filter(c => c.id !== chapterId);
      this.saveState();
      this.showToast(`Chapter "${chap.title}" deleted.`, 'info');
    }
  }

  openAddTopicModal(chapterId, chapterTitle) {
    this.modalTopicTitle.textContent = 'Add Topic / Sub-Chapter';
    this.inputTopicId.value = '';
    this.inputTopicChapterId.value = chapterId;
    this.modalTopicChapterName.textContent = chapterTitle;
    this.inputTopicTitle.value = '';
    this.inputTopicNotes.value = '';
    this.selectTopicDifficulty.value = 'Medium';
    this.inputTopicEstTime.value = 2;

    // Default checkboxes based on active persona
    this.checkInitialUserLearned.checked = this.state.activePersona === 'user';
    this.checkInitialFriendLearned.checked = this.state.activePersona === 'friend';

    this.modalTopic.classList.remove('hidden');
    this.inputTopicTitle.focus();
  }

  openEditTopicModal(chapterId, chapterTitle, topic) {
    this.modalTopicTitle.textContent = 'Edit Topic';
    this.inputTopicId.value = topic.id;
    this.inputTopicChapterId.value = chapterId;
    this.modalTopicChapterName.textContent = chapterTitle;
    this.inputTopicTitle.value = topic.title;
    this.inputTopicNotes.value = topic.notes || '';
    this.selectTopicDifficulty.value = topic.difficulty || 'Medium';
    this.inputTopicEstTime.value = topic.estHours || 2;
    this.checkInitialUserLearned.checked = !!topic.userLearned;
    this.checkInitialFriendLearned.checked = !!topic.friendLearned;

    this.modalTopic.classList.remove('hidden');
    this.inputTopicTitle.focus();
  }

  handleSaveTopic(e) {
    e.preventDefault();
    const chapterId = this.inputTopicChapterId.value;
    const topicId = this.inputTopicId.value;
    const title = this.inputTopicTitle.value.trim();
    const notes = this.inputTopicNotes.value.trim();
    const difficulty = this.selectTopicDifficulty.value;
    const estHours = parseFloat(this.inputTopicEstTime.value) || 1;
    const userLearned = this.checkInitialUserLearned.checked;
    const friendLearned = this.checkInitialFriendLearned.checked;

    if (!title || !chapterId) return;

    const chapter = this.state.chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    if (topicId) {
      // Edit
      const topic = chapter.topics.find(t => t.id === topicId);
      if (topic) {
        topic.title = title;
        topic.notes = notes;
        topic.difficulty = difficulty;
        topic.estHours = estHours;
        topic.userLearned = userLearned;
        topic.friendLearned = friendLearned;
        this.showToast(`Topic "${title}" updated.`, 'info');
      }
    } else {
      // Create new
      const newTopic = {
        id: 'top-' + Date.now(),
        title,
        notes,
        difficulty,
        estHours,
        userLearned,
        friendLearned
      };
      if (!chapter.topics) chapter.topics = [];
      chapter.topics.push(newTopic);
      this.showToast(`Topic "${title}" added to ${chapter.title}!`, 'success');
    }

    this.modalTopic.classList.add('hidden');
    this.saveState();
  }

  deleteTopic(chapterId, topicId) {
    const chapter = this.state.chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    const topic = chapter.topics.find(t => t.id === topicId);
    if (!topic) return;

    if (confirm(`Delete topic "${topic.title}"?`)) {
      chapter.topics = chapter.topics.filter(t => t.id !== topicId);
      this.saveState();
      this.showToast(`Topic deleted.`, 'info');
    }
  }

  // ===================================================================
  // Settings & Profiles Modal
  // ===================================================================
  openSettingsModal() {
    const { user, friend } = this.state.profiles;
    this.inputUserName.value = user.name;
    this.inputUserInitials.value = user.initials || 'ME';
    this.inputFriendName.value = friend.name;
    this.inputFriendInitials.value = friend.initials || 'FR';
    this.updateSettingsPreviews();
    this.modalSettings.classList.remove('hidden');
  }

  updateSettingsPreviews() {
    this.settingsPreviewAvatarUser.textContent = (this.inputUserInitials.value || 'ME').substring(0, 4);
    this.settingsPreviewAvatarFriend.textContent = (this.inputFriendInitials.value || 'FR').substring(0, 4);
  }

  handleSaveSettings(e) {
    e.preventDefault();
    const userName = this.inputUserName.value.trim() || 'Alex';
    const userInit = (this.inputUserInitials.value.trim() || 'ME').toUpperCase();
    const friendName = this.inputFriendName.value.trim() || 'Sam';
    const friendInit = (this.inputFriendInitials.value.trim() || 'FR').toUpperCase();

    this.state.profiles.user.name = userName;
    this.state.profiles.user.initials = userInit;
    this.state.profiles.friend.name = friendName;
    this.state.profiles.friend.initials = friendInit;

    this.saveState();
    this.modalSettings.classList.add('hidden');
    this.showToast('Study profiles updated successfully!', 'success');
  }

  // ===================================================================
  // Presets & Data Management
  // ===================================================================
  loadPreset(dataset, name) {
    if (confirm(`Load the "${name}" study preset? This will replace your current syllabus list.`)) {
      this.state.chapters = JSON.parse(JSON.stringify(dataset.chapters));
      this.saveState();
      this.showToast(`Loaded ${name} preset successfully!`, 'success');
    }
  }

  clearAllData() {
    if (confirm('Are you sure you want to clear all chapters and topics? You can reload sample presets at any time.')) {
      this.state.chapters = [];
      this.saveState();
      this.showToast('All chapters cleared.', 'info');
    }
  }

  // ===================================================================
  // Comparison Matrix View
  // ===================================================================
  openMatrixModal() {
    const { user, friend } = this.state.profiles;
    this.matrixTableBody.innerHTML = '';

    let rowCount = 0;

    this.state.chapters.forEach(chap => {
      (chap.topics || []).forEach(top => {
        rowCount++;
        const tr = document.createElement('tr');

        let statusDescription = '';
        let statusTagClass = '';

        if (top.userLearned && top.friendLearned) {
          statusDescription = '✨ Both Understood (In Sync)';
          statusTagClass = 'tag-both';
        } else if (top.friendLearned && !top.userLearned) {
          statusDescription = `💡 ${this.escapeHtml(friend.name)} knows — Can mentor ${this.escapeHtml(user.name)}`;
          statusTagClass = 'tag-friend-only';
        } else if (top.userLearned && !top.friendLearned) {
          statusDescription = `🚀 ${this.escapeHtml(user.name)} knows — Can mentor ${this.escapeHtml(friend.name)}`;
          statusTagClass = 'tag-user-only';
        } else {
          statusDescription = '⏳ Both In Queue';
          statusTagClass = 'tag-neither';
        }

        tr.innerHTML = `
          <td>
            <span class="matrix-topic-title">${this.escapeHtml(top.title)}</span>
            <span class="matrix-chapter-tag">${this.escapeHtml(chap.title)}</span>
          </td>
          <td class="col-center">
            <span class="status-badge-matrix ${top.userLearned ? 'status-matrix-done' : 'status-matrix-pending'}">
              ${top.userLearned ? '✓' : '—'}
            </span>
          </td>
          <td class="col-center">
            <span class="status-badge-matrix ${top.friendLearned ? 'status-matrix-done' : 'status-matrix-pending'}">
              ${top.friendLearned ? '✓' : '—'}
            </span>
          </td>
          <td>
            <span class="gap-tag ${statusTagClass}">${statusDescription}</span>
          </td>
        `;
        this.matrixTableBody.appendChild(tr);
      });
    });

    if (rowCount === 0) {
      this.matrixTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 2rem;">No topics available to compare. Add chapters and topics first!</td></tr>`;
    }

    this.modalMatrix.classList.remove('hidden');
  }

  // ===================================================================
  // Share, Sync & Export
  // ===================================================================
  openShareModal() {
    this.generateShareUrl();
    this.modalShare.classList.remove('hidden');
  }

  generateShareUrl() {
    try {
      // Export current state into base64 url hash
      const payload = JSON.stringify(this.state);
      const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(payload))));
      const currentUrl = window.location.origin + window.location.pathname;
      const shareUrl = `${currentUrl}#sync=${encoded}`;
      this.shareUrlInput.value = shareUrl;
    } catch (e) {
      this.shareUrlInput.value = window.location.href;
    }
  }

  copyShareLink() {
    this.shareUrlInput.select();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(this.shareUrlInput.value).then(() => {
        this.btnCopyText.textContent = 'Copied!';
        this.showToast('Share link copied to clipboard! Send to your friend.', 'success');
        setTimeout(() => {
          this.btnCopyText.textContent = 'Copy Link';
        }, 2200);
      });
    } else {
      document.execCommand('copy');
      this.btnCopyText.textContent = 'Copied!';
      setTimeout(() => {
        this.btnCopyText.textContent = 'Copy Link';
      }, 2200);
    }
  }

  exportJSONFile() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `peertrack_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    this.showToast('Downloaded JSON study backup.', 'success');
  }

  importJSONFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.chapters && imported.profiles) {
          this.state = imported;
          this.saveState();
          this.showToast('Study tracker successfully imported!', 'success');
          this.modalShare.classList.add('hidden');
        } else {
          alert('Invalid PeerTrack backup file format.');
        }
      } catch (err) {
        alert('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  checkUrlForSharePayload() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#sync=')) {
      try {
        const encoded = hash.replace('#sync=', '');
        const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
        const parsed = JSON.parse(jsonStr);
        if (parsed.chapters && parsed.profiles) {
          if (confirm('A study plan was shared with you via this link! Would you like to load this shared syllabus and study progress?')) {
            this.state = parsed;
            // Switch persona to friend by default since user opened a shared link!
            this.state.activePersona = 'friend';
            this.saveState();
            this.showToast(`Loaded study syllabus! Welcome ${parsed.profiles.friend.name}!`, 'success');
            // Clean up the URL hash without reload
            history.replaceState(null, document.title, window.location.pathname);
          }
        }
      } catch (e) {
        console.warn('Invalid share link payload', e);
      }
    }
  }

  // ===================================================================
  // Upstash Redis Cloud Sync Methods
  // ===================================================================
  loadUpstashConfig() {
    try {
      const saved = localStorage.getItem(UPSTASH_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Object.assign({
          url: '',
          token: '',
          roomId: 'study-duo-room-1',
          pollInterval: 10000,
          autoSync: true,
          isConnected: false,
          lastSyncedAt: null
        }, parsed);
      }
    } catch (e) {
      console.warn('Failed to load Upstash config', e);
    }
    return {
      url: '',
      token: '',
      roomId: 'study-duo-room-1',
      pollInterval: 10000,
      autoSync: true,
      isConnected: false,
      lastSyncedAt: null
    };
  }

  saveUpstashConfig() {
    try {
      localStorage.setItem(UPSTASH_CONFIG_KEY, JSON.stringify(this.upstash));
    } catch (e) {
      console.error('Failed to save Upstash config', e);
    }
    this.updateUpstashStatusUI();
  }

  initUpstash() {
    // Populate form fields
    if (this.inputUpstashUrl) this.inputUpstashUrl.value = this.upstash.url || '';
    if (this.inputUpstashToken) this.inputUpstashToken.value = this.upstash.token || '';
    if (this.inputUpstashRoom) this.inputUpstashRoom.value = this.upstash.roomId || 'study-duo-room-1';
    if (this.selectSyncInterval) this.selectSyncInterval.value = String(this.upstash.pollInterval || 10000);
    if (this.checkUpstashAutoSync) this.checkUpstashAutoSync.checked = !!this.upstash.autoSync;

    this.updateUpstashStatusUI();

    // Auto-detect Vercel server-side API proxy
    this.detectVercelAPI();

    // If previously connected, resume polling and pull updates
    if (this.upstash.isConnected && (this.upstash.useServerProxy || (this.upstash.url && this.upstash.token))) {
      this.startSyncPolling();
      this.pullFromUpstash(false);
    }
  }

  /**
   * Check if the Vercel /api/sync endpoint is available and configured.
   * If so, enable server-side proxy mode (no client-side credentials needed).
   */
  async detectVercelAPI() {
    try {
      const res = await fetch('/api/sync?room=' + encodeURIComponent(this.upstash.roomId || 'study-duo-room-1'));
      if (res.ok) {
        const data = await res.json();
        if (data.configured) {
          this.upstash.useServerProxy = true;
          this.upstash.isConnected = true;
          this.upstash.lastSyncedAt = Date.now();
          this.saveUpstashConfig();
          this.startSyncPolling();
          this.pullFromUpstash(false);
          this.showToast('Auto-connected to Upstash via Vercel!', 'success');
        }
      }
    } catch (e) {
      // Not on Vercel or API not available — that's fine, user can connect manually
    }
  }

  updateUpstashStatusUI(syncState = null) {
    const isConn = !!this.upstash.isConnected;

    // Header indicator
    if (this.cloudStatusDot) {
      this.cloudStatusDot.className = 'cloud-status-indicator ' + 
        (syncState === 'syncing' ? 'status-syncing' : (isConn ? 'status-connected' : 'status-offline'));
    }
    if (this.cloudStatusLabel) {
      this.cloudStatusLabel.textContent = syncState === 'syncing' 
        ? 'Syncing...' 
        : (isConn ? 'Cloud Live 🟢' : 'Upstash Cloud');
    }

    // Modal banner
    if (this.upstashStatusBanner) {
      this.upstashStatusBanner.className = 'cloud-status-banner ' + 
        (isConn ? 'status-banner-connected' : 'status-banner-disconnected');
    }
    if (this.bannerStatusTitle) {
      this.bannerStatusTitle.textContent = isConn 
        ? `Connected to Room: ${this.upstash.roomId || 'Default'}` 
        : 'Cloud Sync Disconnected';
    }
    if (this.bannerStatusSub) {
      this.bannerStatusSub.textContent = isConn 
        ? 'Live bidirectional sync with Upstash Redis active.' 
        : 'Currently storing progress locally in browser.';
    }
    if (this.bannerLastSyncText) {
      if (this.upstash.lastSyncedAt) {
        const timeStr = new Date(this.upstash.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.bannerLastSyncText.textContent = `Synced: ${timeStr}`;
      } else {
        this.bannerLastSyncText.textContent = isConn ? 'Synced just now' : '—';
      }
    }
  }

  openUpstashModal() {
    this.inputUpstashUrl.value = this.upstash.url || '';
    this.inputUpstashToken.value = this.upstash.token || '';
    this.inputUpstashRoom.value = this.upstash.roomId || 'study-duo-room-1';
    this.selectSyncInterval.value = String(this.upstash.pollInterval || 10000);
    this.checkUpstashAutoSync.checked = !!this.upstash.autoSync;
    this.updateUpstashStatusUI();
    this.modalUpstash.classList.remove('hidden');
  }

  toggleTokenVisibility() {
    const isPassword = this.inputUpstashToken.type === 'password';
    this.inputUpstashToken.type = isPassword ? 'text' : 'password';
    this.btnToggleTokenVisibility.textContent = isPassword ? 'Hide' : 'Show';
  }

  cleanUpstashUrl(url) {
    if (!url) return '';
    let cleaned = url.trim();
    if (cleaned.endsWith('/')) {
      cleaned = cleaned.slice(0, -1);
    }
    return cleaned;
  }

  async handleConnectUpstash(e) {
    e.preventDefault();
    const url = this.cleanUpstashUrl(this.inputUpstashUrl.value);
    const token = this.inputUpstashToken.value.trim();
    const roomId = this.inputUpstashRoom.value.trim() || 'study-duo-room-1';
    const pollIntervalVal = this.selectSyncInterval.value;
    const pollInterval = pollIntervalVal === 'manual' ? null : parseInt(pollIntervalVal, 10);
    const autoSync = this.checkUpstashAutoSync.checked;

    // If server proxy is available, use that instead of direct credentials
    if (this.upstash.useServerProxy) {
      this.upstash.roomId = roomId;
      this.upstash.pollInterval = pollInterval;
      this.upstash.autoSync = autoSync;
      this.upstash.isConnected = true;
      this.upstash.lastSyncedAt = Date.now();
      this.saveUpstashConfig();
      this.startSyncPolling();
      await this.pullFromUpstash(false);
      this.updateUpstashStatusUI();
      this.showToast('Connected via server API!', 'success');
      this.modalUpstash.classList.add('hidden');
      return;
    }

    if (!url || !token) {
      this.showToast('Please provide both Upstash URL and Token.', 'info');
      return;
    }

    this.updateUpstashStatusUI('syncing');
    this.showToast('Connecting to Upstash Redis...', 'info');

    try {
      // Test REST connection with PING
      const testRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['PING'])
      });

      if (!testRes.ok) {
        throw new Error(`Upstash returned HTTP ${testRes.status}: ${testRes.statusText}`);
      }

      const pingData = await testRes.json();
      if (pingData.error) {
        throw new Error(pingData.error);
      }

      // Connection succeeded! Update config
      this.upstash.url = url;
      this.upstash.token = token;
      this.upstash.roomId = roomId;
      this.upstash.pollInterval = pollInterval;
      this.upstash.autoSync = autoSync;
      this.upstash.isConnected = true;
      this.upstash.useServerProxy = false;
      this.upstash.lastSyncedAt = Date.now();
      this.saveUpstashConfig();

      // Check if remote data already exists for this room
      const getRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['GET', `peertrack:${roomId}`])
      });

      const getData = await getRes.json();
      if (getData.result) {
        try {
          const remoteObj = JSON.parse(getData.result);
          if (remoteObj.state && remoteObj.state.chapters) {
            const pullRemote = confirm(
              `Found an existing study syllabus in Upstash for room "${roomId}"!\n\n` +
              `Click OK to load the remote cloud syllabus,\n` +
              `or Cancel to overwrite the cloud with your current local syllabus.`
            );

            if (pullRemote) {
              this.state = remoteObj.state;
              this.lastRemoteUpdatedAt = remoteObj.updatedAt || Date.now();
              this.saveStateLocallyWithoutPush();
              this.showToast('Loaded shared syllabus from Upstash cloud!', 'success');
            } else {
              await this.pushToUpstash(false);
              this.showToast('Pushed current syllabus to Upstash cloud!', 'success');
            }
          } else {
            await this.pushToUpstash(false);
          }
        } catch (parseErr) {
          await this.pushToUpstash(false);
        }
      } else {
        // No existing room data, push current state
        await this.pushToUpstash(false);
      }

      this.startSyncPolling();
      this.updateUpstashStatusUI();
      this.showToast('Connected to Upstash Redis Cloud!', 'success');
      this.modalUpstash.classList.add('hidden');
    } catch (err) {
      console.error('Upstash connection error:', err);
      this.upstash.isConnected = false;
      this.updateUpstashStatusUI();
      alert(`Could not connect to Upstash Redis:\n${err.message}\n\nPlease check your REST URL and Token.`);
    }
  }

  async pushToUpstash(notify = true) {
    if (!this.upstash.isConnected) {
      if (notify) this.showToast('Connect Upstash first to sync to cloud.', 'info');
      return;
    }

    this.updateUpstashStatusUI('syncing');

    try {
      const payload = {
        state: this.state,
        updatedAt: Date.now(),
        sender: this.state.profiles.user.name
      };

      let res;
      if (this.upstash.useServerProxy) {
        // Use Vercel server-side API proxy (credentials in env vars)
        res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: this.upstash.roomId, payload })
        });
      } else {
        // Direct Upstash REST call (credentials in browser)
        res = await fetch(this.upstash.url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.upstash.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(['SET', `peertrack:${this.upstash.roomId}`, JSON.stringify(payload)])
        });
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      this.upstash.lastSyncedAt = Date.now();
      this.saveUpstashConfig();
      this.updateUpstashStatusUI();

      if (notify) {
        this.showToast('Pushed latest study progress to Upstash!', 'success');
      }
    } catch (err) {
      console.warn('Failed to push to Upstash', err);
      this.updateUpstashStatusUI();
      if (notify) {
        this.showToast('Failed to push to cloud: ' + err.message, 'info');
      }
    }
  }

  async pullFromUpstash(notify = true) {
    if (!this.upstash.isConnected || this.isSyncing) {
      return;
    }

    this.isSyncing = true;

    try {
      let data;
      if (this.upstash.useServerProxy) {
        // Use Vercel server-side API proxy
        const res = await fetch('/api/sync?room=' + encodeURIComponent(this.upstash.roomId));
        if (res.ok) {
          data = await res.json();
          // Server returns { configured, result } where result is the raw string
          if (data.result) {
            data = { result: data.result };
          }
        }
      } else {
        // Direct Upstash REST call
        const res = await fetch(this.upstash.url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.upstash.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(['GET', `peertrack:${this.upstash.roomId}`])
        });
        if (res.ok) {
          data = await res.json();
        }
      }

      if (data && data.result) {
        const remote = JSON.parse(data.result);
        // Only apply if remote was updated after our last known pull
        if (remote && remote.state && remote.updatedAt) {
          const isNewer = remote.updatedAt > (this.lastRemoteUpdatedAt || 0);
          const isDifferent = JSON.stringify(remote.state) !== JSON.stringify(this.state);

          if (isNewer && isDifferent) {
            this.state = remote.state;
            this.lastRemoteUpdatedAt = remote.updatedAt;
            this.saveStateLocallyWithoutPush();
            this.showToast(`Updated from study buddy (${remote.sender || 'Cloud'})!`, 'info');
          }
        }
      }
      this.upstash.lastSyncedAt = Date.now();
      this.updateUpstashStatusUI();
      if (notify) {
        this.showToast('Synced latest data from Upstash Cloud.', 'success');
      }
    } catch (err) {
      console.warn('Failed to pull from Upstash', err);
    } finally {
      this.isSyncing = false;
      this.updateUpstashStatusUI();
    }
  }

  triggerAutoPush() {
    clearTimeout(this.autoPushTimer);
    this.autoPushTimer = setTimeout(() => {
      this.pushToUpstash(false);
    }, 400);
  }

  startSyncPolling() {
    this.stopSyncPolling();
    if (!this.upstash.pollInterval || this.upstash.pollInterval < 1000) {
      return;
    }
    this.syncPollTimer = setInterval(() => {
      // Only poll when the window/document is visible to save requests
      if (!document.hidden && this.upstash.isConnected) {
        this.pullFromUpstash(false);
      }
    }, this.upstash.pollInterval);
  }

  stopSyncPolling() {
    if (this.syncPollTimer) {
      clearInterval(this.syncPollTimer);
      this.syncPollTimer = null;
    }
  }

  disconnectUpstash() {
    if (confirm('Disconnect from Upstash Cloud? Your data will remain safely stored locally in your browser.')) {
      this.stopSyncPolling();
      this.upstash.isConnected = false;
      this.saveUpstashConfig();
      this.updateUpstashStatusUI();
      this.showToast('Disconnected from Upstash Cloud.', 'info');
    }
  }

  copyCloudInviteLink() {
    if (!this.upstash.url || !this.upstash.token) {
      alert('Please connect your Upstash URL and Token first before copying an invite link.');
      return;
    }

    try {
      const inviteData = {
        url: this.upstash.url,
        token: this.upstash.token,
        roomId: this.upstash.roomId || 'study-duo-room-1'
      };
      const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(inviteData)))));
      const inviteUrl = `${window.location.origin}${window.location.pathname}#cloud=${encoded}`;

      navigator.clipboard.writeText(inviteUrl).then(() => {
        this.showToast('Copied Cloud Room invite link! Send it to your friend.', 'success');
      }).catch(() => {
        prompt('Copy this invite link for your friend:', inviteUrl);
      });
    } catch (err) {
      console.error('Failed to create invite link', err);
    }
  }

  checkUrlForCloudPayload() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#cloud=')) {
      try {
        const encoded = hash.replace('#cloud=', '');
        const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
        const parsed = JSON.parse(jsonStr);

        if (parsed.url && parsed.token && parsed.roomId) {
          const accept = confirm(
            `Your study buddy invited you to join Upstash Cloud Room: "${parsed.roomId}"!\n\n` +
            `Would you like to connect and sync your study tracker live?`
          );

          if (accept) {
            this.upstash.url = parsed.url;
            this.upstash.token = parsed.token;
            this.upstash.roomId = parsed.roomId;
            this.upstash.isConnected = true;
            this.upstash.autoSync = true;
            // Switch persona to friend by default
            this.state.activePersona = 'friend';
            this.saveUpstashConfig();
            this.saveStateLocallyWithoutPush();
            this.startSyncPolling();
            this.pullFromUpstash(true);
            this.showToast(`Connected to room "${parsed.roomId}"! Welcome!`, 'success');
            history.replaceState(null, document.title, window.location.pathname);
          }
        }
      } catch (err) {
        console.warn('Invalid cloud invite hash', err);
      }
    }
  }

  // ===================================================================
  // Celebration Confetti
  // ===================================================================
  triggerConfetti() {
    const canvas = this.confettiCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#6366f1', '#38bdf8', '#f43f5e', '#fbbf24', '#10b981', '#ec4899'];
    const particles = [];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 8,
        life: 1,
        decay: Math.random() * 0.015 + 0.01
      });
    }

    let animationId;
    const renderConfetti = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.rotation += p.rSpeed;
        p.life -= p.decay;

        if (p.life > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
          ctx.restore();
        }
      });

      if (alive) {
        animationId = requestAnimationFrame(renderConfetti);
      } else {
        cancelAnimationFrame(animationId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    renderConfetti();
  }

  // ===================================================================
  // Toast Alerts
  // ===================================================================
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : 'ℹ';
    toast.innerHTML = `<span style="font-weight: bold;">${icon}</span> <span>${this.escapeHtml(message)}</span>`;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new StudyTrackerApp();
});
