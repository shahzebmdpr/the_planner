/**
 * PeerTrack — Minimalist Duo Study & Knowledge Gap Tracker
 * Collaborative tracker for chapters & sub-topics between two learners
 * with Master Key regulation and locked progress checkmarks.
 */

// ===================================================================
// Default Seed Dataset
// ===================================================================

const SEED_DATA_DSA = {
  profiles: {
    user: { id: 'user', name: 'Shahzeb', initials: 'SH', pin: '1234' },
    friend: { id: 'friend', name: 'Aman', initials: 'AM', pin: '1234' }
  },
  auth: {
    masterKey: 'thekey'
  },
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
      title: 'Graph Theory & Traversal',
      category: 'Algorithms',
      description: 'Shortest paths, minimum spanning trees, cycle detection, and topological sorting.',
      color: 'emerald',
      topics: [
        {
          id: 'top-g-1',
          title: 'BFS & Shortest Path in Unweighted Graph',
          notes: 'Queue-based traversal with visited set and level tracker.',
          difficulty: 'Easy',
          estHours: 1.5,
          userLearned: true,
          friendLearned: true
        },
        {
          id: 'top-g-2',
          title: "Dijkstra's Algorithm (Priority Queue)",
          notes: 'Non-negative edge weights using min-heap. Time: O((V + E) log V).',
          difficulty: 'Medium',
          estHours: 3,
          userLearned: true,
          friendLearned: false
        },
        {
          id: 'top-g-3',
          title: 'Topological Sort (Kahn’s & DFS)',
          notes: 'DAG ordering using in-degree array or post-order reverse DFS.',
          difficulty: 'Medium',
          estHours: 2,
          userLearned: false,
          friendLearned: true
        },
        {
          id: 'top-g-4',
          title: 'Disjoint Set Union (DSU with Path Compression)',
          notes: 'Find and union with rank. Nearly O(1) amortized alpha(N).',
          difficulty: 'Medium',
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
      description: 'Tree traversals, binary search tree properties, and tree DP.',
      color: 'amber',
      topics: [
        {
          id: 'top-t-1',
          title: 'Lowest Common Ancestor (LCA)',
          notes: 'Recursive check if target nodes reside in left/right subtrees.',
          difficulty: 'Medium',
          estHours: 2,
          userLearned: true,
          friendLearned: true
        },
        {
          id: 'top-t-2',
          title: 'Serialize and Deserialize Binary Tree',
          notes: 'Preorder traversal with null indicators or level order with queue.',
          difficulty: 'Hard',
          estHours: 3.5,
          userLearned: false,
          friendLearned: false
        },
        {
          id: 'top-t-3',
          title: 'Diameter of Binary Tree',
          notes: 'Longest path between any two nodes. Compute height while updating max.',
          difficulty: 'Easy',
          estHours: 1,
          userLearned: true,
          friendLearned: false
        }
      ]
    }
  ]
};

const STORAGE_KEY = 'aman_study_tracker_state_v1';
const LEGACY_STORAGE_KEY = 'peertrack_collaborative_planner_v2';
const UPSTASH_STORAGE_KEY = 'aman_study_tracker_upstash_v1';
const LEGACY_UPSTASH_KEY = 'peertrack_upstash_config_v2';
const AUTH_USER_KEY = 'aman_study_tracker_auth_user';
const LEGACY_AUTH_KEY = 'peertrack_auth_user';

// ===================================================================
// Main Application Class
// ===================================================================

class AmanStudyTrackerApp {
  constructor() {
    this.state = this.loadState();
    this.currentAuthUser = localStorage.getItem(AUTH_USER_KEY) || localStorage.getItem(LEGACY_AUTH_KEY); // 'user' or 'friend'
    this.isMasterUnlocked = false;

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
    this.checkUrlForCloudPayload();

    // Check auth status
    if (this.currentAuthUser && this.state.profiles[this.currentAuthUser]) {
      this.updateAuthUI();
      this.render();
    } else {
      this.currentAuthUser = null;
      this.renderLoginScreen();
    }
  }

  // Load state from localStorage or use default seed
  loadState() {
    let state = null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        state = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse saved state:', e);
    }

    if (!state || !state.chapters || !state.profiles) {
      state = JSON.parse(JSON.stringify(SEED_DATA_DSA));
    }

    // Ensure profiles & auth exist
    if (!state.profiles) state.profiles = {};
    if (!state.profiles.user) state.profiles.user = { id: 'user', name: 'Shahzeb', initials: 'SH', pin: '1234' };
    if (!state.profiles.friend) state.profiles.friend = { id: 'friend', name: 'Aman', initials: 'AM', pin: '1234' };

    // Migrate old names if default
    if (state.profiles.user.name === 'Alex' || !state.profiles.user.name) {
      state.profiles.user.name = 'Shahzeb';
      state.profiles.user.initials = 'SH';
    }
    if (state.profiles.friend.name === 'Sam' || !state.profiles.friend.name) {
      state.profiles.friend.name = 'Aman';
      state.profiles.friend.initials = 'AM';
    }
    if (!state.profiles.user.pin) state.profiles.user.pin = '1234';
    if (!state.profiles.friend.pin) state.profiles.friend.pin = '1234';

    if (!state.auth) state.auth = { masterKey: 'thekey' };
    if (!state.auth.masterKey) state.auth.masterKey = 'thekey';

