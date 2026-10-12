/**
 * PeerTrack — Minimalist Duo Study & Knowledge Gap Tracker (Subject/Chapter/Topic Version)
 */

const SEED_DATA_DSA = {
  profiles: {
    user: { id: 'user', name: 'Shahzeb', initials: 'SH', pin: '1234' },
    friend: { id: 'friend', name: 'Aman', initials: 'AM', pin: '1234' }
  },
  auth: {
    masterKey: 'thekey'
  },
  permissions: {
    addTopic: 'both',
    deleteTopic: 'both',
    addLecture: 'both',
    deleteLecture: 'both'
  },
  deletedItemIds: [],
  items: [
    { id: 'item-1', subject: 'Algorithms', chapter: 'Dynamic Programming', topic: '0/1 Knapsack Problem', color: 'indigo', userLearned: true, friendLearned: false, updatedAt: 1700000000000 },
    { id: 'item-2', subject: 'Algorithms', chapter: 'Dynamic Programming', topic: 'Longest Common Subsequence', color: 'indigo', userLearned: false, friendLearned: true, updatedAt: 1700000000000 },
    { id: 'item-3', subject: 'Algorithms', chapter: 'Graph Theory', topic: 'BFS & Shortest Path', color: 'emerald', userLearned: true, friendLearned: true, updatedAt: 1700000000000 },
    { id: 'item-4', subject: 'Algorithms', chapter: 'Graph Theory', topic: 'Dijkstra Algorithm', color: 'emerald', userLearned: true, friendLearned: false, updatedAt: 1700000000000 },
    { id: 'item-5', subject: 'Mathematics', chapter: '', topic: 'Discrete Math Basics', color: 'amber', userLearned: false, friendLearned: false, updatedAt: 1700000000000 }
  ]
};

const STORAGE_KEY = 'aman_study_tracker_state_v3';
const UPSTASH_STORAGE_KEY = 'aman_study_tracker_upstash_v3';
const LECTURES_STORAGE_KEY = 'aman_study_tracker_lectures_v1';
const AUTH_USER_KEY = 'aman_study_tracker_auth_user_v3';

class AmanStudyTrackerApp {
  constructor() {
    this.state = this.loadState();
    this.currentAuthUser = localStorage.getItem(AUTH_USER_KEY);
    this.isMasterUnlocked = false;

    this.activeFilter = 'all';
    this.searchQuery = '';
    this.collapsedChapters = new Set();
    this.selectedAnalyzerSubject = 'all';
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

    if (this.currentAuthUser && this.state.profiles[this.currentAuthUser]) {
      this.updateAuthUI();
      this.render();
    } else {
      this.currentAuthUser = null;
      this.renderLoginScreen();
    }
  }