    return state;
  }

  // Save current state to localStorage and Upstash
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
    // Auth & Views
    this.loginScreen = document.getElementById('loginScreen');
    this.mainAppLayout = document.getElementById('mainAppLayout');
    this.formLogin = document.getElementById('formLogin');
    this.cardSelectUser = document.getElementById('cardSelectUser');
    this.cardSelectFriend = document.getElementById('cardSelectFriend');
    this.loginNameUser = document.getElementById('loginNameUser');
    this.loginNameFriend = document.getElementById('loginNameFriend');
    this.loginAvatarUser = document.getElementById('loginAvatarUser');
    this.loginAvatarFriend = document.getElementById('loginAvatarFriend');
    this.inputLoginPin = document.getElementById('inputLoginPin');
    this.btnToggleLoginPin = document.getElementById('btnToggleLoginPin');
    this.btnTriggerMasterFromLogin = document.getElementById('btnTriggerMasterFromLogin');

    // Header Elements
    this.headerUserName = document.getElementById('headerUserName');
    this.headerUserAvatar = document.getElementById('headerUserAvatar');
    this.btnLogout = document.getElementById('btnLogout');
    this.btnOpenMasterKeyModal = document.getElementById('btnOpenMasterKeyModal');
    this.btnOpenUpstashModal = document.getElementById('btnOpenUpstashModal');
    this.btnOpenAddChapter = document.getElementById('btnOpenAddChapter');

    // Dashboard Cards
    this.dashAvatarUser = document.getElementById('dashAvatarUser');
    this.dashTagUser = document.getElementById('dashTagUser');
    this.dashNameUser = document.getElementById('dashNameUser');
    this.dashPercentUserBadge = document.getElementById('dashPercentUserBadge');
    this.dashProgressBarUser = document.getElementById('dashProgressBarUser');
    this.dashCountUser = document.getElementById('dashCountUser');
    this.dashUserLead = document.getElementById('dashUserLead');

    this.dashAvatarFriend = document.getElementById('dashAvatarFriend');
    this.dashTagFriend = document.getElementById('dashTagFriend');
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
    this.filterLabelFriendOnly = document.getElementById('filterLabelFriendOnly');
    this.filterLabelUserOnly = document.getElementById('filterLabelUserOnly');
    this.pillCountAll = document.getElementById('pillCountAll');
    this.pillCountFriendOnly = document.getElementById('pillCountFriendOnly');
    this.pillCountUserOnly = document.getElementById('pillCountUserOnly');
    this.pillCountBoth = document.getElementById('pillCountBoth');
    this.pillCountNeither = document.getElementById('pillCountNeither');
    this.btnToggleAllChapters = document.getElementById('btnToggleAllChapters');
    this.btnToggleAllText = document.getElementById('btnToggleAllText');

    this.filterNoticeBanner = document.getElementById('filterNoticeBanner');
    this.filterNoticeText = document.getElementById('filterNoticeText');
    this.btnResetFilter = document.getElementById('btnResetFilter');

    // Main content
    this.chaptersContainer = document.getElementById('chaptersContainer');
    this.emptyStateContainer = document.getElementById('emptyStateContainer');
    this.btnEmptyAddChapter = document.getElementById('btnEmptyAddChapter');

    // Modals
    // Chapter Modal
    this.modalChapter = document.getElementById('modalChapter');
    this.formChapter = document.getElementById('formChapter');
    this.btnCloseModalChapter = document.getElementById('btnCloseModalChapter');
    this.btnCancelChapter = document.getElementById('btnCancelChapter');
    this.inputChapterId = document.getElementById('inputChapterId');
    this.inputChapterTitle = document.getElementById('inputChapterTitle');
    this.inputChapterDescription = document.getElementById('inputChapterDescription');
    this.inputChapterCategory = document.getElementById('inputChapterCategory');
    this.modalChapterTitle = document.getElementById('modalChapterTitle');

    // Topic Modal
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
    this.labelInitialSelf = document.getElementById('labelInitialSelf');
    this.modalTopicTitle = document.getElementById('modalTopicTitle');

    // Master Key Admin Modal
    this.modalMasterKeyAdmin = document.getElementById('modalMasterKeyAdmin');
    this.btnCloseModalMasterKey = document.getElementById('btnCloseModalMasterKey');
    this.formVerifyMasterKey = document.getElementById('formVerifyMasterKey');
    this.inputMasterKeyVerify = document.getElementById('inputMasterKeyVerify');
    this.btnToggleMasterVerifyKey = document.getElementById('btnToggleMasterVerifyKey');
    this.btnCancelMasterKeyVerify = document.getElementById('btnCancelMasterKeyVerify');
    this.masterKeyAdminPanel = document.getElementById('masterKeyAdminPanel');
    this.formSaveUsersAdmin = document.getElementById('formSaveUsersAdmin');
    this.adminAvatarUser = document.getElementById('adminAvatarUser');
    this.adminInputUserName = document.getElementById('adminInputUserName');
    this.adminInputUserPin = document.getElementById('adminInputUserPin');
    this.adminAvatarFriend = document.getElementById('adminAvatarFriend');
    this.adminInputFriendName = document.getElementById('adminInputFriendName');
    this.adminInputFriendPin = document.getElementById('adminInputFriendPin');
    this.adminInputMasterKey = document.getElementById('adminInputMasterKey');
    this.btnCloseMasterAdmin = document.getElementById('btnCloseMasterAdmin');

    // Upstash Cloud Sync Elements
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

    // Bulk CSV Import Modal Elements
    this.btnOpenImportCSV = document.getElementById('btnOpenImportCSV');
    this.btnEmptyImportCSV = document.getElementById('btnEmptyImportCSV');
    this.modalImportCSV = document.getElementById('modalImportCSV');
    this.btnCloseModalCSV = document.getElementById('btnCloseModalCSV');
    this.btnCancelCSV = document.getElementById('btnCancelCSV');
    this.csvDropZone = document.getElementById('csvDropZone');
    this.fileCsvInput = document.getElementById('fileCsvInput');
    this.btnDownloadCsvTemplate = document.getElementById('btnDownloadCsvTemplate');
    this.btnFillSampleCsv = document.getElementById('btnFillSampleCsv');
    this.textCsvInput = document.getElementById('textCsvInput');
    this.btnExecuteCsvImport = document.getElementById('btnExecuteCsvImport');
    this.csvParsedSummary = document.getElementById('csvParsedSummary');
    this.csvSummaryText = document.getElementById('csvSummaryText');

    // Toast Container
    this.toastContainer = document.getElementById('toastContainer');
  }

  // ===================================================================
  // Event Listeners
  // ===================================================================
  attachEvents() {
    // Tab Sync
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

    // Login Form Events
    this.formLogin.addEventListener('submit', (e) => this.handleLoginSubmit(e));

    this.cardSelectUser.addEventListener('click', () => {
      this.cardSelectUser.classList.add('selected');
      this.cardSelectFriend.classList.remove('selected');
    });

    this.cardSelectFriend.addEventListener('click', () => {
      this.cardSelectFriend.classList.add('selected');
      this.cardSelectUser.classList.remove('selected');
    });

    this.btnToggleLoginPin.addEventListener('click', () => {
      const isPass = this.inputLoginPin.type === 'password';
      this.inputLoginPin.type = isPass ? 'text' : 'password';
      this.btnToggleLoginPin.textContent = isPass ? 'Hide' : 'Show';
    });

    this.btnTriggerMasterFromLogin.addEventListener('click', () => {
      this.openMasterKeyModal();
    });

    // Header Logout & Master Key
    this.btnLogout.addEventListener('click', () => this.handleLogout());
    this.btnOpenMasterKeyModal.addEventListener('click', () => this.openMasterKeyModal());

    // Master Key Modal
    this.btnCloseModalMasterKey.addEventListener('click', () => this.modalMasterKeyAdmin.classList.add('hidden'));
    this.btnCancelMasterKeyVerify.addEventListener('click', () => this.modalMasterKeyAdmin.classList.add('hidden'));
    this.btnCloseMasterAdmin.addEventListener('click', () => this.modalMasterKeyAdmin.classList.add('hidden'));
    this.formVerifyMasterKey.addEventListener('submit', (e) => this.handleVerifyMasterKey(e));
    this.formSaveUsersAdmin.addEventListener('submit', (e) => this.handleSaveUsersAdmin(e));

    this.btnToggleMasterVerifyKey.addEventListener('click', () => {
      const isPass = this.inputMasterKeyVerify.type === 'password';
      this.inputMasterKeyVerify.type = isPass ? 'text' : 'password';
      this.btnToggleMasterVerifyKey.textContent = isPass ? 'Hide' : 'Show';
    });

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

    // Keyboard shortcut '/'
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
        this.collapsedChapters.clear();
        this.btnToggleAllText.textContent = 'Collapse All';
      } else {
        allChapterIds.forEach(id => this.collapsedChapters.add(id));
        this.btnToggleAllText.textContent = 'Expand All';
      }
      this.renderChapters();
    });

    // Empty state trigger
    this.btnEmptyAddChapter.addEventListener('click', () => this.openAddChapterModal());

    // Chapter Modal
    this.btnOpenAddChapter.addEventListener('click', () => this.openAddChapterModal());
    this.btnCloseModalChapter.addEventListener('click', () => this.modalChapter.classList.add('hidden'));
    this.btnCancelChapter.addEventListener('click', () => this.modalChapter.classList.add('hidden'));
    this.formChapter.addEventListener('submit', (e) => this.handleSaveChapter(e));

    // Topic Modal
    this.btnCloseModalTopic.addEventListener('click', () => this.modalTopic.classList.add('hidden'));
    this.btnCancelTopic.addEventListener('click', () => this.modalTopic.classList.add('hidden'));
    this.formTopic.addEventListener('submit', (e) => this.handleSaveTopic(e));

    // Upstash Cloud Sync Modal
    this.btnOpenUpstashModal.addEventListener('click', () => this.openUpstashModal());
    this.btnCloseModalUpstash.addEventListener('click', () => this.modalUpstash.classList.add('hidden'));
    this.btnCloseUpstash.addEventListener('click', () => this.modalUpstash.classList.add('hidden'));
    this.formUpstash.addEventListener('submit', (e) => this.handleConnectUpstash(e));
    this.btnPushToUpstash.addEventListener('click', () => this.pushToUpstash(true));
    this.btnPullFromUpstash.addEventListener('click', () => this.pullFromUpstash(true));
    this.btnCopyFriendCloudInvite.addEventListener('click', () => this.copyUpstashInviteLink());
    this.btnDisconnectUpstash.addEventListener('click', () => this.disconnectUpstash());

    this.btnToggleTokenVisibility.addEventListener('click', () => {
      const isPass = this.inputUpstashToken.type === 'password';
      this.inputUpstashToken.type = isPass ? 'text' : 'password';
      this.btnToggleTokenVisibility.textContent = isPass ? 'Hide' : 'Show';
    });

    // CSV Bulk Import Modal Events
    if (this.btnOpenImportCSV) {
      this.btnOpenImportCSV.addEventListener('click', () => this.openCsvModal());
    }
    if (this.btnEmptyImportCSV) {
      this.btnEmptyImportCSV.addEventListener('click', () => this.openCsvModal());
    }
    if (this.btnCloseModalCSV) {
      this.btnCloseModalCSV.addEventListener('click', () => this.modalImportCSV.classList.add('hidden'));
    }
    if (this.btnCancelCSV) {
      this.btnCancelCSV.addEventListener('click', () => this.modalImportCSV.classList.add('hidden'));
    }
    if (this.csvDropZone && this.fileCsvInput) {
      this.csvDropZone.addEventListener('click', () => this.fileCsvInput.click());
      this.fileCsvInput.addEventListener('change', (e) => this.handleCsvFileSelect(e));

      // Drag and drop support
      this.csvDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.csvDropZone.classList.add('dragover');
      });
      this.csvDropZone.addEventListener('dragleave', () => {
        this.csvDropZone.classList.remove('dragover');
      });
      this.csvDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.csvDropZone.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.readCsvFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (this.btnDownloadCsvTemplate) {
      this.btnDownloadCsvTemplate.addEventListener('click', () => this.downloadCsvTemplate());
    }
    if (this.btnFillSampleCsv) {
      this.btnFillSampleCsv.addEventListener('click', () => this.fillSampleCsvData());
    }
    if (this.textCsvInput) {
      this.textCsvInput.addEventListener('input', () => this.updateCsvParsedPreview());
    }
    if (this.btnExecuteCsvImport) {
      this.btnExecuteCsvImport.addEventListener('click', () => this.executeCsvImport());
    }

    // Close modals on overlay backdrop click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.add('hidden');
        }
      });
    });
  }

  // ===================================================================
  // Authentication & Master Key Regulation
  // ===================================================================

  renderLoginScreen() {
    this.loginScreen.classList.remove('hidden');
    this.mainAppLayout.classList.add('hidden');

    const u1 = this.state.profiles.user;
    const u2 = this.state.profiles.friend;

    this.loginNameUser.textContent = u1.name;
    this.loginAvatarUser.textContent = u1.initials || u1.name.slice(0, 2).toUpperCase();

    this.loginNameFriend.textContent = u2.name;
    this.loginAvatarFriend.textContent = u2.initials || u2.name.slice(0, 2).toUpperCase();

    this.inputLoginPin.value = '';
    this.inputLoginPin.focus();
  }

  updateAuthUI() {
    if (!this.currentAuthUser) {
      this.renderLoginScreen();
      return;
    }

    this.loginScreen.classList.add('hidden');
    this.mainAppLayout.classList.remove('hidden');

    const profile = this.currentAuthUser === 'user' ? this.state.profiles.user : this.state.profiles.friend;
    this.headerUserName.textContent = `${profile.name} (You)`;
    this.headerUserAvatar.textContent = profile.initials || profile.name.slice(0, 2).toUpperCase();
    this.headerUserAvatar.className = `persona-avatar ${this.currentAuthUser === 'user' ? 'user-avatar' : 'friend-avatar'}`;
  }

  handleLoginSubmit(e) {
    e.preventDefault();
    const chosenUser = document.querySelector('input[name="loginUserChoice"]:checked')?.value || 'user';
    const enteredPin = this.inputLoginPin.value.trim();

    const targetProfile = this.state.profiles[chosenUser];
    const expectedPin = targetProfile?.pin || '1234';

    if (enteredPin === expectedPin) {
      this.currentAuthUser = chosenUser;
      localStorage.setItem(AUTH_USER_KEY, chosenUser);
      this.updateAuthUI();
      this.render();
      this.showToast(`Logged in as ${targetProfile.name}!`, 'success');
    } else {
      this.showToast('Incorrect passcode. Default is "1234", or use Master Key to regulate.', 'warning');
    }
  }

  handleLogout() {
    this.currentAuthUser = null;
    localStorage.removeItem(AUTH_USER_KEY);
    this.updateAuthUI();
    this.showToast('Logged out.', 'info');
  }

  openMasterKeyModal() {
    this.modalMasterKeyAdmin.classList.remove('hidden');
    if (this.isMasterUnlocked) {
      this.formVerifyMasterKey.classList.add('hidden');
      this.masterKeyAdminPanel.classList.remove('hidden');
      this.populateMasterKeyAdmin();
    } else {
      this.formVerifyMasterKey.classList.remove('hidden');
      this.masterKeyAdminPanel.classList.add('hidden');
      this.inputMasterKeyVerify.value = '';
      this.inputMasterKeyVerify.focus();
    }
  }

  handleVerifyMasterKey(e) {
    e.preventDefault();
    const entered = this.inputMasterKeyVerify.value.trim();
    const expected = this.state.auth?.masterKey || 'thekey';

    if (entered === expected) {
      this.isMasterUnlocked = true;
      this.formVerifyMasterKey.classList.add('hidden');
      this.masterKeyAdminPanel.classList.remove('hidden');
      this.populateMasterKeyAdmin();
      this.showToast('Master Key verified! You can now regulate users.', 'success');
    } else {
      this.showToast('Invalid Master Key. Default is "thekey"', 'warning');
    }
  }

  populateMasterKeyAdmin() {
    this.adminInputUserName.value = this.state.profiles.user.name;
    this.adminInputUserPin.value = this.state.profiles.user.pin || '1234';
    this.adminInputFriendName.value = this.state.profiles.friend.name;
    this.adminInputFriendPin.value = this.state.profiles.friend.pin || '1234';
    this.adminInputMasterKey.value = this.state.auth?.masterKey || 'thekey';

    this.adminAvatarUser.textContent = this.state.profiles.user.initials || 'SH';
    this.adminAvatarFriend.textContent = this.state.profiles.friend.initials || 'AM';
  }

  handleSaveUsersAdmin(e) {
    e.preventDefault();
    const uName = this.adminInputUserName.value.trim();
    const uPin = this.adminInputUserPin.value.trim();
    const fName = this.adminInputFriendName.value.trim();
    const fPin = this.adminInputFriendPin.value.trim();
    const mKey = this.adminInputMasterKey.value.trim();

    if (!uName || !fName || !uPin || !fPin || !mKey) {
      this.showToast('All fields are required.', 'warning');
      return;
    }

    this.state.profiles.user.name = uName;
    this.state.profiles.user.initials = uName.slice(0, 2).toUpperCase();
    this.state.profiles.user.pin = uPin;

    this.state.profiles.friend.name = fName;
    this.state.profiles.friend.initials = fName.slice(0, 2).toUpperCase();
    this.state.profiles.friend.pin = fPin;

    if (!this.state.auth) this.state.auth = {};
    this.state.auth.masterKey = mKey;

    this.saveState();
    this.modalMasterKeyAdmin.classList.add('hidden');
    this.renderLoginScreen();
    if (this.currentAuthUser) {
      this.updateAuthUI();
    }
    this.showToast('Users & Master Key updated and saved!', 'success');
  }

  // ===================================================================
  // Calculations & Analytics
  // ===================================================================
  getStats() {
    let totalTopics = 0;
    let userCount = 0;
    let friendCount = 0;
    let friendOnlyCount = 0;
    let userOnlyCount = 0;
    let bothCount = 0;
    let neitherCount = 0;

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
    const isFriendActive = this.currentAuthUser === 'friend';

    if (isFriendActive) {
      // Primary card shows Aman ("You")
      this.dashAvatarUser.textContent = friend.initials || 'AM';
      this.dashNameUser.textContent = friend.name;
      this.dashTagUser.textContent = 'You';

      // Secondary card shows Shahzeb ("Partner")
      this.dashAvatarFriend.textContent = user.initials || 'SH';
      this.dashNameFriend.textContent = user.name;
      this.dashTagFriend.textContent = 'Partner';

      this.dashFriendShortName.textContent = user.name;
      this.dashFriendShortName2.textContent = user.name;

      this.filterLabelFriendOnly.textContent = `${user.name} Understood, I Haven't`;
      this.filterLabelUserOnly.textContent = `I Understood, ${user.name} Hasn't`;
    } else {
      // Primary card shows Shahzeb ("You")
      this.dashAvatarUser.textContent = user.initials || 'SH';
      this.dashNameUser.textContent = user.name;
      this.dashTagUser.textContent = 'You';

      // Secondary card shows Aman ("Partner")
      this.dashAvatarFriend.textContent = friend.initials || 'AM';
      this.dashNameFriend.textContent = friend.name;
      this.dashTagFriend.textContent = 'Partner';

      this.dashFriendShortName.textContent = friend.name;
      this.dashFriendShortName2.textContent = friend.name;

      this.filterLabelFriendOnly.textContent = `${friend.name} Understood, I Haven't`;
      this.filterLabelUserOnly.textContent = `I Understood, ${friend.name} Hasn't`;
    }
  }

  updateStatsUI() {
    const stats = this.getStats();
    const isFriendActive = this.currentAuthUser === 'friend';

    // Adapt stats to current authenticated user
    const primaryPercent = isFriendActive ? stats.friendPercent : stats.userPercent;
    const primaryCount = isFriendActive ? stats.friendCount : stats.userCount;
    const primaryLead = isFriendActive ? stats.friendLead : stats.userLead;

    const partnerPercent = isFriendActive ? stats.userPercent : stats.friendPercent;
    const partnerCount = isFriendActive ? stats.userCount : stats.friendCount;
    const partnerLead = isFriendActive ? stats.userLead : stats.friendLead;

    // Card 1: Logged-in User
    this.dashPercentUserBadge.textContent = `${primaryPercent}%`;
    this.dashProgressBarUser.style.width = `${primaryPercent}%`;
    this.dashCountUser.textContent = `${primaryCount} / ${stats.totalTopics}`;
    this.dashUserLead.textContent = `+${primaryLead}`;

    // Card 3: Study Partner
    this.dashPercentFriendBadge.textContent = `${partnerPercent}%`;
    this.dashProgressBarFriend.style.width = `${partnerPercent}%`;
    this.dashCountFriend.textContent = `${partnerCount} / ${stats.totalTopics}`;
    this.dashFriendLead.textContent = `+${partnerLead}`;

    // Gap Card metrics
    const partnerOnlyDone = isFriendActive ? stats.userOnlyCount : stats.friendOnlyCount;
    const selfOnlyDone = isFriendActive ? stats.friendOnlyCount : stats.userOnlyCount;

    this.countFriendOnly.textContent = partnerOnlyDone;
    this.countUserOnly.textContent = selfOnlyDone;
    this.countBoth.textContent = stats.bothCount;

    // Filter pills counters
    this.pillCountAll.textContent = stats.totalTopics;
    this.pillCountFriendOnly.textContent = partnerOnlyDone;
    this.pillCountUserOnly.textContent = selfOnlyDone;
    this.pillCountBoth.textContent = stats.bothCount;
    this.pillCountNeither.textContent = stats.neitherCount;
  }

  setFilter(filterName) {
    this.activeFilter = filterName;

    // Update filter pill UI
    this.filterPillsContainer.querySelectorAll('.filter-pill').forEach(pill => {
      pill.classList.toggle('active', pill.getAttribute('data-filter') === filterName);
    });

    // Update banner
    if (filterName === 'all') {
      this.filterNoticeBanner.classList.add('hidden');
    } else {
      this.filterNoticeBanner.classList.remove('hidden');
      const { user, friend } = this.state.profiles;
      const isFriend = this.currentAuthUser === 'friend';
      const selfName = isFriend ? friend.name : user.name;
      const partnerName = isFriend ? user.name : friend.name;

      let msg = '';
      if (filterName === 'friend-only') msg = `Showing topics ${partnerName} mastered that ${selfName} needs to learn 💡`;
      if (filterName === 'user-only') msg = `Showing topics ${selfName} mastered that ${partnerName} needs 🚀`;
      if (filterName === 'both-done') msg = 'Showing topics both of you have mastered ✨';
      if (filterName === 'neither-done') msg = 'Showing topics pending for both study partners ⏳';
      this.filterNoticeText.textContent = msg;
    }

    this.renderChapters();
  }

  // ===================================================================
  // Chapter & Topic Rendering
  // ===================================================================
  renderChapters() {
    this.chaptersContainer.innerHTML = '';
    const filteredChapters = this.getFilteredChapters();

    if (this.state.chapters.length === 0) {
      this.emptyStateContainer.classList.remove('hidden');
      this.chaptersContainer.classList.add('hidden');
      return;
    }

    this.emptyStateContainer.classList.add('hidden');
    this.chaptersContainer.classList.remove('hidden');

    if (filteredChapters.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-chapter-topics';
      emptyDiv.innerHTML = `<p>No topics match your current filter or search criteria.</p>`;
      this.chaptersContainer.appendChild(emptyDiv);
      return;
    }

    filteredChapters.forEach(chapter => {
      const chapterCard = this.createChapterCard(chapter);
      this.chaptersContainer.appendChild(chapterCard);
    });
  }

  getFilteredChapters() {
    return this.state.chapters
      .map(chapter => {
        let matchingTopics = (chapter.topics || []).filter(topic => {
          // Search query match
          if (this.searchQuery) {
            const inTopic = topic.title.toLowerCase().includes(this.searchQuery);
            const inNotes = (topic.notes || '').toLowerCase().includes(this.searchQuery);
            const inChap = chapter.title.toLowerCase().includes(this.searchQuery);
            if (!inTopic && !inNotes && !inChap) return false;
          }

          // Filter match (adapted to who is currently logged in)
          const isFriend = this.currentAuthUser === 'friend';
          const partnerLearned = isFriend ? topic.userLearned : topic.friendLearned;
          const selfLearned = isFriend ? topic.friendLearned : topic.userLearned;

          if (this.activeFilter === 'friend-only') {
            return partnerLearned && !selfLearned;
          }
          if (this.activeFilter === 'user-only') {
            return selfLearned && !partnerLearned;
          }
          if (this.activeFilter === 'both-done') {
            return selfLearned && partnerLearned;
          }
          if (this.activeFilter === 'neither-done') {
            return !selfLearned && !partnerLearned;
          }

          return true;
        });

        const chapUserDone = (chapter.topics || []).filter(t => t.userLearned).length;
        const chapFriendDone = (chapter.topics || []).filter(t => t.friendLearned).length;

        return {
          ...chapter,
          topics: matchingTopics,
          totalTopicsCount: (chapter.topics || []).length,
          userDoneCount: chapUserDone,
          friendDoneCount: chapFriendDone
        };
      })
      .filter(chap => chap.topics.length > 0 || !this.searchQuery && this.activeFilter === 'all');
  }

  createChapterCard(chapter) {
    const isCollapsed = this.collapsedChapters.has(chapter.id);
    const { user, friend } = this.state.profiles;

    const userPercent = chapter.totalTopicsCount > 0 ? Math.round((chapter.userDoneCount / chapter.totalTopicsCount) * 100) : 0;
    const friendPercent = chapter.totalTopicsCount > 0 ? Math.round((chapter.friendDoneCount / chapter.totalTopicsCount) * 100) : 0;

    const card = document.createElement('article');
    card.className = `chapter-card theme-${chapter.color || 'indigo'}`;
    card.dataset.chapterId = chapter.id;

    card.innerHTML = `
      <div class="chapter-header" data-action="toggle-chapter">
        <div class="chapter-title-group">
          <button type="button" class="btn-collapse" aria-label="Toggle chapter topics" aria-expanded="${!isCollapsed}">
            <svg class="chevron-icon ${isCollapsed ? 'collapsed' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div class="chapter-meta">
            <div class="chapter-title-line">
              <h3 class="chapter-title">${this.escapeHtml(chapter.title)}</h3>
              ${chapter.category ? `<span class="badge-category">${this.escapeHtml(chapter.category)}</span>` : ''}
              <span class="topic-count-tag">${chapter.topics.length} topic${chapter.topics.length === 1 ? '' : 's'}</span>
            </div>
            ${chapter.description ? `<p class="chapter-desc">${this.escapeHtml(chapter.description)}</p>` : ''}
          </div>
        </div>

        <div class="chapter-progress-actions">
          <div class="chapter-dual-progress">
            <div class="mini-progress-row" title="${this.escapeHtml(user.name)}: ${chapter.userDoneCount}/${chapter.totalTopicsCount} completed">
              <span class="mini-label">${this.escapeHtml(user.name)}</span>
              <div class="mini-track">
                <div class="mini-fill fill-user" style="width: ${userPercent}%"></div>
              </div>
              <span class="mini-percent">${userPercent}%</span>
            </div>
            <div class="mini-progress-row" title="${this.escapeHtml(friend.name)}: ${chapter.friendDoneCount}/${chapter.totalTopicsCount} completed">
              <span class="mini-label">${this.escapeHtml(friend.name)}</span>
              <div class="mini-track">
                <div class="mini-fill fill-friend" style="width: ${friendPercent}%"></div>
              </div>
              <span class="mini-percent">${friendPercent}%</span>
            </div>
          </div>

          <div class="chapter-actions-group">
            <button type="button" class="btn btn-secondary btn-sm" data-action="add-topic" title="Add topic to this chapter">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Add Topic</span>
            </button>
            <button type="button" class="btn-icon-subtle" data-action="edit-chapter" title="Edit chapter">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button type="button" class="btn-icon-subtle btn-delete" data-action="delete-chapter" title="Delete chapter">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="topics-list ${isCollapsed ? 'hidden' : ''}">
        <!-- Topics rendered here -->
      </div>
    `;

    const topicsListContainer = card.querySelector('.topics-list');

    if (chapter.topics.length === 0) {
      const emptyTopic = document.createElement('div');
      emptyTopic.className = 'empty-chapter-topics';
      emptyTopic.innerHTML = `<span>No topics yet. Click "+ Add Topic" above to add your first sub-chapter!</span>`;
      topicsListContainer.appendChild(emptyTopic);
    } else {
      chapter.topics.forEach(topic => {
        const topicRow = this.createTopicRow(chapter, topic);
        topicsListContainer.appendChild(topicRow);
      });
    }

    // Event listeners on chapter header
    card.querySelector('[data-action="toggle-chapter"]').addEventListener('click', (e) => {
      if (e.target.closest('.chapter-actions-group') || e.target.closest('button')) {
        return;
      }
      this.toggleChapterCollapse(chapter.id);
    });

    card.querySelector('.btn-collapse').addEventListener('click', () => {
      this.toggleChapterCollapse(chapter.id);
    });

    card.querySelector('[data-action="add-topic"]').addEventListener('click', () => {
      this.openAddTopicModal(chapter.id, chapter.title);
    });

    card.querySelector('[data-action="edit-chapter"]').addEventListener('click', () => {
      this.openEditChapterModal(chapter);
    });

    card.querySelector('[data-action="delete-chapter"]').addEventListener('click', () => {
      this.deleteChapter(chapter.id);
    });

    return card;
  }

  toggleChapterCollapse(chapterId) {
    if (this.collapsedChapters.has(chapterId)) {
      this.collapsedChapters.delete(chapterId);
    } else {
      this.collapsedChapters.add(chapterId);
    }
    this.renderChapters();
  }

  // ===================================================================
  // Topic Row Rendering with Locked Access Check
  // ===================================================================
  createTopicRow(chapter, topic) {
    const { user, friend } = this.state.profiles;
    const row = document.createElement('div');
    row.className = 'topic-row';
    row.dataset.topicId = topic.id;

    // Determine Gap Badge
    let gapBadgeHtml = '';
    if (topic.friendLearned && !topic.userLearned) {
      gapBadgeHtml = `<span class="gap-tag tag-friend-only" title="${this.escapeHtml(friend.name)} understood this, ${this.escapeHtml(user.name)} needs to learn">💡 ${this.escapeHtml(friend.name)} Mastered</span>`;
    } else if (topic.userLearned && !topic.friendLearned) {
      gapBadgeHtml = `<span class="gap-tag tag-user-only" title="${this.escapeHtml(user.name)} understood this, ${this.escapeHtml(friend.name)} needs to learn">🚀 ${this.escapeHtml(user.name)} Mastered</span>`;
    } else if (topic.userLearned && topic.friendLearned) {
      gapBadgeHtml = `<span class="gap-tag tag-both" title="Both understood this topic">✨ Both Understood</span>`;
    } else {
      gapBadgeHtml = `<span class="gap-tag tag-neither" title="Pending for both">⏳ Both Pending</span>`;
    }

    // CRITICAL SECURITY & REGULATION:
    // Only Shahzeb can mark his checkmark. Only Aman can mark his checkmark.
    const isUserActive = this.currentAuthUser === 'user';
    const isFriendActive = this.currentAuthUser === 'friend';

    const canEditUser = isUserActive;
    const canEditFriend = isFriendActive;

    const userLockNotice = canEditUser
      ? `Click to toggle understood for ${this.escapeHtml(user.name)}`
      : `🔒 Locked: Only ${this.escapeHtml(user.name)} can mark this`;

    const friendLockNotice = canEditFriend
      ? `Click to toggle understood for ${this.escapeHtml(friend.name)}`
      : `🔒 Locked: Only ${this.escapeHtml(friend.name)} can mark this`;

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
          <!-- Toggle for User (Shahzeb) -->
          <div class="learner-toggle ${topic.userLearned ? 'active-user' : ''} ${!canEditUser ? 'locked' : ''}" 
               data-learner="user" 
               title="${userLockNotice}">
            <div class="toggle-box">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span>${this.escapeHtml(user.name)} ${isUserActive ? '(You)' : ''}</span>
            ${!canEditUser ? `<span class="lock-icon" title="Only ${this.escapeHtml(user.name)} can mark this">🔒</span>` : ''}
          </div>

          <!-- Toggle for Friend (Aman) -->
          <div class="learner-toggle ${topic.friendLearned ? 'active-friend' : ''} ${!canEditFriend ? 'locked' : ''}" 
               data-learner="friend" 
               title="${friendLockNotice}">
            <div class="toggle-box">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span>${this.escapeHtml(friend.name)} ${isFriendActive ? '(You)' : ''}</span>
            ${!canEditFriend ? `<span class="lock-icon" title="Only ${this.escapeHtml(friend.name)} can mark this">🔒</span>` : ''}
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
  // Chapter & Topic CRUD with Access Check
  // ===================================================================
  toggleTopicLearner(chapterId, topicId, learner) {
    // CRITICAL ACCESS REGULATION:
    // Only the authenticated user can toggle their own status!
    if (this.currentAuthUser !== learner) {
      const allowedName = learner === 'user' ? this.state.profiles.user.name : this.state.profiles.friend.name;
      this.showToast(`🔒 Locked: Only ${allowedName} can mark their own completion!`, 'warning');
      return;
    }

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
      this.showToast(`Marked "${topic.title}" as completed by ${learnerName}!`, 'success');
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
    const color = document.querySelector('input[name="chapterColor"]:checked')?.value || 'indigo';

    if (!title) return;

    if (id) {
      const chapter = this.state.chapters.find(c => c.id === id);
      if (chapter) {
        chapter.title = title;
        chapter.description = description;
        chapter.category = category;
        chapter.color = color;
        this.showToast(`Chapter "${title}" updated!`, 'success');
      }
    } else {
      const newChapter = {
        id: 'chap-' + Date.now(),
        title,
        description,
        category,
        color,
        topics: []
      };
      this.state.chapters.push(newChapter);
      this.showToast(`Added new chapter "${title}"!`, 'success');
    }

    this.saveState();
    this.modalChapter.classList.add('hidden');
  }

  deleteChapter(chapterId) {
    const chapter = this.state.chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    if (confirm(`Are you sure you want to delete chapter "${chapter.title}" and all its topics?`)) {
      this.state.chapters = this.state.chapters.filter(c => c.id !== chapterId);
      this.collapsedChapters.delete(chapterId);
      this.saveState();
      this.showToast(`Deleted chapter "${chapter.title}".`, 'info');
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
    this.inputTopicEstTime.value = '2';

    // Current user can only set their own initial mark
    const isFriend = this.currentAuthUser === 'friend';
    const profile = isFriend ? this.state.profiles.friend : this.state.profiles.user;
    this.labelInitialSelf.textContent = profile.name;
    this.checkInitialUserLearned.checked = false;

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
    this.inputTopicEstTime.value = topic.estHours || '2';

    const isFriend = this.currentAuthUser === 'friend';
    const profile = isFriend ? this.state.profiles.friend : this.state.profiles.user;
    this.labelInitialSelf.textContent = profile.name;
    this.checkInitialUserLearned.checked = isFriend ? !!topic.friendLearned : !!topic.userLearned;

    this.modalTopic.classList.remove('hidden');
    this.inputTopicTitle.focus();
  }

  handleSaveTopic(e) {
    e.preventDefault();
    const chapterId = this.inputTopicChapterId.value;
    const existingTopicId = this.inputTopicId.value;
    const title = this.inputTopicTitle.value.trim();
    const notes = this.inputTopicNotes.value.trim();
    const difficulty = this.selectTopicDifficulty.value;
    const estHours = parseFloat(this.inputTopicEstTime.value) || 1;

    if (!title) return;

    const chapter = this.state.chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    const isFriend = this.currentAuthUser === 'friend';
    const selfLearned = this.checkInitialUserLearned.checked;

    if (existingTopicId) {
      const topic = chapter.topics.find(t => t.id === existingTopicId);
      if (topic) {
        topic.title = title;
        topic.notes = notes;
        topic.difficulty = difficulty;
        topic.estHours = estHours;
        // Only update current user's learned status
        if (isFriend) {
          topic.friendLearned = selfLearned;
        } else {
          topic.userLearned = selfLearned;
        }
        this.showToast(`Updated topic "${title}"!`, 'success');
      }
    } else {
      const newTopic = {
        id: 'top-' + Date.now(),
        title,
        notes,
        difficulty,
        estHours,
        userLearned: !isFriend && selfLearned,
        friendLearned: isFriend && selfLearned
      };
      chapter.topics.push(newTopic);
      this.showToast(`Added topic "${title}"!`, 'success');
    }

    this.saveState();
    this.modalTopic.classList.add('hidden');
  }

  deleteTopic(chapterId, topicId) {
    const chapter = this.state.chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    const topic = chapter.topics.find(t => t.id === topicId);
    if (!topic) return;

    if (confirm(`Delete topic "${topic.title}"?`)) {
      chapter.topics = chapter.topics.filter(t => t.id !== topicId);
      this.saveState();
      this.showToast(`Deleted "${topic.title}".`, 'info');
    }
  }

  // ===================================================================
  // Upstash Redis Cloud Sync (REST API & Vercel Proxy)
  // ===================================================================
  loadUpstashConfig() {
    try {
      const saved = localStorage.getItem(UPSTASH_STORAGE_KEY) || localStorage.getItem(LEGACY_UPSTASH_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse Upstash config:', e);
    }
    return {
      url: '',
      token: '',
      roomId: 'study-duo-room-1',
      autoSync: true,
      pollInterval: 10000,
      isConnected: false,
      lastSyncedAt: null,
      useServerProxy: false
    };
  }

  saveUpstashConfig() {
    try {
      localStorage.setItem(UPSTASH_STORAGE_KEY, JSON.stringify(this.upstash));
    } catch (e) {
      console.error('Failed to save Upstash config:', e);
    }
  }

  initUpstash() {
    this.updateUpstashStatusUI();

    // Check if Vercel serverless proxy is available
    this.detectVercelAPI();

    if (this.upstash.isConnected) {
      this.startSyncPolling();
      this.pullFromUpstash(false);
    }
  }

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
          this.showToast('Connected to Upstash Cloud via Vercel proxy!', 'success');
        }
      }
    } catch (e) {
      // Offline or local
    }
  }

  updateUpstashStatusUI(syncState = null) {
    const isConn = !!this.upstash.isConnected;

    if (this.cloudStatusDot) {
      this.cloudStatusDot.className = 'cloud-status-indicator ' + 
        (syncState === 'syncing' ? 'status-syncing' : (isConn ? 'status-connected' : 'status-offline'));
    }
    if (this.cloudStatusLabel) {
      this.cloudStatusLabel.textContent = syncState === 'syncing' 
        ? 'Syncing...' 
        : (isConn ? 'Cloud Live 🟢' : 'Upstash Cloud');
    }

    if (this.upstashStatusBanner) {
      this.upstashStatusBanner.className = 'cloud-status-banner ' + 
        (isConn ? 'status-banner-connected' : 'status-banner-disconnected');
    }
    if (this.bannerStatusDot) {
      this.bannerStatusDot.className = 'status-pulse-dot ' + (isConn ? 'dot-live' : '');
    }
    if (this.bannerStatusTitle) {
      this.bannerStatusTitle.textContent = isConn 
        ? `Connected to Room: ${this.upstash.roomId || 'default'}`
        : 'Cloud Sync Disconnected';
    }
    if (this.bannerStatusSub) {
      this.bannerStatusSub.textContent = isConn
        ? 'Changes automatically sync across both devices in real-time.'
        : 'Currently storing progress locally in your browser.';
    }
    if (this.bannerLastSyncText) {
      this.bannerLastSyncText.textContent = this.upstash.lastSyncedAt
        ? `Synced ${new Date(this.upstash.lastSyncedAt).toLocaleTimeString()}`
        : '—';
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

  async handleConnectUpstash(e) {
    e.preventDefault();
    const url = this.inputUpstashUrl.value.trim().replace(/\/+$/, '');
    const token = this.inputUpstashToken.value.trim();
    const roomId = this.inputTopicClean(this.inputUpstashRoom.value.trim()) || 'study-duo-room-1';
    const pollInterval = this.selectSyncInterval.value === 'manual' ? 0 : parseInt(this.selectSyncInterval.value, 10);
    const autoSync = this.checkUpstashAutoSync.checked;

    if (!url || !token) {
      this.showToast('Please provide both Upstash URL and Token.', 'warning');
      return;
    }

    this.showToast('Testing Upstash connection...', 'info');

    try {
      const testRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['PING'])
      });

      if (!testRes.ok) {
        throw new Error(`Upstash returned HTTP ${testRes.status}`);
      }

      const pingData = await testRes.json();
      if (pingData.error) {
        throw new Error(pingData.error);
      }

      this.upstash.url = url;
      this.upstash.token = token;
      this.upstash.roomId = roomId;
      this.upstash.pollInterval = pollInterval;
      this.upstash.autoSync = autoSync;
      this.upstash.isConnected = true;
      this.upstash.useServerProxy = false;
      this.saveUpstashConfig();

      this.startSyncPolling();
      await this.pullFromUpstash(false);
      this.updateUpstashStatusUI();

      this.showToast('Successfully connected to Upstash Redis!', 'success');
      this.modalUpstash.classList.add('hidden');
    } catch (err) {
      console.error('Upstash connection error:', err);
      this.showToast(`Connection failed: ${err.message}`, 'warning');
    }
  }

  disconnectUpstash() {
    this.stopSyncPolling();
    this.upstash.isConnected = false;
    this.upstash.useServerProxy = false;
    this.saveUpstashConfig();
    this.updateUpstashStatusUI();
    this.showToast('Disconnected from Upstash Cloud.', 'info');
  }

  triggerAutoPush() {
    clearTimeout(this.autoPushTimer);
    this.autoPushTimer = setTimeout(() => {
      this.pushToUpstash(false);
    }, 800);
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
        res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: this.upstash.roomId, payload })
        });
      } else {
        res = await fetch(this.upstash.url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.upstash.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(['SET', `aman_study_tracker:${this.upstash.roomId}`, JSON.stringify(payload)])
        });
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      this.upstash.lastSyncedAt = Date.now();
      this.saveUpstashConfig();
      this.updateUpstashStatusUI();

      if (notify) {
        this.showToast('Saved latest study progress to Upstash!', 'success');
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
        const res = await fetch('/api/sync?room=' + encodeURIComponent(this.upstash.roomId));
        if (res.ok) {
          data = await res.json();
          if (data.result) {
            data = { result: data.result };
          }
        }
      } else {
        const res = await fetch(this.upstash.url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.upstash.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(['GET', `aman_study_tracker:${this.upstash.roomId}`])
        });
        if (res.ok) {
          data = await res.json();
          if (!data.result) {
            const legRes = await fetch(this.upstash.url, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.upstash.token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(['GET', `peertrack:${this.upstash.roomId}`])
            });
            if (legRes.ok) {
              const legData = await legRes.json();
              if (legData.result) data = legData;
            }
          }
        }
      }


      if (data && data.result) {
        const remote = JSON.parse(data.result);
        if (remote && remote.state && remote.updatedAt > this.lastRemoteUpdatedAt) {
          this.lastRemoteUpdatedAt = remote.updatedAt;

          // Merge chapters and topics safely
          this.state = remote.state;
          this.saveStateLocallyWithoutPush();
          this.updateProfilesUI();
          this.render();

          if (notify) {
            this.showToast('Pulled latest progress from cloud!', 'success');
          }
        }
      } else if (data && !data.result) {
        // Cloud is empty, push our local state to initialize it
        this.pushToUpstash(false);
      }

      this.upstash.lastSyncedAt = Date.now();
      this.saveUpstashConfig();
      this.updateUpstashStatusUI();
    } catch (err) {
      console.warn('Pull from Upstash failed:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  startSyncPolling() {
    this.stopSyncPolling();
    const interval = this.upstash.pollInterval || 10000;
    if (interval > 0) {
      this.syncPollTimer = setInterval(() => {
        this.pullFromUpstash(false);
      }, interval);
    }
  }

  stopSyncPolling() {
    if (this.syncPollTimer) {
      clearInterval(this.syncPollTimer);
      this.syncPollTimer = null;
    }
  }

  copyUpstashInviteLink() {
    if (!this.upstash.roomId) {
      this.showToast('Configure a room first.', 'warning');
      return;
    }

    const payloadObj = {
      room: this.upstash.roomId
    };
    if (!this.upstash.useServerProxy && this.upstash.url && this.upstash.token) {
      payloadObj.u = this.upstash.url;
      payloadObj.t = this.upstash.token;
    }

    const encoded = encodeURIComponent(JSON.stringify(payloadObj));
    const inviteUrl = `${window.location.origin}${window.location.pathname}#cloud=${encoded}`;

    navigator.clipboard.writeText(inviteUrl).then(() => {
      this.showToast('Partner invite link copied to clipboard!', 'success');
    }).catch(() => {
      prompt('Copy this invite link for your partner:', inviteUrl);
    });
  }

  checkUrlForCloudPayload() {
    if (!window.location.hash.startsWith('#cloud=')) return;
    try {
      const raw = decodeURIComponent(window.location.hash.slice(7));
      const payload = JSON.parse(raw);
      if (payload.room) {
        this.upstash.roomId = payload.room;
        if (payload.u && payload.t) {
          this.upstash.url = payload.u;
          this.upstash.token = payload.t;
        }
        this.upstash.isConnected = true;
        this.saveUpstashConfig();
        this.startSyncPolling();
        this.pullFromUpstash(false);
        this.showToast(`Joined shared cloud room: "${payload.room}"!`, 'success');
      }
      history.replaceState(null, '', window.location.pathname);
    } catch (e) {
      console.warn('Invalid cloud link:', e);
    }
  }

  // ===================================================================
  // Bulk CSV Import System
  // ===================================================================

  openCsvModal() {
    if (!this.modalImportCSV) return;
    this.modalImportCSV.classList.remove('hidden');
    if (this.textCsvInput) {
      this.updateCsvParsedPreview();
      this.textCsvInput.focus();
    }
  }

  handleCsvFileSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (file) {
      this.readCsvFile(file);
    }
  }

  readCsvFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target.result;
      if (this.textCsvInput) {
        this.textCsvInput.value = content;
        this.updateCsvParsedPreview();
        this.showToast(`Loaded ${file.name} successfully!`, 'success');
      }
    };
    reader.onerror = () => {
      this.showToast('Failed to read CSV file.', 'danger');
    };
    reader.readAsText(file);
  }

  downloadCsvTemplate() {
    const csvContent = [
      'Chapter,Topic,Difficulty,EstHours,Notes',
      'Dynamic Programming,0/1 Knapsack,Medium,3,Standard 2D DP table memoization',
      'Dynamic Programming,Longest Common Subsequence,Medium,2.5,Matrix diagonal transition',
      'Dynamic Programming,Matrix Chain Multiplication,Hard,4,Interval DP with partition k',
      'Graph Theory,Breadth First Search (BFS),Easy,1.5,Queue traversal with visited array',
      'Graph Theory,Dijkstra Shortest Path,Medium,3,Priority Queue min-heap traversal',
      'Binary Trees,Lowest Common Ancestor,Medium,2,Recursive tree path comparison',
      'Operating Systems,Process Scheduling Algorithms,Easy,2,FCFS SJF Round Robin analysis',
      'Operating Systems,Deadlock & Banker Algorithm,Hard,3.5,Resource allocation graph'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'aman_study_tracker_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.showToast('Downloaded sample CSV template!', 'info');
  }

  fillSampleCsvData() {
    const sample = [
      'Chapter,Topic,Difficulty,EstHours,Notes',
      'Dynamic Programming,0/1 Knapsack,Medium,3,Standard 2D DP array',
      'Dynamic Programming,Longest Common Subsequence,Medium,2.5,Matrix diagonal transition',
      'Dynamic Programming,Coin Change Problem,Medium,2,Unbounded knapsack base case',
      'Graph Theory,BFS & Shortest Path,Easy,1.5,Queue traversal with visited set',
      'Graph Theory,Dijkstra Algorithm,Medium,3,Min-heap priority queue',
      'Graph Theory,Topological Sort,Medium,2,Kahn algorithm and DFS ordering',
      'System Design,Consistent Hashing,Medium,2.5,Virtual nodes distribution',
      'System Design,Rate Limiting Algorithms,Hard,3,Token bucket and Leaky bucket'
    ].join('\n');

    if (this.textCsvInput) {
      this.textCsvInput.value = sample;
      this.updateCsvParsedPreview();
      this.showToast('Sample syllabus pasted! Review and click Import.', 'info');
    }
  }

  parseCsvData(rawText) {
    if (!rawText || !rawText.trim()) return [];

    // Robust CSV parser supporting quotes and standard separators
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return [];

    // Parse a line into cells taking quotes into account
    const parseLine = (line) => {
      const cells = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === '\t' || char === ';') && !inQuotes) {
          cells.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      cells.push(current.trim());
      return cells.map(c => c.replace(/^["']|["']$/g, '').trim());
    };

    const firstCells = parseLine(lines[0]).map(c => c.toLowerCase());
    let startIndex = 0;
    let colChapter = 0;
    let colTopic = 1;
    let colDifficulty = -1;
    let colEstHours = -1;
    let colNotes = -1;

    // Check if first line is a header
    const hasHeader = firstCells.some(c => c.includes('chap') || c.includes('topic') || c.includes('subject'));
    if (hasHeader) {
      startIndex = 1;
      firstCells.forEach((c, idx) => {
        if (c.includes('chap') || c.includes('subject') || c.includes('module')) colChapter = idx;
        else if (c.includes('topic') || c.includes('subtopic') || c.includes('concept') || c.includes('title')) colTopic = idx;
        else if (c.includes('diff') || c.includes('level')) colDifficulty = idx;
        else if (c.includes('hour') || c.includes('time') || c.includes('est')) colEstHours = idx;
        else if (c.includes('note') || c.includes('desc') || c.includes('formula')) colNotes = idx;
      });
    }

    const rows = [];
    for (let i = startIndex; i < lines.length; i++) {
      const cells = parseLine(lines[i]);
      if (cells.length < 1) continue;

      const chapterName = cells[colChapter] || 'General Syllabus';
      const topicName = cells[colTopic] || cells[0] || '';
      if (!topicName || topicName.toLowerCase() === 'topic') continue;

      let difficulty = 'Medium';
      if (colDifficulty >= 0 && cells[colDifficulty]) {
        const diffVal = cells[colDifficulty].toLowerCase();
        if (diffVal.startsWith('e')) difficulty = 'Easy';
        else if (diffVal.startsWith('h')) difficulty = 'Hard';
        else difficulty = 'Medium';
      }

      let estHours = 2;
      if (colEstHours >= 0 && cells[colEstHours]) {
        const parsed = parseFloat(cells[colEstHours]);
        if (!isNaN(parsed) && parsed > 0) estHours = parsed;
      }

      const notes = (colNotes >= 0 && cells[colNotes]) ? cells[colNotes] : '';

      rows.push({
        chapter: chapterName,
        topic: topicName,
        difficulty,
        estHours,
        notes
      });
    }

    return rows;
  }

  updateCsvParsedPreview() {
    if (!this.textCsvInput || !this.csvParsedSummary || !this.csvSummaryText) return;

    const raw = this.textCsvInput.value;
    const rows = this.parseCsvData(raw);

    if (rows.length === 0) {
      this.csvParsedSummary.classList.add('hidden');
      return;
    }

    const uniqueChapters = new Set(rows.map(r => r.chapter.toLowerCase()));
    this.csvSummaryText.textContent = `Ready to import: ${uniqueChapters.size} Chapter(s) and ${rows.length} Total Subtopics!`;
    this.csvParsedSummary.classList.remove('hidden');
  }

  executeCsvImport() {
    if (!this.textCsvInput) return;
    const raw = this.textCsvInput.value;
    const rows = this.parseCsvData(raw);

    if (rows.length === 0) {
      this.showToast('Please provide valid CSV rows (e.g. Chapter, Topic)', 'warning');
      return;
    }

    const importMode = document.querySelector('input[name="csvImportMode"]:checked')?.value || 'append';

    // Group rows by chapter title
    const grouped = {};
    rows.forEach(r => {
      const chapKey = r.chapter.trim();
      if (!grouped[chapKey]) {
        grouped[chapKey] = [];
      }
      grouped[chapKey].push(r);
    });

    const colors = ['indigo', 'emerald', 'amber', 'rose', 'cyan', 'purple'];
    let colorIdx = 0;

    if (importMode === 'replace') {
      this.state.chapters = [];
    }

    let addedChapters = 0;
    let addedTopics = 0;

    Object.keys(grouped).forEach(chapTitle => {
      // Find existing chapter by title or create new
      let existingChap = this.state.chapters.find(c => c.title.trim().toLowerCase() === chapTitle.toLowerCase());

      if (!existingChap) {
        const newChapId = 'chap-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
        existingChap = {
          id: newChapId,
          title: chapTitle,
          category: 'Syllabus',
          description: `Imported chapters & subtopics for ${chapTitle}`,
          color: colors[colorIdx % colors.length],
          topics: []
        };
        colorIdx++;
        this.state.chapters.push(existingChap);
        addedChapters++;
      }

      // Add topics under this chapter
      grouped[chapTitle].forEach(item => {
        const existingTopic = existingChap.topics.find(t => t.title.trim().toLowerCase() === item.topic.trim().toLowerCase());
        if (!existingTopic) {
          const newTopicId = 'top-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
          existingChap.topics.push({
            id: newTopicId,
            title: item.topic,
            notes: item.notes || '',
            difficulty: item.difficulty || 'Medium',
            estHours: item.estHours || 2,
            userLearned: false,
            friendLearned: false
          });
          addedTopics++;
        }
      });
    });

    this.saveState();
    this.render();

    // Sync to cloud if connected
    if (this.upstash && this.upstash.isConnected) {
      this.pushToUpstash(false);
    }

    if (this.modalImportCSV) {
      this.modalImportCSV.classList.add('hidden');
    }

    // Reset textarea for next time
    this.textCsvInput.value = '';
    if (this.csvParsedSummary) this.csvParsedSummary.classList.add('hidden');

    this.showToast(`Imported ${addedChapters} new chapters and ${addedTopics} topics successfully!`, 'success');
  }

  // ===================================================================
  // Utility Functions
  // ===================================================================
  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  escapeHtml(str) {
    if (!str) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(str).replace(/[&<>"']/g, m => map[m]);
  }

  inputTopicClean(str) {
    return str.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40);
  }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AmanStudyTrackerApp();
});