  loadState() {
    let state = null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        state = JSON.parse(saved);
      }
    } catch (e) {}

    if (!state || !state.items || !state.profiles) {
      state = JSON.parse(JSON.stringify(SEED_DATA_DSA));
    }

    if (!state.profiles) state.profiles = {};
    if (!state.profiles.user) state.profiles.user = { id: 'user', name: 'Shahzeb', initials: 'SH', pin: '1234' };
    if (!state.profiles.friend) state.profiles.friend = { id: 'friend', name: 'Aman', initials: 'AM', pin: '1234' };

    if (!state.auth) state.auth = { masterKey: 'thekey' };
    if (!state.permissions) {
      state.permissions = {
        addTopic: 'both',
        deleteTopic: 'both',
        addLecture: 'both',
        deleteLecture: 'both'
      };
    }
    if (!Array.isArray(state.deletedItemIds)) state.deletedItemIds = [];
    if (!Array.isArray(state.deletedLectureIds)) state.deletedLectureIds = [];
    if (!Array.isArray(state.lectures)) {
      try {
        const savedLecs = localStorage.getItem('aman_study_tracker_lectures_v1');
        if (savedLecs) state.lectures = JSON.parse(savedLecs);
      } catch (e) {}
    }
    if (!Array.isArray(state.lectures)) state.lectures = [];
    if (Array.isArray(state.items)) {
      state.items.forEach(i => { if (!i.updatedAt) i.updatedAt = Date.now(); });
    }

    return state;
  }

  saveState() {
    this.lastLocalUpdatedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      if (Array.isArray(this.state.lectures)) {
        localStorage.setItem(LECTURES_STORAGE_KEY, JSON.stringify(this.state.lectures));
      }
    } catch (e) {}
    this.render();
    if (this.upstash && this.upstash.isConnected && this.upstash.autoSync) {
      this.triggerAutoPush();
    }
  }

  saveStateLocallyWithoutPush() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      if (Array.isArray(this.state.lectures)) {
        localStorage.setItem(LECTURES_STORAGE_KEY, JSON.stringify(this.state.lectures));
      }
    } catch (e) {}
    this.render();
  }

  initElements() {
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

    this.loggedUserBar = document.getElementById('loggedUserBar');
    this.headerUserName = document.getElementById('headerUserName');
    this.headerUserAvatar = document.getElementById('headerUserAvatar');
    this.btnLogout = document.getElementById('btnLogout');
    this.btnOpenMasterKeyModal = document.getElementById('btnOpenMasterKeyModal');
    this.btnOpenUpstashModal = document.getElementById('btnOpenUpstashModal');
    this.btnOpenAddItem = document.getElementById('btnOpenAddItem');

    this.analyzerScopeBadge = document.getElementById('analyzerScopeBadge');
    this.analyzerScopeSubtitle = document.getElementById('analyzerScopeSubtitle');
    this.analyzerSubjectTabs = document.getElementById('analyzerSubjectTabs');

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

    this.countFriendOnly = document.getElementById('countFriendOnly');
    this.countUserOnly = document.getElementById('countUserOnly');
    this.countBoth = document.getElementById('countBoth');
    this.cardFilterFriendAhead = document.getElementById('cardFilterFriendAhead');
    this.cardFilterUserAhead = document.getElementById('cardFilterUserAhead');
    this.cardFilterBothMastered = document.getElementById('cardFilterBothMastered');

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

    this.chaptersContainer = document.getElementById('chaptersContainer');
    this.emptyStateContainer = document.getElementById('emptyStateContainer');
    this.btnEmptyAddItem = document.getElementById('btnEmptyAddItem');

    this.modalItem = document.getElementById('modalItem');
    this.formItem = document.getElementById('formItem');
    this.btnCloseModalItem = document.getElementById('btnCloseModalItem');
    this.btnCancelItem = document.getElementById('btnCancelItem');
    this.inputItemId = document.getElementById('inputItemId');
    this.inputItemSubject = document.getElementById('inputItemSubject');
    this.inputItemChapter = document.getElementById('inputItemChapter');
    this.inputItemTopic = document.getElementById('inputItemTopic');
    this.modalItemTitle = document.getElementById('modalItemTitle');
    this.checkInitialUserLearned = document.getElementById('checkInitialUserLearned');
    this.labelInitialSelf = document.getElementById('labelInitialSelf');

    this.modalSettings = document.getElementById('modalSettings');
    this.btnCloseModalSettings = document.getElementById('btnCloseModalSettings');
    this.btnOpenSettingsModal = document.getElementById('btnOpenSettingsModal');
    this.settingsTabBtns = document.querySelectorAll('.settings-tab-btn');
    this.settingsPanels = document.querySelectorAll('.settings-panel');
    this.settingsAccountUserName = document.getElementById('settingsAccountUserName');
    this.settingsAccountUserAvatar = document.getElementById('settingsAccountUserAvatar');

    this.modalMasterKeyAdmin = this.modalSettings;
    this.modalUpstash = this.modalSettings;
    this.modalImportCSV = this.modalSettings;

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
    this.adminInputUserAvatarFile = document.getElementById('adminInputUserAvatarFile');
    this.adminAvatarFriend = document.getElementById('adminAvatarFriend');
    this.adminInputFriendName = document.getElementById('adminInputFriendName');
    this.adminInputFriendPin = document.getElementById('adminInputFriendPin');
    this.adminInputFriendAvatarFile = document.getElementById('adminInputFriendAvatarFile');
    this.adminInputMasterKey = document.getElementById('adminInputMasterKey');
    this.btnCloseMasterAdmin = document.getElementById('btnCloseMasterAdmin');

    this.permSelectAddTopic = document.getElementById('permSelectAddTopic');
    this.permSelectDeleteTopic = document.getElementById('permSelectDeleteTopic');
    this.permSelectAddLecture = document.getElementById('permSelectAddLecture');
    this.permSelectDeleteLecture = document.getElementById('permSelectDeleteLecture');

    this.cloudStatusDot = document.getElementById('cloudStatusDot');
    this.cloudStatusLabel = document.getElementById('cloudStatusLabel');
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

    this.btnOpenImportCSV = document.getElementById('btnOpenImportCSV');
    this.btnEmptyImportCSV = document.getElementById('btnEmptyImportCSV');
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

    this.quickAvatarUpload = document.getElementById('quickAvatarUpload');
    this.toastContainer = document.getElementById('toastContainer');
  }

  attachEvents() {
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          this.state = JSON.parse(event.newValue);
          this.render();
          this.showToast('Synced updates from your study buddy!', 'info');
        } catch (e) {}
      }
    });

    if (this.formLogin) this.formLogin.addEventListener('submit', (e) => this.handleLoginSubmit(e));

    if (this.cardSelectUser) {
      this.cardSelectUser.addEventListener('click', () => {
        this.cardSelectUser.classList.add('selected');
        if (this.cardSelectFriend) this.cardSelectFriend.classList.remove('selected');
        const r = this.cardSelectUser.querySelector('input[type="radio"]');
        if (r) r.checked = true;
      });
    }

    if (this.cardSelectFriend) {
      this.cardSelectFriend.addEventListener('click', () => {
        this.cardSelectFriend.classList.add('selected');
        if (this.cardSelectUser) this.cardSelectUser.classList.remove('selected');
        const r = this.cardSelectFriend.querySelector('input[type="radio"]');
        if (r) r.checked = true;
      });
    }

    if (this.btnToggleLoginPin) {
      this.btnToggleLoginPin.addEventListener('click', () => {
        if (!this.inputLoginPin) return;
        const isPass = this.inputLoginPin.type === 'password';
        this.inputLoginPin.type = isPass ? 'text' : 'password';
        this.btnToggleLoginPin.textContent = isPass ? 'Hide' : 'Show';
      });
    }

    if (this.btnTriggerMasterFromLogin) this.btnTriggerMasterFromLogin.addEventListener('click', () => this.openMasterKeyModal());

    if (this.btnOpenSettingsModal) this.btnOpenSettingsModal.addEventListener('click', () => this.openSettingsModal('settingsPanelCloud'));
    if (this.loggedUserBar) this.loggedUserBar.addEventListener('click', () => this.openSettingsModal('settingsPanelAccount'));
    if (this.dashAvatarUser) this.dashAvatarUser.addEventListener('click', (e) => { e.stopPropagation(); this.openSettingsModal('settingsPanelAccount'); });
    if (this.btnCloseModalSettings) this.btnCloseModalSettings.addEventListener('click', () => this.modalSettings.classList.add('hidden'));
    
    if (this.settingsTabBtns) {
      this.settingsTabBtns.forEach(btn => {
        btn.addEventListener('click', () => this.switchSettingsTab(btn.getAttribute('data-target')));
      });
    }

    if (this.btnLogout) this.btnLogout.addEventListener('click', () => this.handleLogout());
    if (this.btnOpenMasterKeyModal) this.btnOpenMasterKeyModal.addEventListener('click', () => this.openMasterKeyModal());

    if (this.btnCloseModalMasterKey) this.btnCloseModalMasterKey.addEventListener('click', () => this.modalSettings.classList.add('hidden'));
    if (this.btnCancelMasterKeyVerify) this.btnCancelMasterKeyVerify.addEventListener('click', () => this.modalSettings.classList.add('hidden'));
    if (this.btnCloseMasterAdmin) this.btnCloseMasterAdmin.addEventListener('click', () => this.modalSettings.classList.add('hidden'));
    if (this.formVerifyMasterKey) this.formVerifyMasterKey.addEventListener('submit', (e) => this.handleVerifyMasterKey(e));
    if (this.formSaveUsersAdmin) this.formSaveUsersAdmin.addEventListener('submit', (e) => this.handleSaveUsersAdmin(e));

    if (this.btnToggleMasterVerifyKey) {
      this.btnToggleMasterVerifyKey.addEventListener('click', () => {
        if (!this.inputMasterKeyVerify) return;
        const isPass = this.inputMasterKeyVerify.type === 'password';
        this.inputMasterKeyVerify.type = isPass ? 'text' : 'password';
        this.btnToggleMasterVerifyKey.textContent = isPass ? 'Hide' : 'Show';
      });
    }

    if (this.cardFilterFriendAhead) this.cardFilterFriendAhead.addEventListener('click', () => this.setFilter(this.activeFilter === 'friend-only' ? 'all' : 'friend-only'));
    if (this.cardFilterUserAhead) this.cardFilterUserAhead.addEventListener('click', () => this.setFilter(this.activeFilter === 'user-only' ? 'all' : 'user-only'));
    if (this.cardFilterBothMastered) this.cardFilterBothMastered.addEventListener('click', () => this.setFilter(this.activeFilter === 'both-done' ? 'all' : 'both-done'));

    if (this.topicSearchInput) {
      this.topicSearchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        if (this.btnClearSearch) this.btnClearSearch.classList.toggle('hidden', !this.searchQuery);
        this.renderItems();
      });
    }

    if (this.btnClearSearch) {
      this.btnClearSearch.addEventListener('click', () => {
        if (this.topicSearchInput) this.topicSearchInput.value = '';
        this.searchQuery = '';
        this.btnClearSearch.classList.add('hidden');
        this.renderItems();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && this.topicSearchInput && document.activeElement !== this.topicSearchInput && !document.querySelector('.modal-overlay:not(.hidden)')) {
        e.preventDefault();
        this.topicSearchInput.focus();
      }
      if (e.key === 'Escape') this.closeAllModals();
    });

    if (this.filterPillsContainer) {
      this.filterPillsContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;
        this.setFilter(pill.getAttribute('data-filter'));
      });
    }

    if (this.btnResetFilter) this.btnResetFilter.addEventListener('click', () => this.setFilter('all'));

    if (this.btnToggleAllChapters) {
      this.btnToggleAllChapters.addEventListener('click', () => {
        const allChapterIds = this.getUniqueChapterIds();
        if (this.collapsedChapters.size >= allChapterIds.length && allChapterIds.length > 0) {
          this.collapsedChapters.clear();
          if (this.btnToggleAllText) this.btnToggleAllText.textContent = 'Collapse All';
        } else {
          allChapterIds.forEach(id => this.collapsedChapters.add(id));
          if (this.btnToggleAllText) this.btnToggleAllText.textContent = 'Expand All';
        }
        this.renderItems();
      });
    }

    if (this.btnEmptyAddItem) this.btnEmptyAddItem.addEventListener('click', () => this.openAddItemModal());
    if (this.btnOpenAddItem) this.btnOpenAddItem.addEventListener('click', () => this.openAddItemModal());
    if (this.btnCloseModalItem) this.btnCloseModalItem.addEventListener('click', () => this.modalItem.classList.add('hidden'));
    if (this.btnCancelItem) this.btnCancelItem.addEventListener('click', () => this.modalItem.classList.add('hidden'));
    if (this.formItem) this.formItem.addEventListener('submit', (e) => this.handleSaveItem(e));

    if (this.btnOpenUpstashModal) this.btnOpenUpstashModal.addEventListener('click', () => this.openUpstashModal());
    if (this.btnCloseModalUpstash) this.btnCloseModalUpstash.addEventListener('click', () => this.modalUpstash.classList.add('hidden'));
    if (this.btnCloseUpstash) this.btnCloseUpstash.addEventListener('click', () => this.modalUpstash.classList.add('hidden'));
    if (this.formUpstash) this.formUpstash.addEventListener('submit', (e) => this.handleConnectUpstash(e));
    if (this.btnPushToUpstash) this.btnPushToUpstash.addEventListener('click', () => this.pushToUpstash(true));
    if (this.btnPullFromUpstash) this.btnPullFromUpstash.addEventListener('click', () => this.pullFromUpstash(true));
    if (this.btnCopyFriendCloudInvite) this.btnCopyFriendCloudInvite.addEventListener('click', () => this.copyUpstashInviteLink());
    if (this.btnDisconnectUpstash) this.btnDisconnectUpstash.addEventListener('click', () => this.disconnectUpstash());

    if (this.btnToggleTokenVisibility) {
      this.btnToggleTokenVisibility.addEventListener('click', () => {
        const isPass = this.inputUpstashToken.type === 'password';
        this.inputUpstashToken.type = isPass ? 'text' : 'password';
        this.btnToggleTokenVisibility.textContent = isPass ? 'Hide' : 'Show';
      });
    }

    if (this.btnOpenImportCSV) this.btnOpenImportCSV.addEventListener('click', () => this.openCsvModal());
    if (this.btnEmptyImportCSV) this.btnEmptyImportCSV.addEventListener('click', () => this.openCsvModal());
    if (this.btnCloseModalCSV) this.btnCloseModalCSV.addEventListener('click', () => this.modalImportCSV.classList.add('hidden'));
    if (this.btnCancelCSV) this.btnCancelCSV.addEventListener('click', () => this.modalImportCSV.classList.add('hidden'));
    
    if (this.csvDropZone && this.fileCsvInput) {
      this.csvDropZone.addEventListener('click', (e) => {
        if (e.target !== this.fileCsvInput) this.fileCsvInput.click();
      });
      this.fileCsvInput.addEventListener('change', (e) => this.handleCsvFileSelect(e));
      this.csvDropZone.addEventListener('dragover', (e) => { e.preventDefault(); this.csvDropZone.classList.add('dragover'); });
      this.csvDropZone.addEventListener('dragleave', () => this.csvDropZone.classList.remove('dragover'));
      this.csvDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.csvDropZone.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.readCsvFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (this.btnDownloadCsvTemplate) this.btnDownloadCsvTemplate.addEventListener('click', () => this.downloadCsvTemplate());
    if (this.btnFillSampleCsv) this.btnFillSampleCsv.addEventListener('click', () => this.fillSampleCsvData());
    if (this.textCsvInput) this.textCsvInput.addEventListener('input', () => this.updateCsvParsedPreview());
    if (this.btnExecuteCsvImport) this.btnExecuteCsvImport.addEventListener('click', () => this.executeCsvImport());

    if (this.quickAvatarUpload) {
      this.quickAvatarUpload.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file || !this.currentAuthUser) return;
        try {
          const compressed = await this.compressImageFile(file);
          this.state.profiles[this.currentAuthUser].avatarUrl = compressed;
          this.saveState();
          this.updateAuthUI();
          this.render();
          this.showToast('Profile picture updated!', 'success');
        } catch (error) {
          this.showToast('Failed to process image: ' + error.message, 'warning');
        }
      });
    }

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.add('hidden');
      });
    });
  }

  compressImageFile(file, maxWidth = 160, maxHeight = 160, quality = 0.85) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        return reject(new Error('Please select a valid image file.'));
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const width = img.width;
          const height = img.height;
          const minDim = Math.min(width, height);
          const sx = (width - minDim) / 2;
          const sy = (height - minDim) / 2;

          canvas.width = maxWidth;
          canvas.height = maxHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, maxWidth, maxHeight);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Image decoding failed.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('File reading error.'));
      reader.readAsDataURL(file);
    });
  }

  getUniqueChapterIds() {
    const ids = new Set();
    this.state.items.forEach(i => {
      const subj = (i.subject || 'General').trim();
      const chap = (i.chapter || '').trim();
      if (chap) {
        ids.add(subj + '::' + chap);
      } else {
        ids.add(subj + '::__direct__');
      }
    });
    return Array.from(ids);
  }

  renderLoginScreen() {
    this.loginScreen.classList.remove('hidden');
    this.mainAppLayout.classList.add('hidden');

    const u1 = this.state.profiles.user;
    const u2 = this.state.profiles.friend;

    this.loginNameUser.textContent = u1.name;
    if (u1.avatarUrl) {
      this.loginAvatarUser.innerHTML = `<img src="${this.escapeHtml(u1.avatarUrl)}" alt="${this.escapeHtml(u1.name)}" class="avatar-image">`;
    } else {
      this.loginAvatarUser.textContent = u1.initials || u1.name.slice(0, 2).toUpperCase();
    }

    this.loginNameFriend.textContent = u2.name;
    if (u2.avatarUrl) {
      this.loginAvatarFriend.innerHTML = `<img src="${this.escapeHtml(u2.avatarUrl)}" alt="${this.escapeHtml(u2.name)}" class="avatar-image">`;
    } else {
      this.loginAvatarFriend.textContent = u2.initials || u2.name.slice(0, 2).toUpperCase();
    }

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
    
    if (profile.avatarUrl) {
      this.headerUserAvatar.innerHTML = `<img src="${this.escapeHtml(profile.avatarUrl)}" alt="${this.escapeHtml(profile.name)}" class="avatar-image">`;
    } else {
      this.headerUserAvatar.textContent = profile.initials || profile.name.slice(0, 2).toUpperCase();
    }
    
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
      this.showToast('Incorrect passcode. Default is "1234".', 'warning');
    }
  }

  handleLogout() {
    if (this.modalSettings) this.modalSettings.classList.add('hidden');
    this.currentAuthUser = null;
    localStorage.removeItem(AUTH_USER_KEY);
    this.updateAuthUI();
    this.showToast('Logged out.', 'info');
  }

  switchSettingsTab(targetId) {
    if (!this.settingsTabBtns || !this.settingsPanels) return;
    this.settingsTabBtns.forEach(btn => {
      const isTarget = btn.getAttribute('data-target') === targetId;
      btn.classList.toggle('active', isTarget);
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });
    this.settingsPanels.forEach(panel => {
      const isTarget = panel.id === targetId;
      panel.classList.toggle('active', isTarget);
      panel.classList.toggle('hidden', !isTarget);
    });
  }

  openSettingsModal(tabId = 'settingsPanelCloud') {
    if (!this.modalSettings) return;
    this.switchSettingsTab(tabId);
    this.modalSettings.classList.remove('hidden');
    this.updateSettingsAccountUI();
  }

  updateSettingsAccountUI() {
    if (!this.currentAuthUser) return;
    const u = this.state.profiles[this.currentAuthUser];
    if (this.settingsAccountUserName) this.settingsAccountUserName.textContent = u ? u.name : 'Learner';
    if (this.settingsAccountUserAvatar) {
      if (u && u.avatarUrl) {
        this.settingsAccountUserAvatar.innerHTML = `<img src="${this.escapeHtml(u.avatarUrl)}" alt="${this.escapeHtml(u.name)}" class="avatar-image">`;
      } else {
        this.settingsAccountUserAvatar.textContent = u ? (u.initials || u.name.slice(0, 2).toUpperCase()) : 'ME';
      }
      this.settingsAccountUserAvatar.className = `persona-avatar ${this.currentAuthUser === 'user' ? 'user-avatar' : 'friend-avatar'}`;
    }
  }

  openMasterKeyModal() {
    this.openSettingsModal('settingsPanelMaster');
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
    const uName = this.state.profiles.user.name;
    const fName = this.state.profiles.friend.name;

    this.adminInputUserName.value = uName;
    this.adminInputUserPin.value = this.state.profiles.user.pin || '1234';
    this.adminInputFriendName.value = fName;
    this.adminInputFriendPin.value = this.state.profiles.friend.pin || '1234';
    this.adminInputMasterKey.value = this.state.auth?.masterKey || 'thekey';

    if (this.state.profiles.user.avatarUrl) {
      this.adminAvatarUser.innerHTML = `<img src="${this.escapeHtml(this.state.profiles.user.avatarUrl)}" alt="User" class="avatar-image">`;
    } else {
      this.adminAvatarUser.textContent = this.state.profiles.user.initials || 'SH';
    }
    
    if (this.state.profiles.friend.avatarUrl) {
      this.adminAvatarFriend.innerHTML = `<img src="${this.escapeHtml(this.state.profiles.friend.avatarUrl)}" alt="Partner" class="avatar-image">`;
    } else {
      this.adminAvatarFriend.textContent = this.state.profiles.friend.initials || 'AM';
    }

    // Role Permissions options
    const perms = this.state.permissions || {
      addTopic: 'both',
      deleteTopic: 'both',
      addLecture: 'both',
      deleteLecture: 'both'
    };

    const setSelectOptions = (sel, selectedVal) => {
      if (!sel) return;
      sel.innerHTML = `
        <option value="both">Both (${this.escapeHtml(uName)} & ${this.escapeHtml(fName)})</option>
        <option value="user">${this.escapeHtml(uName)} Only</option>
        <option value="friend">${this.escapeHtml(fName)} Only</option>
        <option value="master">Master Key Only</option>
      `;
      sel.value = selectedVal || 'both';
    };

    setSelectOptions(this.permSelectAddTopic, perms.addTopic);
    setSelectOptions(this.permSelectDeleteTopic, perms.deleteTopic);
    setSelectOptions(this.permSelectAddLecture, perms.addLecture);
    setSelectOptions(this.permSelectDeleteLecture, perms.deleteLecture);
  }

  canPerformAction(action) {
    if (this.isMasterUnlocked) return true;
    const perms = this.state.permissions || {
      addTopic: 'both',
      deleteTopic: 'both',
      addLecture: 'both',
      deleteLecture: 'both'
    };
    const rule = perms[action] || 'both';
    if (rule === 'both') return true;
    if (rule === 'master') return false;
    if (rule === 'user') return this.currentAuthUser === 'user';
    if (rule === 'friend') return this.currentAuthUser === 'friend';
    return true;
  }

  checkPermissionOrPrompt(action, description) {
    if (this.canPerformAction(action)) return true;

    const perms = this.state.permissions || {};
    const rule = perms[action] || 'both';
    const uName = this.state.profiles.user?.name || 'Shahzeb';
    const fName = this.state.profiles.friend?.name || 'Aman';

    let allowedText = 'Master Key holder only';
    if (rule === 'user') allowedText = `${uName} only`;
    if (rule === 'friend') allowedText = `${fName} only`;

    const enteredKey = prompt(`🔒 Action Restricted by Owner\n\nPermission to ${description} is restricted to ${allowedText}.\n\nEnter Master Key to authorize this action:`);
    if (enteredKey !== null) {
      const expected = this.state.auth?.masterKey || 'thekey';
      if (enteredKey.trim() === expected) {
        this.isMasterUnlocked = true;
        this.showToast('Master Key authorized! Proceeding...', 'success');
        return true;
      } else {
        this.showToast('Incorrect Master Key.', 'warning');
      }
    }
    return false;
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

    if (!this.state.permissions) this.state.permissions = {};
    this.state.permissions.addTopic = this.permSelectAddTopic?.value || 'both';
    this.state.permissions.deleteTopic = this.permSelectDeleteTopic?.value || 'both';
    this.state.permissions.addLecture = this.permSelectAddLecture?.value || 'both';
    this.state.permissions.deleteLecture = this.permSelectDeleteLecture?.value || 'both';

    const uAvatarFile = this.adminInputUserAvatarFile?.files?.[0];
    const fAvatarFile = this.adminInputFriendAvatarFile?.files?.[0];

    const processAvatars = async () => {
      if (uAvatarFile) {
        try { this.state.profiles.user.avatarUrl = await this.compressImageFile(uAvatarFile); } catch (e) {}
      }
      if (fAvatarFile) {
        try { this.state.profiles.friend.avatarUrl = await this.compressImageFile(fAvatarFile); } catch (e) {}
      }
    };

    processAvatars().then(() => {
      this.saveState();
      this.modalMasterKeyAdmin.classList.add('hidden');
      if (this.currentAuthUser) {
        this.updateAuthUI();
        this.render();
      } else {
        this.renderLoginScreen();
      }
      this.showToast('Permissions & User Settings updated and saved!', 'success');
    });
  }

  getStats(subjectFilter = null) {
    const filterSubject = subjectFilter !== null ? subjectFilter : this.selectedAnalyzerSubject;
    const targetItems = (!filterSubject || filterSubject === 'all')
      ? this.state.items
      : this.state.items.filter(item => (item.subject || 'General').trim() === filterSubject.trim());

    let totalTopics = 0;
    let userCount = 0;
    let friendCount = 0;
    let friendOnlyCount = 0;
    let userOnlyCount = 0;
    let bothCount = 0;
    let neitherCount = 0;

    targetItems.forEach(t => {
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

    const userPercent = totalTopics > 0 ? Math.round((userCount / totalTopics) * 100) : 0;
    const friendPercent = totalTopics > 0 ? Math.round((friendCount / totalTopics) * 100) : 0;
    const userLead = Math.max(0, userCount - friendCount);
    const friendLead = Math.max(0, friendCount - userCount);

    return { totalTopics, userCount, friendCount, userPercent, friendPercent, friendOnlyCount, userOnlyCount, bothCount, neitherCount, userLead, friendLead, filterSubject };
  }

  render() {
    this.updateProfilesUI();
    this.renderSubjectAnalyzerTabs();
    this.updateStatsUI();
    this.renderItems();
  }

  renderSubjectAnalyzerTabs() {
    if (!this.analyzerSubjectTabs) return;

    // Collect distinct subjects with their topic count and assigned color
    const subjectsMap = new Map();
    this.state.items.forEach(item => {
      const subj = (item.subject || 'General').trim();
      if (!subjectsMap.has(subj)) {
        subjectsMap.set(subj, { count: 0, color: item.color || 'indigo' });
      }
      subjectsMap.get(subj).count++;
    });

    const totalAll = this.state.items.length;
    const subjects = Array.from(subjectsMap.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      color: data.color
    }));

    // If currently selected subject no longer exists, reset to 'all'
    if (this.selectedAnalyzerSubject !== 'all' && !subjectsMap.has(this.selectedAnalyzerSubject)) {
      this.selectedAnalyzerSubject = 'all';
    }

    let tabsHtml = `
      <button type="button" 
        class="analyzer-tab-btn ${this.selectedAnalyzerSubject === 'all' ? 'active' : ''}" 
        data-subject="all" 
        role="tab" 
        aria-selected="${this.selectedAnalyzerSubject === 'all'}"
        title="View Overall Analyzer across all subjects">
        <span class="tab-icon">🌐</span>
        <span class="tab-label">Overall Analyzer</span>
        <span class="tab-count">${totalAll}</span>
      </button>
    `;

    subjects.forEach(subj => {
      const isActive = this.selectedAnalyzerSubject === subj.name;
      tabsHtml += `
        <button type="button" 
          class="analyzer-tab-btn theme-${subj.color} ${isActive ? 'active' : ''}" 
          data-subject="${this.escapeHtml(subj.name)}" 
          role="tab" 
          aria-selected="${isActive}"
          title="Switch analyzer to ${this.escapeHtml(subj.name)}">
          <span class="tab-dot dot-${subj.color}"></span>
          <span class="tab-label">${this.escapeHtml(subj.name)}</span>
          <span class="tab-count">${subj.count}</span>
        </button>
      `;
    });

    this.analyzerSubjectTabs.innerHTML = tabsHtml;

    this.analyzerSubjectTabs.querySelectorAll('.analyzer-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetSubj = btn.getAttribute('data-subject');
        this.selectAnalyzerSubject(targetSubj);
      });
    });
  }

  selectAnalyzerSubject(subjectName) {
    this.selectedAnalyzerSubject = subjectName || 'all';
    
    // Update active tab styles immediately
    if (this.analyzerSubjectTabs) {
      this.analyzerSubjectTabs.querySelectorAll('.analyzer-tab-btn').forEach(btn => {
        const isMatch = btn.getAttribute('data-subject') === this.selectedAnalyzerSubject;
        btn.classList.toggle('active', isMatch);
        btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
      });
    }

    this.updateStatsUI();
    this.renderItems();
  }

  updateProfilesUI() {
    const { user, friend } = this.state.profiles;
    const isFriendActive = this.currentAuthUser === 'friend';
    const primary = isFriendActive ? friend : user;
    const secondary = isFriendActive ? user : friend;

    if (primary.avatarUrl) {
      this.dashAvatarUser.innerHTML = `<img src="${this.escapeHtml(primary.avatarUrl)}" alt="You" class="avatar-image">`;
    } else {
      this.dashAvatarUser.textContent = primary.initials;
    }
    this.dashNameUser.textContent = primary.name;
    this.dashTagUser.textContent = 'You';

    if (secondary.avatarUrl) {
      this.dashAvatarFriend.innerHTML = `<img src="${this.escapeHtml(secondary.avatarUrl)}" alt="Partner" class="avatar-image">`;
    } else {
      this.dashAvatarFriend.textContent = secondary.initials;
    }
    this.dashNameFriend.textContent = secondary.name;
    this.dashTagFriend.textContent = 'Partner';

    this.dashFriendShortName.textContent = secondary.name;
    this.dashFriendShortName2.textContent = secondary.name;
    this.filterLabelFriendOnly.textContent = `${secondary.name} Understood, I Haven't`;
    this.filterLabelUserOnly.textContent = `I Understood, ${secondary.name} Hasn't`;
  }

  updateStatsUI() {
    const stats = this.getStats();
    const isFriendActive = this.currentAuthUser === 'friend';

    const primaryPercent = isFriendActive ? stats.friendPercent : stats.userPercent;
    const primaryCount = isFriendActive ? stats.friendCount : stats.userCount;
    const primaryLead = isFriendActive ? stats.friendLead : stats.userLead;

    const partnerPercent = isFriendActive ? stats.userPercent : stats.friendPercent;
    const partnerCount = isFriendActive ? stats.userCount : stats.friendCount;
    const partnerLead = isFriendActive ? stats.userLead : stats.friendLead;

    this.dashPercentUserBadge.textContent = `${primaryPercent}%`;
    this.dashProgressBarUser.style.width = `${primaryPercent}%`;
    this.dashCountUser.textContent = `${primaryCount} / ${stats.totalTopics}`;
    this.dashUserLead.textContent = `+${primaryLead}`;

    this.dashPercentFriendBadge.textContent = `${partnerPercent}%`;
    this.dashProgressBarFriend.style.width = `${partnerPercent}%`;
    this.dashCountFriend.textContent = `${partnerCount} / ${stats.totalTopics}`;
    this.dashFriendLead.textContent = `+${partnerLead}`;

    const partnerOnlyDone = isFriendActive ? stats.userOnlyCount : stats.friendOnlyCount;
    const selfOnlyDone = isFriendActive ? stats.friendOnlyCount : stats.userOnlyCount;

    this.countFriendOnly.textContent = partnerOnlyDone;
    this.countUserOnly.textContent = selfOnlyDone;
    this.countBoth.textContent = stats.bothCount;

    this.pillCountAll.textContent = stats.totalTopics;
    this.pillCountFriendOnly.textContent = partnerOnlyDone;
    this.pillCountUserOnly.textContent = selfOnlyDone;
    this.pillCountBoth.textContent = stats.bothCount;
    this.pillCountNeither.textContent = stats.neitherCount;

    // Update Scope Badge & Subtitle
    if (this.analyzerScopeBadge) {
      if (this.selectedAnalyzerSubject === 'all') {
        this.analyzerScopeBadge.innerHTML = `
          <span class="scope-icon-wrap scope-all">🌐</span>
          <span>Overall Analyzer</span>
        `;
        if (this.analyzerScopeSubtitle) {
          this.analyzerScopeSubtitle.textContent = `Comparing all ${stats.totalTopics} topics across all subjects combined`;
        }
      } else {
        this.analyzerScopeBadge.innerHTML = `
          <span class="scope-icon-wrap scope-subject">📊</span>
          <span>${this.escapeHtml(this.selectedAnalyzerSubject)} Analyzer</span>
        `;
        if (this.analyzerScopeSubtitle) {
          this.analyzerScopeSubtitle.textContent = `Focused on ${stats.totalTopics} topics in ${this.escapeHtml(this.selectedAnalyzerSubject)} • Switch to Overall for full syllabus`;
        }
      }
    }
  }

  setFilter(filterName) {
    this.activeFilter = filterName;
    if (this.filterPillsContainer) {
      this.filterPillsContainer.querySelectorAll('.filter-pill').forEach(pill => {
        pill.classList.toggle('active', pill.getAttribute('data-filter') === filterName);
      });
    }

    if (this.cardFilterFriendAhead) this.cardFilterFriendAhead.classList.toggle('active', filterName === 'friend-only');
    if (this.cardFilterUserAhead) this.cardFilterUserAhead.classList.toggle('active', filterName === 'user-only');
    if (this.cardFilterBothMastered) this.cardFilterBothMastered.classList.toggle('active', filterName === 'both-done');

    if (filterName === 'all') {
      this.filterNoticeBanner.classList.add('hidden');
    } else {
      this.filterNoticeBanner.classList.remove('hidden');
      const { user, friend } = this.state.profiles;
      const isFriend = this.currentAuthUser === 'friend';
      const selfName = isFriend ? friend.name : user.name;
      const partnerName = isFriend ? user.name : friend.name;

      let msg = '';
      if (filterName === 'friend-only') msg = `Showing items ${partnerName} mastered that ${selfName} needs to learn 💡`;
      if (filterName === 'user-only') msg = `Showing items ${selfName} mastered that ${partnerName} needs 🚀`;
      if (filterName === 'both-done') msg = 'Showing items both of you have mastered ✨';
      if (filterName === 'neither-done') msg = 'Showing items pending for both study partners ⏳';
      this.filterNoticeText.textContent = msg;
    }
    this.renderItems();
  }

  renderItems() {
    this.chaptersContainer.innerHTML = '';
    const filteredItems = this.getFilteredItems();

    if (this.state.items.length === 0) {
      this.emptyStateContainer.classList.remove('hidden');
      this.chaptersContainer.classList.add('hidden');
      return;
    }

    this.emptyStateContainer.classList.add('hidden');
    this.chaptersContainer.classList.remove('hidden');

    if (filteredItems.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-chapter-topics';
      emptyDiv.innerHTML = `
        <div class="empty-filter-icon">🔍</div>
        <p class="empty-filter-text">No study items match your current filter or search criteria.</p>
        <button type="button" class="btn btn-secondary btn-sm" id="btnResetSearchOrFilter">Show all items</button>
      `;
      emptyDiv.querySelector('#btnResetSearchOrFilter')?.addEventListener('click', () => {
        this.searchQuery = '';
        this.topicSearchInput.value = '';
        this.btnClearSearch.classList.add('hidden');
        this.setFilter('all');
      });
      this.chaptersContainer.appendChild(emptyDiv);
      return;
    }

    // Group items: Subject -> (Chapters + Direct Items)
    const grouped = {};
    filteredItems.forEach(item => {
      const subj = (item.subject || 'General').trim();
      if (!grouped[subj]) {
        grouped[subj] = {
          color: item.color || 'indigo',
          chapters: {},
          directItems: []
        };
      }
      
      const chap = (item.chapter || '').trim();
      if (chap) {
        if (!grouped[subj].chapters[chap]) grouped[subj].chapters[chap] = [];
        grouped[subj].chapters[chap].push(item);
      } else {
        grouped[subj].directItems.push(item);
      }
    });

    const { user, friend } = this.state.profiles;

    for (const [subjName, subjData] of Object.entries(grouped)) {
      const subjCard = document.createElement('section');
      subjCard.className = `subject-card theme-${subjData.color}`;

      const chapterKeys = Object.keys(subjData.chapters);
      const totalChapters = chapterKeys.length;
      const allSubjItems = [
        ...subjData.directItems,
        ...Object.values(subjData.chapters).flat()
      ];
      const totalSubjItems = allSubjItems.length;

      let subjUserDone = 0;
      let subjFriendDone = 0;
      allSubjItems.forEach(i => {
        if (i.userLearned) subjUserDone++;
        if (i.friendLearned) subjFriendDone++;
      });
      const subjUserPct = totalSubjItems > 0 ? Math.round((subjUserDone / totalSubjItems) * 100) : 0;
      const subjFriendPct = totalSubjItems > 0 ? Math.round((subjFriendDone / totalSubjItems) * 100) : 0;

      subjCard.innerHTML = `
        <div class="subject-header">
          <div class="subject-header-main">
            <div class="subject-icon-box theme-${subjData.color}">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-0.5-0.05"></path>
                <path d="M6 6h10"></path>
                <path d="M6 10h10"></path>
              </svg>
            </div>
            <div class="subject-info">
              <div class="subject-title-line">
                <h2 class="subject-title">${this.escapeHtml(subjName)}</h2>
              </div>
              <div class="subject-meta-chips">
                ${totalChapters > 0 ? `<span class="subject-chip">📚 ${totalChapters} Chapter${totalChapters === 1 ? '' : 's'}</span>` : ''}
                <span class="subject-chip">📝 ${totalSubjItems} Topic${totalSubjItems === 1 ? '' : 's'}</span>
              </div>
            </div>
          </div>
          <div class="subject-header-side">
            <div class="subject-dual-progress">
              <div class="subject-prog-bar">
                <span class="subject-prog-name">${this.escapeHtml(user.name)}</span>
                <div class="subject-prog-track"><div class="subject-prog-fill fill-user" style="width: ${subjUserPct}%"></div></div>
                <span class="subject-prog-pct">${subjUserPct}%</span>
              </div>
              <div class="subject-prog-bar">
                <span class="subject-prog-name">${this.escapeHtml(friend.name)}</span>
                <div class="subject-prog-track"><div class="subject-prog-fill fill-friend" style="width: ${subjFriendPct}%"></div></div>
                <span class="subject-prog-pct">${subjFriendPct}%</span>
              </div>
            </div>
            <div class="subject-actions-row">
              <button type="button" class="btn btn-secondary btn-sm btn-icon-text btn-add-subject-item" title="Add item to ${this.escapeHtml(subjName)}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>+ Add</span>
              </button>
              <button type="button" class="btn-icon-subtle btn-delete btn-delete-subject" title="Delete entire subject ${this.escapeHtml(subjName)}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        </div>
        <div class="subject-body"></div>
      `;

      subjCard.querySelector('.btn-add-subject-item').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openAddItemModal(subjName, subjData.color, '');
      });

      subjCard.querySelector('.btn-delete-subject').addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteSubject(subjName);
      });

      const body = subjCard.querySelector('.subject-body');

      // 1. Direct items (items with no chapter)
      if (subjData.directItems.length > 0) {
        if (totalChapters === 0) {
          const directContainer = document.createElement('div');
          directContainer.className = 'direct-topics-list';
          subjData.directItems.forEach(item => {
            directContainer.appendChild(this.createItemRow(item, subjData.color));
          });
          body.appendChild(directContainer);
        } else {
          const directCard = this.createGroupCard('Core Topics', subjData.color, subjData.directItems, subjName + '::__direct__', subjName);
          body.appendChild(directCard);
        }
      }

      // 2. Chapters (directly displayed with accordion expansion)
      for (const [chapName, items] of Object.entries(subjData.chapters)) {
        const chapterId = subjName + '::' + chapName;
        const chapterCard = this.createGroupCard(chapName, subjData.color, items, chapterId, subjName);
        body.appendChild(chapterCard);
      }

      this.chaptersContainer.appendChild(subjCard);
    }
  }

  getFilteredItems() {
    return this.state.items.filter(item => {
      // 1. Filter by active Analyzer Subject
      if (this.selectedAnalyzerSubject && this.selectedAnalyzerSubject !== 'all') {
        const itemSubj = (item.subject || 'General').trim();
        if (itemSubj !== this.selectedAnalyzerSubject.trim()) return false;
      }

      // 2. Search query filter
      if (this.searchQuery) {
        const inTopic = (item.topic || '').toLowerCase().includes(this.searchQuery);
        const inChap = (item.chapter || '').toLowerCase().includes(this.searchQuery);
        const inSubj = (item.subject || '').toLowerCase().includes(this.searchQuery);
        if (!inTopic && !inChap && !inSubj) return false;
      }

      // 3. Learning status filter
      const isFriend = this.currentAuthUser === 'friend';
      const partnerLearned = isFriend ? item.userLearned : item.friendLearned;
      const selfLearned = isFriend ? item.friendLearned : item.userLearned;

      if (this.activeFilter === 'friend-only') return partnerLearned && !selfLearned;
      if (this.activeFilter === 'user-only') return selfLearned && !partnerLearned;
      if (this.activeFilter === 'both-done') return selfLearned && partnerLearned;
      if (this.activeFilter === 'neither-done') return !selfLearned && !partnerLearned;
      return true;
    });
  }

  createGroupCard(chapterName, color, items, chapterId, subjectName = '') {
    const isCollapsed = this.collapsedChapters.has(chapterId);
    const { user, friend } = this.state.profiles;

    let userDone = 0;
    let friendDone = 0;
    items.forEach(i => {
      if (i.userLearned) userDone++;
      if (i.friendLearned) friendDone++;
    });

    const total = items.length;
    const userPercent = total > 0 ? Math.round((userDone / total) * 100) : 0;
    const friendPercent = total > 0 ? Math.round((friendDone / total) * 100) : 0;

    const card = document.createElement('article');
    card.className = `chapter-card theme-${color}`;

    const isCore = chapterName === 'Core Topics';
    const badgeText = isCore ? 'CORE' : 'CHAPTER';

    card.innerHTML = `
      <div class="chapter-header" data-action="toggle-chapter">
        <div class="chapter-title-group">
          <button type="button" class="btn-collapse" aria-expanded="${!isCollapsed}" aria-label="Toggle ${this.escapeHtml(chapterName)}">
            <svg class="chevron-icon ${isCollapsed ? 'collapsed' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div class="chapter-meta">
            <div class="chapter-title-line">
              <span class="chapter-badge-label">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                ${badgeText}
              </span>
              <h3 class="chapter-title">${this.escapeHtml(chapterName)}</h3>
              <span class="topic-count-tag">${total} topic${total === 1 ? '' : 's'}</span>
              <span class="chapter-open-pill">${isCollapsed ? 'Open Topics ▾' : 'Collapse ▴'}</span>
            </div>
          </div>
        </div>
        <div class="chapter-progress-actions">
          <div class="chapter-dual-progress">
            <div class="mini-progress-row">
              <span class="mini-label">${this.escapeHtml(user.name)}</span>
              <div class="mini-track"><div class="mini-fill fill-user" style="width: ${userPercent}%"></div></div>
              <span class="mini-percent">${userPercent}%</span>
            </div>
            <div class="mini-progress-row">
              <span class="mini-label">${this.escapeHtml(friend.name)}</span>
              <div class="mini-track"><div class="mini-fill fill-friend" style="width: ${friendPercent}%"></div></div>
              <span class="mini-percent">${friendPercent}%</span>
            </div>
          </div>
          <div class="chapter-actions-group">
            <button type="button" class="btn-icon-subtle btn-add-chapter-item" title="Add topic to ${this.escapeHtml(chapterName)}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <button type="button" class="btn-icon-subtle btn-delete btn-delete-chapter" title="Delete chapter ${this.escapeHtml(chapterName)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>
      <div class="topics-list ${isCollapsed ? 'hidden' : ''}"></div>
    `;

    const list = card.querySelector('.topics-list');
    items.forEach(item => {
      list.appendChild(this.createItemRow(item, color));
    });

    const btnAddChap = card.querySelector('.btn-add-chapter-item');
    if (btnAddChap) {
      btnAddChap.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openAddItemModal(subjectName, color, chapterName === 'Core Topics' ? '' : chapterName);
      });
    }

    const btnDelChap = card.querySelector('.btn-delete-chapter');
    if (btnDelChap) {
      btnDelChap.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteChapter(subjectName, chapterName);
      });
    }

    card.querySelector('[data-action="toggle-chapter"]').addEventListener('click', (e) => {
      if (e.target.closest('.chapter-actions-group')) {
        return;
      }
      if (this.collapsedChapters.has(chapterId)) this.collapsedChapters.delete(chapterId);
      else this.collapsedChapters.add(chapterId);
      this.renderItems();
    });

    return card;
  }

  createItemRow(item, color = 'indigo') {
    const { user, friend } = this.state.profiles;
    const row = document.createElement('div');
    const isUserDone = !!item.userLearned;
    const isFriendDone = !!item.friendLearned;
    
    row.className = `topic-row ${isUserDone ? 'is-user-done' : ''} ${isFriendDone ? 'is-friend-done' : ''} ${isUserDone && isFriendDone ? 'is-both-done' : ''}`;

    let gapBadgeHtml = '';
    if (item.friendLearned && !item.userLearned) {
      gapBadgeHtml = `<span class="gap-tag tag-friend-only" title="${this.escapeHtml(friend.name)} mastered this topic"><span class="gap-dot friend-dot"></span>💡 ${this.escapeHtml(friend.name)} ahead</span>`;
    } else if (item.userLearned && !item.friendLearned) {
      gapBadgeHtml = `<span class="gap-tag tag-user-only" title="You mastered this topic"><span class="gap-dot user-dot"></span>🚀 You lead</span>`;
    }

    const isUserActive = this.currentAuthUser === 'user';
    const isFriendActive = this.currentAuthUser === 'friend';
    const canEditUser = isUserActive;
    const canEditFriend = isFriendActive;

    const displayTitle = item.topic || item.chapter || item.subject;

    // Only show chapter breadcrumb if currently filtering by search, to eliminate redundant labels
    let breadcrumbHtml = '';
    if (this.searchQuery && item.chapter && item.topic) {
      breadcrumbHtml = `<span class="topic-breadcrumb">${this.escapeHtml(item.chapter)}</span>`;
    }

    row.innerHTML = `
      <div class="topic-details">
        <div class="topic-title-line">
          <span class="topic-badge-label">Topic</span>
          <span class="topic-bullet theme-${color}"></span>
          <span class="topic-title">${this.escapeHtml(displayTitle)}</span>
          ${gapBadgeHtml}
        </div>
        ${breadcrumbHtml}
      </div>
      <div class="topic-controls">
        <div class="topic-checkers-group">
          <button type="button" class="learner-toggle ${item.userLearned ? 'active-user' : ''} ${!canEditUser ? 'locked' : ''}" data-learner="user" title="${canEditUser ? 'Toggle your completion' : '🔒 Locked to ' + this.escapeHtml(user.name)}">
            <span class="toggle-avatar-bubble user-bubble">${user.avatarUrl ? `<img src="${this.escapeHtml(user.avatarUrl)}" class="avatar-image">` : (user.initials || 'SH')}</span>
            <span class="toggle-name">${this.escapeHtml(user.name)}</span>
            <span class="toggle-box">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
            ${!canEditUser ? `<svg class="lock-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>` : ''}
          </button>
          
          <button type="button" class="learner-toggle ${item.friendLearned ? 'active-friend' : ''} ${!canEditFriend ? 'locked' : ''}" data-learner="friend" title="${canEditFriend ? 'Toggle your completion' : '🔒 Locked to ' + this.escapeHtml(friend.name)}">
            <span class="toggle-avatar-bubble friend-bubble">${friend.avatarUrl ? `<img src="${this.escapeHtml(friend.avatarUrl)}" class="avatar-image">` : (friend.initials || 'AM')}</span>
            <span class="toggle-name">${this.escapeHtml(friend.name)}</span>
            <span class="toggle-box">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
            ${!canEditFriend ? `<svg class="lock-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>` : ''}
          </button>
        </div>

        <div class="topic-actions-btn-group">
          <button type="button" class="btn-icon-subtle" data-action="edit-item" title="Edit item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button type="button" class="btn-icon-subtle btn-delete" data-action="delete-item" title="Delete item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;

    row.querySelectorAll('.learner-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleItemLearner(item.id, btn.dataset.learner);
      });
    });

    row.querySelector('[data-action="edit-item"]').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openEditItemModal(item);
    });
    row.querySelector('[data-action="delete-item"]').addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteItem(item.id);
    });

    return row;
  }

  toggleItemLearner(itemId, learner) {
    if (this.currentAuthUser !== learner) {
      const allowedName = learner === 'user' ? this.state.profiles.user.name : this.state.profiles.friend.name;
      this.showToast(`🔒 Locked: Only ${allowedName} can mark their own completion!`, 'warning');
      return;
    }

    const item = this.state.items.find(i => i.id === itemId);
    if (!item) return;

    if (learner === 'user') item.userLearned = !item.userLearned;
    else item.friendLearned = !item.friendLearned;

    const learnerName = learner === 'user' ? this.state.profiles.user.name : this.state.profiles.friend.name;
    const isDone = learner === 'user' ? item.userLearned : item.friendLearned;

    this.saveState();
    if (isDone) this.showToast(`Marked completed by ${learnerName}!`, 'success');
  }

  openAddItemModal(defaultSubject = '', defaultColor = 'indigo', defaultChapter = '') {
    if (!this.checkPermissionOrPrompt('addTopic', 'add new study topics')) {
      return;
    }

    if (!defaultSubject && this.selectedAnalyzerSubject && this.selectedAnalyzerSubject !== 'all') {
      defaultSubject = this.selectedAnalyzerSubject;
      const existing = this.state.items.find(i => (i.subject || '').trim() === defaultSubject.trim());
      if (existing && existing.color) defaultColor = existing.color;
    }

    this.modalItemTitle.textContent = defaultSubject ? `Add Item to ${defaultSubject}` : 'Add Study Item';
    this.inputItemId.value = '';
    this.inputItemSubject.value = defaultSubject;
    this.inputItemChapter.value = defaultChapter || '';
    this.inputItemTopic.value = '';

    const colorRadio = document.querySelector(`input[name="itemColor"][value="${defaultColor}"]`);
    if (colorRadio) colorRadio.checked = true;

    const isFriend = this.currentAuthUser === 'friend';
    const profile = isFriend ? this.state.profiles.friend : this.state.profiles.user;
    this.labelInitialSelf.textContent = profile.name;
    this.checkInitialUserLearned.checked = false;

    this.modalItem.classList.remove('hidden');
    if (defaultChapter) {
      this.inputItemTopic.focus();
    } else if (defaultSubject) {
      this.inputItemChapter.focus();
    } else {
      this.inputItemSubject.focus();
    }
  }

  openEditItemModal(item) {
    if (!this.checkPermissionOrPrompt('addTopic', 'edit study topics')) {
      return;
    }

    this.modalItemTitle.textContent = 'Edit Study Item';
    this.inputItemId.value = item.id;
    this.inputItemSubject.value = item.subject || '';
    this.inputItemChapter.value = item.chapter || '';
    this.inputItemTopic.value = item.topic || '';
    
    const colorRadio = document.querySelector(`input[name="itemColor"][value="${item.color || 'indigo'}"]`);
    if (colorRadio) colorRadio.checked = true;

    const isFriend = this.currentAuthUser === 'friend';
    const profile = isFriend ? this.state.profiles.friend : this.state.profiles.user;
    this.labelInitialSelf.textContent = profile.name;
    this.checkInitialUserLearned.checked = isFriend ? !!item.friendLearned : !!item.userLearned;

    this.modalItem.classList.remove('hidden');
    this.inputItemSubject.focus();
  }

  handleSaveItem(e) {
    e.preventDefault();
    const id = this.inputItemId.value;
    const subject = this.inputItemSubject.value.trim();
    const chapter = this.inputItemChapter.value.trim();
    const topic = this.inputItemTopic.value.trim();
    const color = document.querySelector('input[name="itemColor"]:checked')?.value || 'indigo';
    
    if (!subject) return;

    const isFriend = this.currentAuthUser === 'friend';
    const selfLearned = this.checkInitialUserLearned.checked;

    if (id) {
      const item = this.state.items.find(i => i.id === id);
      if (item) {
        item.subject = subject;
        item.chapter = chapter;
        item.topic = topic;
        item.color = color;
        item.updatedAt = Date.now();
        if (isFriend) item.friendLearned = selfLearned;
        else item.userLearned = selfLearned;
        this.showToast(`Item updated!`, 'success');
      }
    } else {
      const newItem = {
        id: 'item-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
        subject,
        chapter,
        topic,
        color,
        userLearned: !isFriend && selfLearned,
        friendLearned: isFriend && selfLearned,
        updatedAt: Date.now()
      };
      this.state.items.push(newItem);
      this.showToast(`Item added!`, 'success');
    }

    this.saveState();
    this.modalItem.classList.add('hidden');
  }

  deleteItem(id) {
    if (!this.checkPermissionOrPrompt('deleteTopic', 'delete study items')) {
      return;
    }

    const item = this.state.items.find(i => i.id === id);
    const title = item ? (item.topic || item.chapter || item.subject) : 'this item';
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      if (!Array.isArray(this.state.deletedItemIds)) this.state.deletedItemIds = [];
      if (!this.state.deletedItemIds.includes(id)) {
        this.state.deletedItemIds.push(id);
      }
      this.state.items = this.state.items.filter(i => i.id !== id);
      this.saveState();
      if (this.upstash && this.upstash.isConnected) {
        this.pushToUpstash(false);
      }
      this.showToast(`Deleted "${title}".`, 'info');
    }
  }

  deleteChapter(subjName, chapName) {
    if (!this.checkPermissionOrPrompt('deleteTopic', 'delete chapters')) {
      return;
    }

    const isDirect = chapName === 'Core Topics';
    const matching = this.state.items.filter(i => {
      const s = (i.subject || 'General').trim();
      const c = (i.chapter || '').trim();
      if (s !== subjName) return false;
      return isDirect ? (c === '' || c === 'Core Topics') : (c === chapName);
    });

    const count = matching.length;
    const displayName = isDirect ? 'Core Topics' : `chapter "${chapName}"`;
    if (confirm(`Are you sure you want to delete ${displayName} and all ${count} topic${count === 1 ? '' : 's'} inside it?`)) {
      if (!Array.isArray(this.state.deletedItemIds)) this.state.deletedItemIds = [];
      matching.forEach(i => {
        if (!this.state.deletedItemIds.includes(i.id)) {
          this.state.deletedItemIds.push(i.id);
        }
      });
      const matchingIds = new Set(matching.map(i => i.id));
      this.state.items = this.state.items.filter(i => !matchingIds.has(i.id));
      this.collapsedChapters.delete(subjName + '::' + chapName);
      this.saveState();
      if (this.upstash && this.upstash.isConnected) {
        this.pushToUpstash(false);
      }
      this.showToast(`Deleted ${displayName}.`, 'info');
    }
  }

  deleteSubject(subjName) {
    if (!this.checkPermissionOrPrompt('deleteTopic', 'delete subjects')) {
      return;
    }

    const matching = this.state.items.filter(i => (i.subject || 'General').trim() === subjName);
    const count = matching.length;
    if (confirm(`Are you sure you want to delete the entire subject "${subjName}" and all ${count} item${count === 1 ? '' : 's'}?`)) {
      if (!Array.isArray(this.state.deletedItemIds)) this.state.deletedItemIds = [];
      matching.forEach(i => {
        if (!this.state.deletedItemIds.includes(i.id)) {
          this.state.deletedItemIds.push(i.id);
        }
      });
      const matchingIds = new Set(matching.map(i => i.id));
      this.state.items = this.state.items.filter(i => !matchingIds.has(i.id));
      if (this.selectedAnalyzerSubject === subjName) {
        this.selectedAnalyzerSubject = 'all';
      }
      this.saveState();
      if (this.upstash && this.upstash.isConnected) {
        this.pushToUpstash(false);
      }
      this.showToast(`Deleted subject "${subjName}".`, 'info');
    }
  }

  loadUpstashConfig() {
    try {
      const saved = localStorage.getItem(UPSTASH_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { url: '', token: '', roomId: 'study-duo-room-1', autoSync: true, pollInterval: 10000, isConnected: false, lastSyncedAt: null, useServerProxy: false };
  }

  saveUpstashConfig() {
    try { localStorage.setItem(UPSTASH_STORAGE_KEY, JSON.stringify(this.upstash)); } catch (e) {}
  }

  async initUpstash() {
    this.updateUpstashStatusUI();

    // Auto-detect server proxy (/api/sync) when running on Vercel or local Node server
    if (!this.upstash.isConnected || this.upstash.useServerProxy) {
      try {
        const room = encodeURIComponent(this.upstash.roomId || 'study-duo-room-1');
        const res = await fetch(`/api/sync?room=${room}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.configured) {
            this.upstash.useServerProxy = true;
            this.upstash.isConnected = true;
            this.saveUpstashConfig();
            this.updateUpstashStatusUI();
            this.startSyncPolling();
            this.pullFromUpstash(false);
            return;
          }
        }
      } catch (e) {}
    }

    if (this.upstash.isConnected) {
      this.startSyncPolling();
      this.pullFromUpstash(false);
    }
  }

  updateUpstashStatusUI(syncState = null) {
    const isConn = !!this.upstash.isConnected;
    if (this.cloudStatusDot) this.cloudStatusDot.className = 'cloud-status-indicator ' + (syncState === 'syncing' ? 'status-syncing' : (isConn ? 'status-connected' : 'status-offline'));
    if (this.cloudStatusLabel) this.cloudStatusLabel.textContent = syncState === 'syncing' ? 'Syncing...' : (isConn ? 'Cloud Live 🟢' : 'Upstash Cloud');
    if (this.upstashStatusBanner) this.upstashStatusBanner.className = 'cloud-status-banner ' + (isConn ? 'status-banner-connected' : 'status-banner-disconnected');
    if (this.bannerStatusDot) this.bannerStatusDot.className = 'status-pulse-dot ' + (isConn ? 'dot-live' : '');
    if (this.bannerStatusTitle) this.bannerStatusTitle.textContent = isConn ? `Connected to Room: ${this.upstash.roomId || 'default'}` : 'Cloud Sync Disconnected';
    if (this.bannerStatusSub) this.bannerStatusSub.textContent = isConn ? 'Changes automatically sync across both devices in real-time.' : 'Currently storing progress locally in your browser.';
    if (this.bannerLastSyncText) this.bannerLastSyncText.textContent = this.upstash.lastSyncedAt ? `Synced ${new Date(this.upstash.lastSyncedAt).toLocaleTimeString()}` : '—';
  }

  openUpstashModal() {
    this.inputUpstashUrl.value = this.upstash.url || '';
    this.inputUpstashToken.value = this.upstash.token || '';
    this.inputUpstashRoom.value = this.upstash.roomId || 'study-duo-room-1';
    this.selectSyncInterval.value = String(this.upstash.pollInterval || 10000);
    this.checkUpstashAutoSync.checked = !!this.upstash.autoSync;
    this.updateUpstashStatusUI();
    this.openSettingsModal('settingsPanelCloud');
  }

  async handleConnectUpstash(e) {
    e.preventDefault();
    const url = this.inputUpstashUrl.value.trim().replace(/\/+$/, '');
    const token = this.inputUpstashToken.value.trim();
    const roomId = this.inputTopicClean(this.inputUpstashRoom.value.trim()) || 'study-duo-room-1';
    const pollInterval = this.selectSyncInterval.value === 'manual' ? 0 : parseInt(this.selectSyncInterval.value, 10);
    const autoSync = this.checkUpstashAutoSync.checked;

    if (!this.upstash.useServerProxy && (!url || !token)) {
      this.showToast('Please provide both Upstash URL and Token.', 'warning');
      return;
    }

    this.showToast('Connecting to Upstash...', 'info');

    try {
      if (this.upstash.useServerProxy && (!url || !token)) {
        // Connected via serverless proxy
        this.upstash.roomId = roomId;
        this.upstash.pollInterval = pollInterval;
        this.upstash.autoSync = autoSync;
        this.upstash.isConnected = true;
        this.saveUpstashConfig();
        this.startSyncPolling();
        await this.pullFromUpstash(false);
        this.updateUpstashStatusUI();
        this.showToast('Updated cloud settings via server proxy!', 'success');
        this.modalUpstash.classList.add('hidden');
        return;
      }

      const testRes = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(['PING']) });
      if (!testRes.ok) throw new Error(`Upstash returned HTTP ${testRes.status}`);
      const pingData = await testRes.json();
      if (pingData.error) throw new Error(pingData.error);

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
    this.autoPushTimer = setTimeout(() => this.pushToUpstash(false), 800);
  }

  async pushToUpstash(notify = true) {
    if (!this.upstash.isConnected) { if (notify) this.showToast('Connect Upstash first.', 'info'); return; }
    this.updateUpstashStatusUI('syncing');

    try {
      const isFriend = this.currentAuthUser === 'friend';
      const senderName = isFriend ? this.state.profiles.friend.name : this.state.profiles.user.name;
      const payload = {
        state: this.state,
        updatedAt: Date.now(),
        sender: senderName
      };

      let res;
      if (this.upstash.useServerProxy) {
        res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: this.upstash.roomId || 'study-duo-room-1', payload })
        });
      } else {
        res = await fetch(this.upstash.url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.upstash.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(['SET', `aman_study_tracker:${this.upstash.roomId}`, JSON.stringify(payload)])
        });
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.lastRemoteUpdatedAt = payload.updatedAt;
      this.upstash.lastSyncedAt = Date.now();
      this.saveUpstashConfig();
      this.updateUpstashStatusUI();
      if (notify) this.showToast('Saved latest study progress to Upstash!', 'success');
    } catch (err) {
      this.updateUpstashStatusUI();
      if (notify) this.showToast('Failed to push to cloud: ' + err.message, 'warning');
    }
  }

  async pullFromUpstash(notify = true) {
    if (!this.upstash.isConnected || this.isSyncing) return;
    this.isSyncing = true;
    try {
      let res;
      if (this.upstash.useServerProxy) {
        const room = encodeURIComponent(this.upstash.roomId || 'study-duo-room-1');
        res = await fetch(`/api/sync?room=${room}`);
      } else {
        res = await fetch(this.upstash.url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.upstash.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(['GET', `aman_study_tracker:${this.upstash.roomId}`])
        });
      }

      if (res && res.ok) {
        let data = await res.json();
        if (data && data.result) {
          const remote = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
          if (remote && remote.state && (notify || remote.updatedAt > this.lastRemoteUpdatedAt)) {
            this.lastRemoteUpdatedAt = Math.max(this.lastRemoteUpdatedAt, remote.updatedAt || 0);
            this.mergeRemoteState(remote.state);
            this.saveStateLocallyWithoutPush();
            this.updateProfilesUI();
            this.render();
            if (notify) this.showToast('Pulled latest progress from cloud!', 'success');
          } else if (notify) {
            this.showToast('Already synced with cloud!', 'info');
          }
        } else if (data && !data.result) {
          this.pushToUpstash(false);
          if (notify) this.showToast('Cloud was empty; initialized with local state.', 'info');
        }
      }
      this.upstash.lastSyncedAt = Date.now();
      this.saveUpstashConfig();
      this.updateUpstashStatusUI();
    } catch (err) {
    } finally {
      this.isSyncing = false;
    }
  }

  mergeRemoteState(remoteState) {
    if (!remoteState) return;

    if (!Array.isArray(this.state.deletedItemIds)) this.state.deletedItemIds = [];
    const remoteDeleted = Array.isArray(remoteState.deletedItemIds) ? remoteState.deletedItemIds : [];
    
    // Combine tombstones across peers
    const deletedSet = new Set([...this.state.deletedItemIds, ...remoteDeleted]);
    this.state.deletedItemIds = Array.from(deletedSet).slice(-1000);

    // Purge any locally tracked items that have been deleted anywhere
    this.state.items = this.state.items.filter(i => !deletedSet.has(i.id));

    if (remoteState.profiles) {
      if (remoteState.profiles.user) {
        this.state.profiles.user.name = remoteState.profiles.user.name || this.state.profiles.user.name;
        this.state.profiles.user.pin = remoteState.profiles.user.pin || this.state.profiles.user.pin;
        this.state.profiles.user.initials = (this.state.profiles.user.name || 'SH').slice(0, 2).toUpperCase();
        if (remoteState.profiles.user.avatarUrl) this.state.profiles.user.avatarUrl = remoteState.profiles.user.avatarUrl;
      }
      if (remoteState.profiles.friend) {
        this.state.profiles.friend.name = remoteState.profiles.friend.name || this.state.profiles.friend.name;
        this.state.profiles.friend.pin = remoteState.profiles.friend.pin || this.state.profiles.friend.pin;
        this.state.profiles.friend.initials = (this.state.profiles.friend.name || 'AM').slice(0, 2).toUpperCase();
        if (remoteState.profiles.friend.avatarUrl) this.state.profiles.friend.avatarUrl = remoteState.profiles.friend.avatarUrl;
      }
    }

    if (remoteState.auth?.masterKey) {
      if (!this.state.auth) this.state.auth = {};
      this.state.auth.masterKey = remoteState.auth.masterKey;
    }

    if (remoteState.permissions) {
      this.state.permissions = Object.assign({}, this.state.permissions, remoteState.permissions);
    }

    if (Array.isArray(remoteState.items)) {
      const localMap = new Map();
      this.state.items.forEach(i => localMap.set(i.id, i));
      const isCurrentFriend = this.currentAuthUser === 'friend';

      remoteState.items.forEach(remoteItem => {
        // DO NOT RESURRECT DELETED ITEMS
        if (deletedSet.has(remoteItem.id)) return;

        const localItem = localMap.get(remoteItem.id) || this.state.items.find(i => 
          (i.subject || '').toLowerCase() === (remoteItem.subject || '').toLowerCase() &&
          (i.chapter || '').toLowerCase() === (remoteItem.chapter || '').toLowerCase() &&
          (i.topic || '').toLowerCase() === (remoteItem.topic || '').toLowerCase()
        );

        if (localItem) {
          if (deletedSet.has(localItem.id)) return;
          if (isCurrentFriend) {
            localItem.userLearned = !!remoteItem.userLearned;
          } else {
            localItem.friendLearned = !!remoteItem.friendLearned;
          }
          const remoteTime = remoteItem.updatedAt || 0;
          const localTime = localItem.updatedAt || 0;
          if (remoteTime >= localTime) {
            if (remoteItem.subject) localItem.subject = remoteItem.subject;
            if (remoteItem.chapter !== undefined) localItem.chapter = remoteItem.chapter;
            if (remoteItem.topic !== undefined) localItem.topic = remoteItem.topic;
            if (remoteItem.color) localItem.color = remoteItem.color;
            localItem.updatedAt = remoteTime;
          }
        } else {
          this.state.items.push(remoteItem);
        }
      });
    }

    // Merge deleted lecture IDs
    const deletedLecSet = new Set(this.state.deletedLectureIds || []);
    if (Array.isArray(remoteState.deletedLectureIds)) {
      remoteState.deletedLectureIds.forEach(id => deletedLecSet.add(id));
      this.state.deletedLectureIds = Array.from(deletedLecSet);
    }

    if (Array.isArray(this.state.lectures)) {
      this.state.lectures = this.state.lectures.filter(l => !deletedLecSet.has(l.id));
    } else {
      this.state.lectures = [];
    }

    if (Array.isArray(remoteState.lectures)) {
      const localLecMap = new Map();
      this.state.lectures.forEach(l => localLecMap.set(l.id, l));

      remoteState.lectures.forEach(remLec => {
        if (deletedLecSet.has(remLec.id)) return;
        const localLec = localLecMap.get(remLec.id);
        if (localLec) {
          const isCurrentFriend = this.currentAuthUser === 'friend';
          if (isCurrentFriend) {
            localLec.userWatched = !!remLec.userWatched;
          } else {
            localLec.friendWatched = !!remLec.friendWatched;
          }
          if ((remLec.updatedAt || 0) >= (localLec.updatedAt || 0)) {
            Object.assign(localLec, remLec);
          }
        } else {
          this.state.lectures.push(remLec);
        }
      });

      try {
        localStorage.setItem(LECTURES_STORAGE_KEY, JSON.stringify(this.state.lectures));
      } catch (e) {}
    }
  }

  startSyncPolling() {
    this.stopSyncPolling();
    const interval = this.upstash.pollInterval || 10000;
    if (interval > 0) this.syncPollTimer = setInterval(() => this.pullFromUpstash(false), interval);
  }

  stopSyncPolling() {
    if (this.syncPollTimer) { clearInterval(this.syncPollTimer); this.syncPollTimer = null; }
  }

  copyUpstashInviteLink() {
    if (!this.upstash.roomId) { this.showToast('Configure a room first.', 'warning'); return; }
    const payloadObj = { room: this.upstash.roomId };
    if (!this.upstash.useServerProxy && this.upstash.url && this.upstash.token) {
      payloadObj.u = this.upstash.url;
      payloadObj.t = this.upstash.token;
    }
    const encoded = encodeURIComponent(JSON.stringify(payloadObj));
    const inviteUrl = `${window.location.origin}${window.location.pathname}#cloud=${encoded}`;
    navigator.clipboard.writeText(inviteUrl).then(() => this.showToast('Partner invite link copied to clipboard!', 'success')).catch(() => prompt('Copy this invite link for your partner:', inviteUrl));
  }

  checkUrlForCloudPayload() {
    if (!window.location.hash.startsWith('#cloud=')) return;
    try {
      const raw = decodeURIComponent(window.location.hash.slice(7));
      const payload = JSON.parse(raw);
      if (payload.room) {
        this.upstash.roomId = payload.room;
        if (payload.u && payload.t) { this.upstash.url = payload.u; this.upstash.token = payload.t; }
        this.upstash.isConnected = true;
        this.saveUpstashConfig();
        this.startSyncPolling();
        this.pullFromUpstash(false);
        this.showToast(`Joined shared cloud room: "${payload.room}"!`, 'success');
      }
      history.replaceState(null, '', window.location.pathname);
    } catch (e) {}
  }

  openCsvModal() {
    this.openSettingsModal('settingsPanelCsv');
    if (this.textCsvInput) { this.updateCsvParsedPreview(); this.textCsvInput.focus(); }
  }

  handleCsvFileSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (file) this.readCsvFile(file);
  }

  readCsvFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (this.textCsvInput) {
        this.textCsvInput.value = evt.target.result;
        this.updateCsvParsedPreview();
        this.showToast(`Loaded ${file.name} successfully!`, 'success');
      }
    };
    reader.onerror = () => this.showToast('Failed to read CSV file.', 'danger');
    reader.readAsText(file);
  }

  downloadCsvTemplate() {
    const csvContent = [
      'Subject,Chapter,Topic',
      'Algorithms,Dynamic Programming,0/1 Knapsack',
      'Algorithms,Dynamic Programming,Longest Common Subsequence',
      'Algorithms,Graph Theory,Breadth First Search',
      'Algorithms,Graph Theory,Dijkstra Algorithm',
      'Mathematics,Calculus,Derivatives',
      'Mathematics,,',
      'Physics,Mechanics,'
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
    if (this.textCsvInput) {
      this.textCsvInput.value = [
        'Subject,Chapter,Topic',
        'Algorithms,Dynamic Programming,0/1 Knapsack',
        'Algorithms,Dynamic Programming,Longest Common Subsequence',
        'Algorithms,Graph Theory,BFS & Shortest Path',
        'Mathematics,Linear Algebra,Matrices',
        'Physics,Mechanics,'
      ].join('\n');
      this.updateCsvParsedPreview();
      this.showToast('Sample syllabus pasted! Review and click Import.', 'info');
    }
  }

  parseCsvData(rawText) {
    if (!rawText || !rawText.trim()) return [];
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return [];

    const parseLine = (line) => {
      const cells = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === '\t' || char === ';') && !inQuotes) {
          cells.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      cells.push(current.trim());
      return cells.map(c => {
        let trimmed = c.trim();
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
          trimmed = trimmed.slice(1, -1).trim();
        }
        return trimmed;
      });
    };

    const firstCells = parseLine(lines[0]).map(c => c.toLowerCase());
    let startIndex = 0;
    let colSubject = -1;
    let colChapter = -1;
    let colTopic = -1;

    const hasHeader = firstCells.some(c => c.includes('sub') || c.includes('chap') || c.includes('top') || c.includes('mod') || c.includes('title'));
    if (hasHeader) {
      startIndex = 1;
      firstCells.forEach((c, idx) => {
        if (c.includes('sub') || c.includes('track') || c.includes('course')) colSubject = idx;
        else if (c.includes('chap') || c.includes('mod') || c.includes('unit')) colChapter = idx;
        else if (c.includes('top') || c.includes('title') || c.includes('lesson')) colTopic = idx;
      });
    }

    // Determine smart column fallback based on sample line width
    const sampleCells = parseLine(lines[startIndex < lines.length ? startIndex : 0]);
    const numCols = sampleCells.length;

    if (colSubject === -1) colSubject = 0;
    if (colChapter === -1 && colTopic === -1) {
      if (numCols >= 3) {
        colChapter = 1;
        colTopic = 2;
      } else if (numCols === 2) {
        colChapter = -1;
        colTopic = 1;
      }
    } else if (colTopic === -1 && numCols >= 2 && colChapter !== 1) {
      colTopic = numCols >= 3 ? 2 : 1;
    }

    const rows = [];
    for (let i = startIndex; i < lines.length; i++) {
      const cells = parseLine(lines[i]);
      if (cells.length < 1) continue;

      const subject = (colSubject >= 0 && colSubject < cells.length ? cells[colSubject] : cells[0]) || '';
      if (!subject || subject.toLowerCase() === 'subject') continue;
      
      const chapter = (colChapter >= 0 && colChapter < cells.length) ? cells[colChapter] : '';
      const topic = (colTopic >= 0 && colTopic < cells.length) ? cells[colTopic] : '';

      rows.push({ subject, chapter, topic });
    }
    return rows;
  }

  updateCsvParsedPreview() {
    if (!this.textCsvInput || !this.csvParsedSummary || !this.csvSummaryText) return;
    const rows = this.parseCsvData(this.textCsvInput.value);
    if (rows.length === 0) { this.csvParsedSummary.classList.add('hidden'); return; }
    this.csvSummaryText.textContent = `Ready to import: ${rows.length} Total Items!`;
    this.csvParsedSummary.classList.remove('hidden');
  }

  executeCsvImport() {
    if (!this.textCsvInput) return;
    const rows = this.parseCsvData(this.textCsvInput.value);
    if (rows.length === 0) { this.showToast('Please provide valid CSV rows', 'warning'); return; }

    const importMode = document.querySelector('input[name="csvImportMode"]:checked')?.value || 'append';
    if (importMode === 'replace') {
      if (!Array.isArray(this.state.deletedItemIds)) this.state.deletedItemIds = [];
      this.state.items.forEach(i => {
        if (!this.state.deletedItemIds.includes(i.id)) {
          this.state.deletedItemIds.push(i.id);
        }
      });
      this.state.items = [];
    }

    const colors = ['indigo', 'emerald', 'amber', 'rose', 'cyan', 'purple'];
    const subjColors = {};
    this.state.items.forEach(i => subjColors[i.subject] = i.color);

    rows.forEach(r => {
      if (!subjColors[r.subject]) subjColors[r.subject] = colors[Object.keys(subjColors).length % colors.length];
      
      const existing = this.state.items.find(i => 
        (i.subject || '').toLowerCase() === r.subject.toLowerCase() &&
        (i.chapter || '').toLowerCase() === r.chapter.toLowerCase() &&
        (i.topic || '').toLowerCase() === r.topic.toLowerCase()
      );

      if (!existing) {
        this.state.items.push({
          id: 'item-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
          subject: r.subject,
          chapter: r.chapter,
          topic: r.topic,
          color: subjColors[r.subject],
          userLearned: false,
          friendLearned: false,
          updatedAt: Date.now()
        });
      }
    });

    this.saveState();
    this.render();

    if (this.upstash && this.upstash.isConnected) this.pushToUpstash(false);
    if (this.modalImportCSV) this.modalImportCSV.classList.add('hidden');
    
    this.textCsvInput.value = '';
    if (this.csvParsedSummary) this.csvParsedSummary.classList.add('hidden');
    this.showToast(`Imported items successfully!`, 'success');
  }

  closeAllModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden')); }
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
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
  }
  inputTopicClean(str) { return str.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40); }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new AmanStudyTrackerApp(); });
