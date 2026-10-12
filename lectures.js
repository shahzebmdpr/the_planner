/**
 * Aman Study Tracker — Lectures Schedule & Platform Expiry Countdown Manager
 * Zero-dependency client logic connecting seamlessly with existing planner state & Upstash cloud.
 */

const LECTURES_STORAGE_KEY = 'aman_study_tracker_lectures_v1';
const PLANNER_STORAGE_KEY = 'aman_study_tracker_state_v3';
const UPSTASH_STORAGE_KEY = 'aman_study_tracker_upstash_v3';
const AUTH_USER_KEY = 'aman_study_tracker_auth_user_v3';

// Seed sample lectures across existing planner subjects
const SEED_LECTURES = [
  {
    id: 'lec-1',
    subject: 'Algorithms',
    chapter: 'Dynamic Programming',
    title: 'Lecture 14: 0/1 Knapsack & Subset Sum Techniques',
    instructor: 'Prof. Striver / Abdul Bari',
    platform: 'YouTube / Portal',
    videoUrl: 'https://www.youtube.com/watch?v=nLmhmB6NzcM',
    durationMinutes: 78,
    postedAt: Date.now() - 24 * 3600 * 1000, // 1 day ago
    expiresAt: Date.now() + 2 * 24 * 3600 * 1000 + 5 * 3600 * 1000, // expires in 2 days 5 hours
    color: 'indigo',
    userWatched: true,
    friendWatched: false,
    notes: 'Covered tabular optimization and space reduction.'
  },
  {
    id: 'lec-2',
    subject: 'Algorithms',
    chapter: 'Graph Theory',
    title: 'Lecture 08: Dijkstra Algorithm & Priority Queue Implementation',
    instructor: 'Prof. Striver',
    platform: 'YouTube Live',
    videoUrl: 'https://www.youtube.com/watch?v=V6H1qAeB-l4',
    durationMinutes: 92,
    postedAt: Date.now() - 48 * 3600 * 1000,
    expiresAt: Date.now() + 18 * 3600 * 1000, // expires in 18 hours (Urgent!)
    color: 'emerald',
    userWatched: true,
    friendWatched: true,
    notes: 'Crucial for upcoming graph test.'
  },
  {
    id: 'lec-3',
    subject: 'Mathematics',
    chapter: 'Discrete Mathematics',
    title: 'Lecture 03: Combinatorics, Permutations & Pigeonhole Principle',
    instructor: 'Gate Smashers',
    platform: 'Physics Wallah App',
    videoUrl: 'https://www.youtube.com/watch?v=Zc54gFhdpLA',
    durationMinutes: 65,
    postedAt: Date.now() - 12 * 3600 * 1000,
    expiresAt: Date.now() + 5 * 24 * 3600 * 1000, // expires in 5 days
    color: 'amber',
    userWatched: false,
    friendWatched: false,
    notes: 'Solve problem sheet 3 after watching.'
  }
];

class LecturesApp {
  constructor() {
    this.plannerState = this.loadPlannerState();
    this.deletedLectureIds = this.loadDeletedLectureIds();
    this.lectures = this.loadLectures();
    this.currentAuthUser = localStorage.getItem(AUTH_USER_KEY) || 'user';
    this.isMasterUnlocked = false;
    this.selectedSubject = 'all';
    this.statusFilter = 'all'; // all | available | urgent | expired | watched
    this.searchQuery = '';
    this.clockInterval = null;
    this.autoPushTimer = null;
    this.syncPollTimer = null;
    this.isSyncing = false;
    this.lastRemoteUpdatedAt = 0;
    this.activePlayerLecture = null;

    this.upstash = this.loadUpstashConfig();

    this.initElements();
    this.attachEvents();
    this.updateProfilesUI();
    this.render();

    // Initialize cloud synchronization
    this.initUpstash();

    // Start live countdown refresh every 10 seconds
    this.clockInterval = setInterval(() => {
      this.updateCountdownTimes();
      this.updateStatsCounters();
    }, 10000);
  }

  canPerformAction(action) {
    if (this.isMasterUnlocked) return true;
    const perms = this.plannerState?.permissions || {
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

    const perms = this.plannerState?.permissions || {};
    const rule = perms[action] || 'both';
    const uName = this.plannerState?.profiles?.user?.name || 'Shahzeb';
    const fName = this.plannerState?.profiles?.friend?.name || 'Aman';

    let allowedText = 'Master Key holder only';
    if (rule === 'user') allowedText = `${uName} only`;
    if (rule === 'friend') allowedText = `${fName} only`;

    const enteredKey = prompt(`🔒 Action Restricted by Owner\n\nPermission to ${description} is restricted to ${allowedText}.\n\nEnter Master Key to authorize this action:`);
    if (enteredKey !== null) {
      const expected = this.plannerState?.auth?.masterKey || 'thekey';
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

  loadPlannerState() {
    try {
      const saved = localStorage.getItem(PLANNER_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      profiles: {
        user: { id: 'user', name: 'Shahzeb', initials: 'SH' },
        friend: { id: 'friend', name: 'Aman', initials: 'AM' }
      },
      items: [],
      lectures: [],
      deletedLectureIds: []
    };
  }

  loadDeletedLectureIds() {
    try {
      const saved = this.plannerState?.deletedLectureIds;
      if (Array.isArray(saved)) return saved;
    } catch (e) {}
    return [];
  }

  loadLectures() {
    try {
      const saved = localStorage.getItem(LECTURES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const delSet = new Set(this.deletedLectureIds || []);
          return parsed.filter(l => !delSet.has(l.id));
        }
      }
    } catch (e) {}
    // Seed initial
    return JSON.parse(JSON.stringify(SEED_LECTURES));
  }

  loadUpstashConfig() {
    try {
      const saved = localStorage.getItem(UPSTASH_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    if (this.plannerState && this.plannerState.upstash) {
      try {
        return JSON.parse(JSON.stringify(this.plannerState.upstash));
      } catch (e) {}
    }
    return { url: '', token: '', roomId: 'study-duo-room-1', autoSync: true, pollInterval: 10000, isConnected: false, lastSyncedAt: null, useServerProxy: false };
  }

  saveUpstashConfig() {
    try { localStorage.setItem(UPSTASH_STORAGE_KEY, JSON.stringify(this.upstash)); } catch (e) {}
  }

  saveLectures() {
    this.saveLecturesLocallyWithoutPush();
    this.triggerAutoPush();
  }

  saveLecturesLocallyWithoutPush() {
    try {
      localStorage.setItem(LECTURES_STORAGE_KEY, JSON.stringify(this.lectures));
      this.plannerState.lectures = this.lectures;
      this.plannerState.deletedLectureIds = this.deletedLectureIds;
      localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(this.plannerState));
    } catch (e) {}
    this.render();
  }

  async initUpstash() {
    this.updateCloudStatusUI();

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
            this.updateCloudStatusUI();
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

  updateCloudStatusUI(syncState = null) {
    const isConn = !!this.upstash.isConnected;
    if (this.cloudStatusPill) {
      this.cloudStatusPill.className = 'cloud-pill-status ' + (syncState === 'syncing' ? 'syncing' : (isConn ? 'connected' : ''));
    }
    if (this.cloudStatusLabel) {
      this.cloudStatusLabel.textContent = syncState === 'syncing' ? 'Syncing...' : (isConn ? 'Cloud Live 🟢' : 'Local Only ⚪');
    }
  }

  triggerAutoPush() {
    clearTimeout(this.autoPushTimer);
    this.autoPushTimer = setTimeout(() => this.pushToUpstash(false), 800);
  }

  async pushToUpstash(notify = true) {
    if (!this.upstash.isConnected) {
      if (notify) this.showToast('Cloud sync is not configured.', 'info');
      return;
    }
    this.updateCloudStatusUI('syncing');

    try {
      const isFriend = this.currentAuthUser === 'friend';
      const senderName = isFriend ? (this.plannerState.profiles?.friend?.name || 'Aman') : (this.plannerState.profiles?.user?.name || 'Shahzeb');
      
      this.plannerState.lectures = this.lectures;
      this.plannerState.deletedLectureIds = this.deletedLectureIds;

      const payload = {
        state: this.plannerState,
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
      this.updateCloudStatusUI();
      if (notify) this.showToast('All lectures synced to Upstash Cloud!', 'success');
    } catch (err) {
      this.updateCloudStatusUI();
      if (notify) this.showToast('Cloud sync failed: ' + err.message, 'warning');
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
          if (remote && remote.state && (notify || remote.updatedAt > (this.lastRemoteUpdatedAt || 0))) {
            this.lastRemoteUpdatedAt = Math.max(this.lastRemoteUpdatedAt || 0, remote.updatedAt || 0);
            this.mergeRemoteState(remote.state);
            this.saveLecturesLocallyWithoutPush();
            this.updateProfilesUI();
            this.render();
            if (notify) this.showToast('Synced latest lectures from cloud!', 'success');
          } else if (notify) {
            this.showToast('Already up-to-date with cloud!', 'info');
          }
        } else if (data && !data.result) {
          this.pushToUpstash(false);
          if (notify) this.showToast('Cloud was empty; uploaded local lectures.', 'info');
        }
      }
      this.upstash.lastSyncedAt = Date.now();
      this.saveUpstashConfig();
      this.updateCloudStatusUI();
    } catch (err) {
    } finally {
      this.isSyncing = false;
    }
  }

  mergeRemoteState(remoteState) {
    if (remoteState.profiles) {
      this.plannerState.profiles = remoteState.profiles;
    }
    if (remoteState.permissions) {
      this.plannerState.permissions = remoteState.permissions;
    }
    if (remoteState.auth) {
      this.plannerState.auth = remoteState.auth;
    }

    const deletedSet = new Set(this.deletedLectureIds || []);
    if (Array.isArray(remoteState.deletedLectureIds)) {
      remoteState.deletedLectureIds.forEach(id => deletedSet.add(id));
      this.deletedLectureIds = Array.from(deletedSet);
      this.plannerState.deletedLectureIds = this.deletedLectureIds;
    }

    this.lectures = this.lectures.filter(l => !deletedSet.has(l.id));

    if (Array.isArray(remoteState.lectures)) {
      const localMap = new Map();
      this.lectures.forEach(l => localMap.set(l.id, l));
      const isCurrentFriend = this.currentAuthUser === 'friend';

      remoteState.lectures.forEach(remLec => {
        if (deletedSet.has(remLec.id)) return;
        const localLec = localMap.get(remLec.id);
        if (localLec) {
          if (isCurrentFriend) {
            localLec.userWatched = !!remLec.userWatched;
          } else {
            localLec.friendWatched = !!remLec.friendWatched;
          }
          if ((remLec.updatedAt || 0) >= (localLec.updatedAt || 0)) {
            Object.assign(localLec, remLec);
          }
        } else {
          this.lectures.push(remLec);
        }
      });
    }

    this.plannerState.lectures = this.lectures;
  }

  startSyncPolling() {
    this.stopSyncPolling();
    const interval = this.upstash.pollInterval || 10000;
    if (interval > 0) {
      this.syncPollTimer = setInterval(() => this.pullFromUpstash(false), interval);
    }
  }

  stopSyncPolling() {
    if (this.syncPollTimer) {
      clearInterval(this.syncPollTimer);
      this.syncPollTimer = null;
    }
  }

  initElements() {
    this.headerUserAvatar = document.getElementById('headerUserAvatar');
    this.headerUserName = document.getElementById('headerUserName');
    this.btnOpenAddLecture = document.getElementById('btnOpenAddLecture');
    this.btnQuickAddLec = document.getElementById('btnQuickAddLec');
    this.btnEmptyAddLec = document.getElementById('btnEmptyAddLec');

    // Stats
    this.statTotalAvailable = document.getElementById('statTotalAvailable');
    this.statUrgentExpires = document.getElementById('statUrgentExpires');
    this.statExpired = document.getElementById('statExpired');
    this.statWatched = document.getElementById('statWatched');

    // Controls
    this.subjectFilterBar = document.getElementById('subjectFilterBar');
    this.statusFilterGroup = document.getElementById('statusFilterGroup');
    this.lectureSearchInput = document.getElementById('lectureSearchInput');

    // List & Empty state
    this.lecturesListContainer = document.getElementById('lecturesListContainer');
    this.lectureEmptyState = document.getElementById('lectureEmptyState');

    // Modal Add / Edit
    this.modalLecture = document.getElementById('modalLecture');
    this.formLecture = document.getElementById('formLecture');
    this.modalLectureTitle = document.getElementById('modalLectureTitle');
    this.btnCloseModalLecture = document.getElementById('btnCloseModalLecture');
    this.btnCancelLecture = document.getElementById('btnCancelLecture');

    this.inputLecId = document.getElementById('inputLecId');
    this.inputLecSubject = document.getElementById('inputLecSubject');
    this.subjectDatalist = document.getElementById('subjectDatalist');
    this.inputLecChapter = document.getElementById('inputLecChapter');
    this.inputLecTitle = document.getElementById('inputLecTitle');
    this.inputLecDuration = document.getElementById('inputLecDuration');
    this.inputLecInstructor = document.getElementById('inputLecInstructor');
    this.inputLecPlatform = document.getElementById('inputLecPlatform');
    this.inputLecUrl = document.getElementById('inputLecUrl');
    this.inputLecExpiresAt = document.getElementById('inputLecExpiresAt');
    this.inputLecNotes = document.getElementById('inputLecNotes');
    this.labelWatchSelf = document.getElementById('labelWatchSelf');
    this.checkInitialWatched = document.getElementById('checkInitialWatched');

    // Toast
    this.toastContainer = document.getElementById('toastContainer');

    // Cloud Status
    this.cloudStatusPill = document.getElementById('cloudStatusPill');
    this.cloudStatusLabel = document.getElementById('cloudStatusLabel');
    this.btnCloudSyncNow = document.getElementById('btnCloudSyncNow');

    // Persona Switcher
    this.headerProfileBadge = document.getElementById('headerProfileBadge');

    // Smart Instant URL Auto-Fetch Section
    this.formSmartFetch = document.getElementById('formSmartFetch');
    this.inputSmartVideoUrl = document.getElementById('inputSmartVideoUrl');
    this.btnSmartSubmit = document.getElementById('btnSmartSubmit');
    this.spinnerSmartFetch = document.getElementById('spinnerSmartFetch');
    this.btnSmartSubmitText = document.getElementById('btnSmartSubmitText');

    // Modal Smart Auto-Fetch
    this.inputModalAutoUrl = document.getElementById('inputModalAutoUrl');
    this.btnModalAutoFetch = document.getElementById('btnModalAutoFetch');
    this.spinnerModalAutoFetch = document.getElementById('spinnerModalAutoFetch');
    this.btnModalAutoFetchText = document.getElementById('btnModalAutoFetchText');

    // Embedded Video Player Modal
    this.modalVideoPlayer = document.getElementById('modalVideoPlayer');
    this.playerSubjectBadge = document.getElementById('playerSubjectBadge');
    this.playerLectureTitle = document.getElementById('playerLectureTitle');
    this.playerExternalLink = document.getElementById('playerExternalLink');
    this.btnCloseVideoPlayer = document.getElementById('btnCloseVideoPlayer');
    this.videoTheatreContainer = document.getElementById('videoTheatreContainer');
    this.playerInstructorText = document.getElementById('playerInstructorText');
    this.playerPlatformText = document.getElementById('playerPlatformText');
    this.playerDurationText = document.getElementById('playerDurationText');
    this.playerExpiryText = document.getElementById('playerExpiryText');
    this.playerNotesText = document.getElementById('playerNotesText');
    this.playerToggleUserWatch = document.getElementById('playerToggleUserWatch');
    this.playerUserWatchStatus = document.getElementById('playerUserWatchStatus');
    this.playerUserName = document.getElementById('playerUserName');
    this.playerToggleFriendWatch = document.getElementById('playerToggleFriendWatch');
    this.playerFriendWatchStatus = document.getElementById('playerFriendWatchStatus');
    this.playerFriendName = document.getElementById('playerFriendName');
  }

  attachEvents() {
    // Header Persona Switcher Click (easily switch active user profile)
    if (this.headerProfileBadge) {
      this.headerProfileBadge.style.cursor = 'pointer';
      this.headerProfileBadge.title = 'Click to switch active user persona';
      this.headerProfileBadge.addEventListener('click', () => {
        const nextUser = this.currentAuthUser === 'user' ? 'friend' : 'user';
        this.currentAuthUser = nextUser;
        localStorage.setItem(AUTH_USER_KEY, nextUser);
        this.updateProfilesUI();
        this.render();
        const pName = nextUser === 'friend' ? (this.plannerState.profiles?.friend?.name || 'Aman') : (this.plannerState.profiles?.user?.name || 'Shahzeb');
        this.showToast(`Active profile switched to ${pName}!`, 'info');
      });
    }

    // Top Instant Smart URL Fetch & Add
    if (this.formSmartFetch) {
      this.formSmartFetch.addEventListener('submit', (e) => this.handleSmartFetchAndAdd(e));
    }
    if (this.inputSmartVideoUrl) {
      this.inputSmartVideoUrl.addEventListener('paste', () => {
        setTimeout(() => {
          if (this.inputSmartVideoUrl.value.trim().length > 10) {
            this.handleSmartFetchAndAdd();
          }
        }, 120);
      });
    }

    // Modal Smart Auto-Fetch
    if (this.btnModalAutoFetch) {
      this.btnModalAutoFetch.addEventListener('click', () => this.handleModalAutoFetch());
    }
    if (this.inputModalAutoUrl) {
      this.inputModalAutoUrl.addEventListener('paste', () => {
        setTimeout(() => {
          if (this.inputModalAutoUrl.value.trim().length > 10) {
            this.handleModalAutoFetch();
          }
        }, 120);
      });
      this.inputModalAutoUrl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleModalAutoFetch();
        }
      });
    }

    // Open Add Modal
    const openAdd = () => this.openAddModal();
    if (this.btnOpenAddLecture) this.btnOpenAddLecture.addEventListener('click', openAdd);
    if (this.btnQuickAddLec) this.btnQuickAddLec.addEventListener('click', openAdd);
    if (this.btnEmptyAddLec) this.btnEmptyAddLec.addEventListener('click', openAdd);

    // Close Modal
    if (this.btnCloseModalLecture) this.btnCloseModalLecture.addEventListener('click', () => this.closeModal());
    if (this.btnCancelLecture) this.btnCancelLecture.addEventListener('click', () => this.closeModal());
    if (this.modalLecture) {
      this.modalLecture.addEventListener('click', (e) => {
        if (e.target === this.modalLecture) this.closeModal();
      });
    }

    // Cloud Sync click
    if (this.btnCloudSyncNow) {
      this.btnCloudSyncNow.addEventListener('click', async () => {
        this.showToast('Syncing with Upstash Cloud...', 'info');
        await this.pullFromUpstash(false);
        await this.pushToUpstash(true);
      });
    }
    if (this.cloudStatusPill) {
      this.cloudStatusPill.addEventListener('click', () => {
        this.pullFromUpstash(true);
      });
    }

    // Video Player Close & Modal Outside Click
    if (this.btnCloseVideoPlayer) {
      this.btnCloseVideoPlayer.addEventListener('click', () => this.closeVideoPlayer());
    }
    if (this.modalVideoPlayer) {
      this.modalVideoPlayer.addEventListener('click', (e) => {
        if (e.target === this.modalVideoPlayer) this.closeVideoPlayer();
      });
    }

    // Video Player Watch Toggles (Strictly locked to active authenticated user + immediate cloud sync)
    if (this.playerToggleUserWatch) {
      this.playerToggleUserWatch.addEventListener('click', () => {
        if (!this.activePlayerLecture) return;
        const uName = this.plannerState.profiles?.user?.name || 'Shahzeb';
        if (this.currentAuthUser !== 'user') {
          this.showToast(`🔒 Locked: Only ${uName} can mark their own completion!`, 'warning');
          return;
        }
        this.activePlayerLecture.userWatched = !this.activePlayerLecture.userWatched;
        this.activePlayerLecture.updatedAt = Date.now();
        this.saveLectures();
        this.pushToUpstash(false);
        this.updatePlayerWatchButtons();
        this.renderCards();
        this.showToast(`Watch status updated & synced!`, 'success');
      });
    }
    if (this.playerToggleFriendWatch) {
      this.playerToggleFriendWatch.addEventListener('click', () => {
        if (!this.activePlayerLecture) return;
        const fName = this.plannerState.profiles?.friend?.name || 'Aman';
        if (this.currentAuthUser !== 'friend') {
          this.showToast(`🔒 Locked: Only ${fName} can mark their own completion!`, 'warning');
          return;
        }
        this.activePlayerLecture.friendWatched = !this.activePlayerLecture.friendWatched;
        this.activePlayerLecture.updatedAt = Date.now();
        this.saveLectures();
        this.pushToUpstash(false);
        this.updatePlayerWatchButtons();
        this.renderCards();
        this.showToast(`Watch status updated & synced!`, 'success');
      });
    }

    // Form Submit
    if (this.formLecture) this.formLecture.addEventListener('submit', (e) => this.handleSaveLecture(e));

    // Search Input
    if (this.lectureSearchInput) {
      this.lectureSearchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderCards();
      });
    }

    // Status Filter Pills
    if (this.statusFilterGroup) {
      this.statusFilterGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.status-tab-btn');
        if (!btn) return;
        this.statusFilter = btn.dataset.status || 'all';
        this.statusFilterGroup.querySelectorAll('.status-tab-btn').forEach(b => {
          b.classList.toggle('active', b === btn);
        });
        this.renderCards();
      });
    }

    // Quick presets buttons for expiry date (e.g., 24h, 48h, 7d)
    document.querySelectorAll('.btn-expiry-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const hours = parseInt(btn.dataset.hours, 10);
        if (hours) {
          const target = new Date(Date.now() + hours * 3600 * 1000);
          this.setDateTimePicker(target);
        }
      });
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
        this.closeVideoPlayer();
      }
    });

    // Cross-tab sync
    window.addEventListener('storage', (e) => {
      if (e.key === LECTURES_STORAGE_KEY) {
        this.lectures = this.loadLectures();
        this.render();
      }
      if (e.key === PLANNER_STORAGE_KEY) {
        this.plannerState = this.loadPlannerState();
        this.updateProfilesUI();
        this.renderSubjectFilterPills();
      }
    });
  }

  setDateTimePicker(date) {
    if (!this.inputLecExpiresAt) return;
    // Format to YYYY-MM-DDTHH:mm for datetime-local
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    this.inputLecExpiresAt.value = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  updateProfilesUI() {
    const { user, friend } = this.plannerState.profiles || {
      user: { name: 'Shahzeb', initials: 'SH' },
      friend: { name: 'Aman', initials: 'AM' }
    };
    const isFriend = this.currentAuthUser === 'friend';
    const primary = isFriend ? friend : user;

    if (this.headerUserName) this.headerUserName.textContent = `${primary.name} (You)`;
    if (this.headerUserAvatar) {
      if (primary.avatarUrl) {
        this.headerUserAvatar.innerHTML = `<img src="${this.escapeHtml(primary.avatarUrl)}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      } else {
        this.headerUserAvatar.textContent = primary.initials || 'ME';
      }
    }
  }

  render() {
    this.renderSubjectFilterPills();
    this.updateStatsCounters();
    this.renderCards();
    this.populateSubjectDatalist();
  }

  // Get distinct list of subjects from both planner items and added lectures
  getAllSubjects() {
    const subjectsMap = new Map();

    // From planner
    if (Array.isArray(this.plannerState.items)) {
      this.plannerState.items.forEach(i => {
        const s = (i.subject || 'General').trim();
        if (!subjectsMap.has(s)) {
          subjectsMap.set(s, { name: s, color: i.color || 'indigo', count: 0 });
        }
      });
    }

    // Count lectures per subject
    this.lectures.forEach(l => {
      const s = (l.subject || 'General').trim();
      if (!subjectsMap.has(s)) {
        subjectsMap.set(s, { name: s, color: l.color || 'indigo', count: 0 });
      }
      subjectsMap.get(s).count++;
    });

    return Array.from(subjectsMap.values());
  }

  populateSubjectDatalist() {
    if (!this.subjectDatalist) return;
    const subjects = this.getAllSubjects();
    this.subjectDatalist.innerHTML = subjects.map(s => `<option value="${this.escapeHtml(s.name)}"></option>`).join('');
  }

  renderSubjectFilterPills() {
    if (!this.subjectFilterBar) return;
    const subjects = this.getAllSubjects();
    const totalCount = this.lectures.length;

    let html = `
      <button type="button" class="subject-pill-btn ${this.selectedSubject === 'all' ? 'active' : ''}" data-subject="all">
        <span>🌐 All Subjects</span>
        <span class="pill-badge">${totalCount}</span>
      </button>
    `;

    subjects.forEach(s => {
      const isActive = this.selectedSubject === s.name;
      html += `
        <button type="button" class="subject-pill-btn theme-${s.color} ${isActive ? 'active' : ''}" data-subject="${this.escapeHtml(s.name)}">
          <span>${this.escapeHtml(s.name)}</span>
          <span class="pill-badge">${s.count}</span>
        </button>
      `;
    });

    this.subjectFilterBar.innerHTML = html;

    this.subjectFilterBar.querySelectorAll('.subject-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.selectedSubject = btn.dataset.subject;
        this.subjectFilterBar.querySelectorAll('.subject-pill-btn').forEach(b => {
          b.classList.toggle('active', b === btn);
        });
        this.renderCards();
      });
    });
  }

  getFilteredLectures() {
    const now = Date.now();

    return this.lectures.filter(l => {
      // 1. Subject filter
      if (this.selectedSubject !== 'all') {
        if ((l.subject || 'General').trim() !== this.selectedSubject.trim()) return false;
      }

      // 2. Status filter
      const isExpired = l.expiresAt && l.expiresAt <= now;
      const hoursRemaining = l.expiresAt ? (l.expiresAt - now) / (3600 * 1000) : 999;
      const isUrgent = !isExpired && hoursRemaining > 0 && hoursRemaining <= 24;
      const isFriend = this.currentAuthUser === 'friend';
      const myWatched = isFriend ? l.friendWatched : l.userWatched;

      if (this.statusFilter === 'available' && isExpired) return false;
      if (this.statusFilter === 'urgent' && !isUrgent) return false;
      if (this.statusFilter === 'expired' && !isExpired) return false;
      if (this.statusFilter === 'watched' && !myWatched) return false;

      // 3. Search query
      if (this.searchQuery) {
        const text = `${l.title} ${l.subject} ${l.chapter || ''} ${l.instructor || ''} ${l.platform || ''}`.toLowerCase();
        if (!text.includes(this.searchQuery)) return false;
      }

      return true;
    });
  }

  updateStatsCounters() {
    const now = Date.now();
    let availableCount = 0;
    let urgentCount = 0;
    let expiredCount = 0;
    let watchedCount = 0;

    const isFriend = this.currentAuthUser === 'friend';

    this.lectures.forEach(l => {
      const isExpired = l.expiresAt && l.expiresAt <= now;
      const hoursLeft = l.expiresAt ? (l.expiresAt - now) / (3600 * 1000) : 999;
      const myWatched = isFriend ? l.friendWatched : l.userWatched;

      if (!isExpired) availableCount++;
      if (!isExpired && hoursLeft > 0 && hoursLeft <= 24) urgentCount++;
      if (isExpired) expiredCount++;
      if (myWatched) watchedCount++;
    });

    if (this.statTotalAvailable) this.statTotalAvailable.textContent = availableCount;
    if (this.statUrgentExpires) this.statUrgentExpires.textContent = urgentCount;
    if (this.statExpired) this.statExpired.textContent = expiredCount;
    if (this.statWatched) this.statWatched.textContent = watchedCount;
  }

  // Calculate remaining human readable time + expiry state
  computeExpiryInfo(expiresAt, postedAt) {
    if (!expiresAt) {
      return { status: 'status-active', text: 'Permanent access', pct: 100, isExpired: false, isUrgent: false };
    }

    const now = Date.now();
    const diffMs = expiresAt - now;

    if (diffMs <= 0) {
      const pastHours = Math.abs(Math.round(diffMs / (3600 * 1000)));
      const pastText = pastHours < 24 ? `${pastHours}h ago` : `${Math.round(pastHours / 24)}d ago`;
      return {
        status: 'status-expired',
        text: `Expired ${pastText}`,
        detailText: 'Removed from platform',
        pct: 0,
        isExpired: true,
        isUrgent: false
      };
    }

    // Time calculations
    const hoursTotal = diffMs / (3600 * 1000);
    const days = Math.floor(hoursTotal / 24);
    const hours = Math.floor(hoursTotal % 24);
    const minutes = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));

    let countdownText = '';
    if (days > 0) {
      countdownText = `${days}d ${hours}h left on platform`;
    } else if (hours > 0) {
      countdownText = `${hours}h ${minutes}m remaining`;
    } else {
      countdownText = `${minutes}m remaining (Expiring soon!)`;
    }

    // Percentage of time remaining since posted
    let pct = 100;
    const start = postedAt || (expiresAt - 7 * 24 * 3600 * 1000);
    const totalDuration = expiresAt - start;
    if (totalDuration > 0) {
      pct = Math.max(0, Math.min(100, Math.round((diffMs / totalDuration) * 100)));
    }

    const isUrgent = hoursTotal <= 24;
    return {
      status: isUrgent ? 'status-urgent' : 'status-active',
      text: countdownText,
      detailText: `Available until ${new Date(expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      pct,
      isExpired: false,
      isUrgent
    };
  }

  renderCards() {
    if (!this.lecturesListContainer) return;
    this.lecturesListContainer.innerHTML = '';

    const list = this.getFilteredLectures();

    if (list.length === 0) {
      if (this.lectureEmptyState) this.lectureEmptyState.classList.remove('hidden');
      return;
    }

    if (this.lectureEmptyState) this.lectureEmptyState.classList.add('hidden');

    // Group filtered lectures by subject
    const grouped = {};
    list.forEach(item => {
      const subj = (item.subject || 'General').trim();
      if (!grouped[subj]) {
        grouped[subj] = {
          color: item.color || 'indigo',
          items: []
        };
      }
      grouped[subj].items.push(item);
    });

    const { user, friend } = this.plannerState.profiles || {
      user: { name: 'Shahzeb' },
      friend: { name: 'Aman' }
    };
    const isFriend = this.currentAuthUser === 'friend';

    for (const [subjName, subjGroup] of Object.entries(grouped)) {
      const groupEl = document.createElement('section');
      groupEl.className = 'subject-lecture-group';

      groupEl.innerHTML = `
        <div class="subject-group-header">
          <div class="group-header-title">
            <span class="subject-tag-badge theme-${subjGroup.color}">📘 ${this.escapeHtml(subjName)}</span>
            <span class="group-lecture-count">${subjGroup.items.length} Lecture${subjGroup.items.length === 1 ? '' : 's'}</span>
          </div>
          <button type="button" class="btn btn-secondary btn-sm btn-quick-add-group" data-subject="${this.escapeHtml(subjName)}">
            + Add to ${this.escapeHtml(subjName)}
          </button>
        </div>
        <div class="lecture-cards-grid"></div>
      `;

      groupEl.querySelector('.btn-quick-add-group').addEventListener('click', () => {
        this.openAddModal(subjName, subjGroup.color);
      });

      const grid = groupEl.querySelector('.lecture-cards-grid');

      subjGroup.items.forEach(lec => {
        const card = this.createLectureCard(lec, user, friend, isFriend);
        grid.appendChild(card);
      });

      this.lecturesListContainer.appendChild(groupEl);
    }
  }

  createLectureCard(lec, user, friend, isFriend) {
    const card = document.createElement('article');
    const expiry = this.computeExpiryInfo(lec.expiresAt, lec.postedAt);
    
    // Status modifier
    let statusClass = expiry.status;
    const myWatched = isFriend ? lec.friendWatched : lec.userWatched;
    if (myWatched) {
      statusClass = 'status-watched';
    }

    card.className = `lecture-card ${statusClass} theme-${lec.color || 'indigo'}`;
    card.setAttribute('data-id', lec.id);

    const formattedDuration = lec.durationMinutes ? `${lec.durationMinutes} mins` : 'Unspecified duration';
    const canEditUser = this.currentAuthUser === 'user';
    const canEditFriend = this.currentAuthUser === 'friend';

    card.innerHTML = `
      <div class="lecture-card-status-bar"></div>
      <div class="lecture-card-body">
        <div class="lecture-card-top">
          <div class="lecture-title-box">
            ${lec.chapter ? `<span class="lecture-chapter-chip">📂 ${this.escapeHtml(lec.chapter)}</span>` : ''}
            <h3 class="lecture-title">${this.escapeHtml(lec.title)}</h3>
          </div>
          <button type="button" class="lecture-card-menu-btn btn-edit-lec" title="Edit lecture">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
        </div>

        <!-- Meta tags -->
        <div class="lecture-meta-row">
          <span class="meta-chip chip-duration" title="Estimated video duration">⏱️ ${formattedDuration}</span>
          ${lec.platform ? `<span class="meta-chip" title="Hosting Platform">📺 ${this.escapeHtml(lec.platform)}</span>` : ''}
          ${lec.instructor ? `<span class="meta-chip" title="Instructor">👨‍🏫 ${this.escapeHtml(lec.instructor)}</span>` : ''}
        </div>

        <!-- In-Card Video Preview Box directly on the page -->
        <div class="lecture-card-preview-box" data-lec-id="${lec.id}"></div>

        <!-- Platform Expiry Countdown -->
        <div class="lecture-expiry-section">
          <div class="expiry-badge-row">
            <span class="expiry-countdown">
              ${expiry.isExpired ? '⚠️' : expiry.isUrgent ? '⏳' : '⌛'} ${expiry.text}
            </span>
            <span class="expiry-absolute-date">${expiry.detailText || ''}</span>
          </div>
          <div class="expiry-progress-track" title="${expiry.pct}% platform availability remaining">
            <div class="expiry-progress-fill" style="width: ${expiry.pct}%;"></div>
          </div>
        </div>

        ${lec.notes ? `<p class="lecture-notes" style="font-size:0.78rem;color:var(--text-muted);margin:0;line-height:1.4;">📝 ${this.escapeHtml(lec.notes)}</p>` : ''}

        <!-- Duo Study Watch Progress (Locked to Authenticated User) -->
        <div class="lecture-duo-watch">
          <button type="button" class="duo-watch-btn user-btn ${lec.userWatched ? 'completed' : ''} ${!canEditUser ? 'locked' : ''}" data-target="user" title="${canEditUser ? 'Toggle your completion' : '🔒 Locked: Only ' + this.escapeHtml(user.name) + ' can mark completion'}">
            <span>${lec.userWatched ? '✓ Watched' : '○ Pending'} ${!canEditUser ? '<span class="lock-icon-tag">🔒</span>' : ''}</span>
            <span style="opacity:0.8;">(${this.escapeHtml(user.name)})</span>
          </button>
          <button type="button" class="duo-watch-btn friend-btn ${lec.friendWatched ? 'completed' : ''} ${!canEditFriend ? 'locked' : ''}" data-target="friend" title="${canEditFriend ? 'Toggle your completion' : '🔒 Locked: Only ' + this.escapeHtml(friend.name) + ' can mark completion'}">
            <span>${lec.friendWatched ? '✓ Watched' : '○ Pending'} ${!canEditFriend ? '<span class="lock-icon-tag">🔒</span>' : ''}</span>
            <span style="opacity:0.8;">(${this.escapeHtml(friend.name)})</span>
          </button>
        </div>
      </div>

      <div class="lecture-card-footer">
        <button type="button" class="lecture-link-btn btn-watch-lecture" data-lec-id="${lec.id}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          <span>${lec.videoUrl ? 'Watch in Box' : 'Preview & Notes'}</span>
        </button>
        
        <div class="lecture-card-actions">
          <button type="button" class="btn-icon-subtle btn-delete-lec" title="Delete lecture">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;

    // Render In-Card Video Preview
    const previewBox = card.querySelector('.lecture-card-preview-box');
    if (previewBox) {
      this.renderCardPreview(previewBox, lec);
    }

    // Watch status clicks with strict auth locking & immediate cloud sync
    card.querySelectorAll('.duo-watch-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = btn.dataset.target;
        if (this.currentAuthUser !== target) {
          const allowedName = target === 'user' ? user.name : friend.name;
          this.showToast(`🔒 Locked: Only ${allowedName} can mark their own completion!`, 'warning');
          return;
        }

        if (target === 'user') lec.userWatched = !lec.userWatched;
        if (target === 'friend') lec.friendWatched = !lec.friendWatched;
        lec.updatedAt = Date.now();
        this.saveLectures();
        this.pushToUpstash(false);
        this.render();

        const selfName = target === 'user' ? user.name : friend.name;
        const isDone = target === 'user' ? lec.userWatched : lec.friendWatched;
        this.showToast(`Marked ${isDone ? 'watched' : 'pending'} by ${selfName}! Synced to cloud.`, 'success');
      });
    });

    // Watch lecture button (plays directly in page preview box)
    const btnWatch = card.querySelector('.btn-watch-lecture');
    if (btnWatch) {
      btnWatch.addEventListener('click', (e) => {
        e.stopPropagation();
        const box = card.querySelector('.lecture-card-preview-box');
        const embed = this.parseVideoEmbed(lec.videoUrl);
        if (embed && box) {
          this.playInCard(box, lec, embed);
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          this.openVideoPlayer(lec);
        }
      });
    }

    // Edit button click
    card.querySelector('.btn-edit-lec').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openEditModal(lec);
    });

    // Delete button click
    card.querySelector('.btn-delete-lec').addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteLecture(lec.id, lec.title);
    });

    return card;
  }

  updateCountdownTimes() {
    // Re-evaluate expiry countdowns across rendered cards without full re-render
    document.querySelectorAll('.lecture-card').forEach(card => {
      const id = card.dataset.id;
      const lec = this.lectures.find(l => l.id === id);
      if (!lec) return;

      const expiry = this.computeExpiryInfo(lec.expiresAt, lec.postedAt);
      const countdownEl = card.querySelector('.expiry-countdown');
      const dateEl = card.querySelector('.expiry-absolute-date');
      const barEl = card.querySelector('.expiry-progress-fill');

      if (countdownEl) countdownEl.innerHTML = `${expiry.isExpired ? '⚠️' : expiry.isUrgent ? '⏳' : '⌛'} ${expiry.text}`;
      if (dateEl) dateEl.textContent = expiry.detailText || '';
      if (barEl) barEl.style.width = `${expiry.pct}%`;
    });
  }

  openAddModal(defaultSubject = '', defaultColor = 'indigo') {
    if (!this.checkPermissionOrPrompt('addLecture', 'upload or schedule lectures')) {
      return;
    }

    if (!this.modalLecture) return;

    this.modalLectureTitle.textContent = defaultSubject ? `Add Lecture to ${defaultSubject}` : 'Add Subject Lecture';
    this.inputLecId.value = '';
    this.inputLecSubject.value = defaultSubject || (this.selectedSubject !== 'all' ? this.selectedSubject : '');
    this.inputLecChapter.value = '';
    this.inputLecTitle.value = '';
    this.inputLecDuration.value = 60;
    this.inputLecInstructor.value = '';
    this.inputLecPlatform.value = 'Physics Wallah / Course Portal';
    this.inputLecUrl.value = '';
    this.inputLecNotes.value = '';
    if (this.inputModalAutoUrl) this.inputModalAutoUrl.value = '';

    // Default expiry: 48 hours from now
    const defaultExpiry = new Date(Date.now() + 48 * 3600 * 1000);
    this.setDateTimePicker(defaultExpiry);

    const isFriend = this.currentAuthUser === 'friend';
    const profile = isFriend ? (this.plannerState.profiles?.friend || { name: 'Aman' }) : (this.plannerState.profiles?.user || { name: 'Shahzeb' });
    if (this.labelWatchSelf) this.labelWatchSelf.textContent = profile.name;
    if (this.checkInitialWatched) this.checkInitialWatched.checked = false;

    const colorRadio = document.querySelector(`input[name="lecColor"][value="${defaultColor}"]`);
    if (colorRadio) colorRadio.checked = true;

    this.modalLecture.classList.remove('hidden');
    if (defaultSubject) {
      this.inputLecTitle.focus();
    } else {
      this.inputLecSubject.focus();
    }
  }

  openEditModal(lec) {
    if (!this.checkPermissionOrPrompt('addLecture', 'edit lecture details')) {
      return;
    }

    if (!this.modalLecture) return;

    this.modalLectureTitle.textContent = 'Edit Lecture Details';
    this.inputLecId.value = lec.id;
    this.inputLecSubject.value = lec.subject || '';
    this.inputLecChapter.value = lec.chapter || '';
    this.inputLecTitle.value = lec.title || '';
    this.inputLecDuration.value = lec.durationMinutes || '';
    this.inputLecInstructor.value = lec.instructor || '';
    this.inputLecPlatform.value = lec.platform || '';
    this.inputLecUrl.value = lec.videoUrl || '';
    this.inputLecNotes.value = lec.notes || '';
    if (this.inputModalAutoUrl) this.inputModalAutoUrl.value = lec.videoUrl || '';

    if (lec.expiresAt) {
      this.setDateTimePicker(new Date(lec.expiresAt));
    } else {
      this.inputLecExpiresAt.value = '';
    }

    const isFriend = this.currentAuthUser === 'friend';
    if (this.checkInitialWatched) {
      this.checkInitialWatched.checked = isFriend ? !!lec.friendWatched : !!lec.userWatched;
    }

    const colorRadio = document.querySelector(`input[name="lecColor"][value="${lec.color || 'indigo'}"]`);
    if (colorRadio) colorRadio.checked = true;

    this.modalLecture.classList.remove('hidden');
    this.inputLecTitle.focus();
  }

  closeModal() {
    if (this.modalLecture) this.modalLecture.classList.add('hidden');
  }

  handleSaveLecture(e) {
    e.preventDefault();

    const id = this.inputLecId.value;
    const subject = this.inputLecSubject.value.trim();
    const chapter = this.inputLecChapter.value.trim();
    const title = this.inputLecTitle.value.trim();
    const durationMinutes = parseInt(this.inputLecDuration.value, 10) || 0;
    const instructor = this.inputLecInstructor.value.trim();
    const platform = this.inputLecPlatform.value.trim();
    const videoUrl = this.inputLecUrl.value.trim();
    const notes = this.inputLecNotes.value.trim();
    const color = document.querySelector('input[name="lecColor"]:checked')?.value || 'indigo';

    let expiresAt = null;
    if (this.inputLecExpiresAt.value) {
      expiresAt = new Date(this.inputLecExpiresAt.value).getTime();
    }

    if (!subject || !title) {
      this.showToast('Please provide both subject and lecture title', 'warning');
      return;
    }

    const isFriend = this.currentAuthUser === 'friend';
    const watchedState = this.checkInitialWatched.checked;

    // Detect thumbnail if YouTube link provided
    let autoThumbnail = '';
    if (videoUrl) {
      const ytMatch = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/i);
      if (ytMatch && ytMatch[1]) {
        autoThumbnail = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
      }
    }

    if (id) {
      // Edit
      const existing = this.lectures.find(l => l.id === id);
      if (existing) {
        existing.subject = subject;
        existing.chapter = chapter;
        existing.title = title;
        existing.durationMinutes = durationMinutes;
        existing.instructor = instructor;
        existing.platform = platform;
        existing.videoUrl = videoUrl;
        if (autoThumbnail) existing.thumbnail = autoThumbnail;
        existing.notes = notes;
        existing.color = color;
        existing.expiresAt = expiresAt;
        existing.updatedAt = Date.now();
        if (isFriend) existing.friendWatched = watchedState;
        else existing.userWatched = watchedState;
        this.showToast('Lecture updated successfully!', 'success');
      }
    } else {
      // Create
      const newLec = {
        id: 'lec-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
        subject,
        chapter,
        title,
        durationMinutes,
        instructor,
        platform,
        videoUrl,
        thumbnail: autoThumbnail,
        notes,
        color,
        postedAt: Date.now(),
        expiresAt,
        updatedAt: Date.now(),
        userWatched: !isFriend && watchedState,
        friendWatched: isFriend && watchedState
      };
      this.lectures.unshift(newLec);
      this.showToast('New lecture added and synced!', 'success');
    }

    this.saveLectures();
    this.pushToUpstash(false);
    this.closeModal();
  }

  deleteLecture(id, title) {
    if (!this.checkPermissionOrPrompt('deleteLecture', 'delete platform lectures')) {
      return;
    }

    if (confirm(`Are you sure you want to remove "${title}" from lectures?`)) {
      if (!this.deletedLectureIds.includes(id)) {
        this.deletedLectureIds.push(id);
      }
      this.lectures = this.lectures.filter(l => l.id !== id);
      this.saveLectures();
      this.pushToUpstash(false);
      this.showToast('Lecture removed and synced with cloud.', 'info');
    }
  }

  parseVideoEmbed(rawUrl) {
    if (!rawUrl || !rawUrl.trim()) return null;
    const url = rawUrl.trim();

    // YouTube regex (supports youtu.be, youtube.com/watch?v=, /embed/, /shorts/, /live/)
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/i);
    if (ytMatch && ytMatch[1]) {
      const videoId = ytMatch[1];
      let startParam = '';
      const tMatch = url.match(/[?&]t=(\d+)/);
      if (tMatch && tMatch[1]) startParam = `&start=${tMatch[1]}`;
      return {
        type: 'youtube',
        videoId: videoId,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1${startParam}`,
        directUrl: url
      };
    }

    // Vimeo regex
    const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
      return {
        type: 'vimeo',
        videoId: vimeoMatch[1],
        thumbnailUrl: '',
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
        directUrl: url
      };
    }

    // Direct video file
    if (/\.(mp4|webm|ogg|m4v)(\?.*)?$/i.test(url)) {
      return {
        type: 'video',
        videoId: null,
        thumbnailUrl: '',
        embedUrl: url,
        directUrl: url
      };
    }

    // Generic web preview
    return {
      type: 'web',
      videoId: null,
      thumbnailUrl: '',
      embedUrl: url,
      directUrl: url
    };
  }

  // Render the responsive preview layer inside a lecture card
  renderCardPreview(box, lec) {
    if (!box) return;
    box.innerHTML = '';

    const embed = this.parseVideoEmbed(lec.videoUrl);
    let thumb = lec.thumbnail;
    if (!thumb && embed && embed.thumbnailUrl) {
      thumb = embed.thumbnailUrl;
    }

    if (embed) {
      const thumbLayer = document.createElement('div');
      thumbLayer.className = 'preview-thumb-layer';
      if (thumb) {
        thumbLayer.style.backgroundImage = `url('${thumb}')`;
      } else {
        thumbLayer.style.background = 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';
      }

      thumbLayer.setAttribute('title', 'Click to play video directly in this box');
      thumbLayer.innerHTML = `
        <div class="preview-play-btn-circle" title="Play Video in Card">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6 3 20 12 6 21 6 3"></polygon>
          </svg>
        </div>
        <div class="preview-badges-row">
          <span class="preview-badge-pill">📺 ${this.escapeHtml(lec.platform || 'Online Video')}</span>
          <span class="preview-play-tag">▶ Play in Page</span>
        </div>
      `;

      thumbLayer.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playInCard(box, lec, embed);
      });

      box.appendChild(thumbLayer);
    } else {
      const emptyLayer = document.createElement('div');
      emptyLayer.className = 'preview-thumb-layer';
      emptyLayer.style.background = 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';
      emptyLayer.style.cursor = 'default';
      emptyLayer.innerHTML = `
        <div style="text-align: center; color: #94a3b8; font-size: 0.82rem; padding: 1rem; position: relative; z-index: 2;">
          <div style="font-size: 1.8rem; margin-bottom: 0.25rem;">🎬</div>
          <div style="font-weight: 600; color: #cbd5e1;">Platform Countdown Only</div>
          <div style="font-size: 0.72rem; opacity: 0.8; margin-top: 0.2rem;">Click "Edit" to add video URL</div>
        </div>
      `;
      box.appendChild(emptyLayer);
    }
  }

  // Play video directly inside the card preview box without popup or leaving page
  playInCard(box, lec, embed) {
    if (!box || !embed) return;
    box.innerHTML = `
      <div class="card-inline-player-wrap">
        <div class="card-inline-controls">
          <button type="button" class="btn-inline-ctrl btn-close-inline" title="Close Video Preview">✕ Close</button>
          <button type="button" class="btn-inline-ctrl btn-theatre-inline" title="Expand to Theatre Modal">⛶ Theatre</button>
        </div>
        <iframe class="card-inline-iframe" src="${embed.embedUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen title="${this.escapeHtml(lec.title)}"></iframe>
      </div>
    `;

    box.querySelector('.btn-close-inline')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.renderCardPreview(box, lec);
    });

    box.querySelector('.btn-theatre-inline')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openVideoPlayer(lec);
    });
  }

  // Smart metadata fetcher from video URL (YouTube, Vimeo, etc.) with zero typing required
  async fetchVideoMetadata(rawUrl) {
    if (!rawUrl || !rawUrl.trim()) return null;
    const url = rawUrl.trim();

    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/i);
    const videoId = ytMatch ? ytMatch[1] : null;

    let metadata = {
      title: '',
      instructor: '',
      platform: 'Online Portal',
      thumbnail: '',
      durationMinutes: 60,
      subject: '',
      chapter: '',
      videoUrl: url,
      color: 'indigo'
    };

    if (videoId) {
      metadata.platform = 'YouTube';
      metadata.thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    } else if (/vimeo\.com/i.test(url)) {
      metadata.platform = 'Vimeo';
    } else if (/physicswallah|pw\.live/i.test(url)) {
      metadata.platform = 'Physics Wallah';
    } else if (/unacademy\.com/i.test(url)) {
      metadata.platform = 'Unacademy';
    }

    // 1. Fetch via noembed.com (CORS enabled)
    try {
      const noembedRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
      if (noembedRes.ok) {
        const data = await noembedRes.json();
        if (data && !data.error) {
          if (data.title) metadata.title = data.title;
          if (data.author_name) metadata.instructor = data.author_name;
          if (data.provider_name) metadata.platform = data.provider_name;
          if (data.thumbnail_url) metadata.thumbnail = data.thumbnail_url;
        }
      }
    } catch (e) {
      // Fallback: YouTube oEmbed
      if (videoId) {
        try {
          const ytRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
          if (ytRes.ok) {
            const ytData = await ytRes.json();
            if (ytData.title) metadata.title = ytData.title;
            if (ytData.author_name) metadata.instructor = ytData.author_name;
            if (ytData.thumbnail_url) metadata.thumbnail = ytData.thumbnail_url;
          }
        } catch (err) {}
      }
    }

    // Friendly fallback title if not resolved
    if (!metadata.title) {
      if (videoId) {
        metadata.title = `YouTube Class Video (${videoId})`;
      } else {
        try {
          const parsed = new URL(url);
          metadata.title = `Lecture from ${parsed.hostname}`;
        } catch (e) {
          metadata.title = 'Class Lecture Video';
        }
      }
    }

    // Smart Subject & Color detection from title and instructor
    const textPool = (metadata.title + ' ' + (metadata.instructor || '')).toLowerCase();
    
    // Check user's existing subjects from state
    const existingSubjects = this.plannerState?.subjects || [];
    let matchedSubj = existingSubjects.find(s => s && s.name && textPool.includes(s.name.toLowerCase()));
    
    if (matchedSubj) {
      metadata.subject = matchedSubj.name;
      metadata.color = matchedSubj.color || 'indigo';
    } else {
      const subjectKeywords = [
        { name: 'Physics', color: 'indigo', words: ['physics', 'physic', 'mechanics', 'optics', 'thermo', 'electro', 'kinematics'] },
        { name: 'Chemistry', color: 'teal', words: ['chemistry', 'chemical', 'organic', 'inorganic', 'physical chem', 'reaction'] },
        { name: 'Mathematics', color: 'amber', words: ['math', 'mathematics', 'calculus', 'algebra', 'trigonometry', 'integral', 'matrices'] },
        { name: 'Biology', color: 'emerald', words: ['biology', 'botany', 'zoology', 'genetics', 'cell', 'human physiology'] },
        { name: 'Computer Science', color: 'purple', words: ['computer', 'cs', 'coding', 'python', 'java', 'programming', 'dsa'] },
        { name: 'English', color: 'rose', words: ['english', 'grammar', 'literature'] }
      ];
      for (const sk of subjectKeywords) {
        if (sk.words.some(w => textPool.includes(w))) {
          metadata.subject = sk.name;
          metadata.color = sk.color;
          break;
        }
      }
    }

    if (!metadata.subject) {
      if (existingSubjects.length > 0 && existingSubjects[0].name) {
        metadata.subject = existingSubjects[0].name;
        metadata.color = existingSubjects[0].color || 'indigo';
      } else {
        metadata.subject = 'Physics';
        metadata.color = 'indigo';
      }
    }

    // Detect Chapter / Topic from title
    const chMatch = metadata.title.match(/(?:chapter|ch\.?|unit|module)\s*(\d+|[ivxlcdm]+)[\s:|-]*([^|\n-]+)?/i);
    if (chMatch) {
      metadata.chapter = chMatch[0].trim();
    } else {
      const partMatch = metadata.title.match(/^([^:-|]+)[-:|]/);
      if (partMatch && partMatch[1].length < 35) {
        metadata.chapter = partMatch[1].trim();
      }
    }

    // Detect Duration from title if mentioned
    const hourMatch = metadata.title.match(/(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)/i);
    const minMatch = metadata.title.match(/(\d+)\s*(?:mins?|minutes?)/i);
    if (hourMatch) {
      metadata.durationMinutes = Math.round(parseFloat(hourMatch[1]) * 60);
    } else if (minMatch) {
      metadata.durationMinutes = parseInt(minMatch[1], 10);
    } else {
      metadata.durationMinutes = 60; // 1 hr default
    }

    return metadata;
  }

  // Handle Instant Top Smart URL Add (zero typing needed)
  async handleSmartFetchAndAdd(e) {
    if (e) e.preventDefault();
    if (!this.inputSmartVideoUrl) return;
    const url = this.inputSmartVideoUrl.value.trim();
    if (!url) {
      this.showToast('Please enter a video URL first', 'warning');
      return;
    }

    if (!this.checkPermissionOrPrompt('addLecture', 'auto-fetch and add lectures')) {
      return;
    }

    if (this.spinnerSmartFetch) this.spinnerSmartFetch.classList.remove('hidden');
    if (this.btnSmartSubmitText) this.btnSmartSubmitText.textContent = 'Fetching details...';
    if (this.btnSmartSubmit) this.btnSmartSubmit.disabled = true;

    try {
      const meta = await this.fetchVideoMetadata(url);
      if (!meta || !meta.title) {
        throw new Error('Could not fetch details from link');
      }

      const isFriend = this.currentAuthUser === 'friend';
      // Default expiry 7 days from now
      const expiresAt = Date.now() + 7 * 24 * 3600 * 1000;

      const newLec = {
        id: 'lec-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
        subject: meta.subject || 'Physics',
        chapter: meta.chapter || '',
        title: meta.title,
        durationMinutes: meta.durationMinutes || 60,
        instructor: meta.instructor || '',
        platform: meta.platform || 'YouTube',
        videoUrl: meta.videoUrl || url,
        thumbnail: meta.thumbnail || '',
        notes: `Auto-fetched from ${meta.platform || 'video'}`,
        color: meta.color || 'indigo',
        postedAt: Date.now(),
        expiresAt: expiresAt,
        updatedAt: Date.now(),
        userWatched: false,
        friendWatched: false
      };

      this.lectures.unshift(newLec);
      this.saveLectures();
      this.pushToUpstash(false);

      this.inputSmartVideoUrl.value = '';
      this.showToast(`🎉 Auto-Added: "${newLec.title}"!`, 'success');
      this.render();
    } catch (err) {
      this.showToast(`Error fetching video: ${err.message || 'Please verify link'}`, 'warning');
    } finally {
      if (this.spinnerSmartFetch) this.spinnerSmartFetch.classList.add('hidden');
      if (this.btnSmartSubmitText) this.btnSmartSubmitText.textContent = '⚡ Auto-Fetch & Add';
      if (this.btnSmartSubmit) this.btnSmartSubmit.disabled = false;
    }
  }

  // Handle Modal Auto-Fetch (auto-populates add/edit modal form)
  async handleModalAutoFetch() {
    if (!this.inputModalAutoUrl) return;
    const url = this.inputModalAutoUrl.value.trim();
    if (!url) {
      this.showToast('Paste a video link into the auto-fill field first', 'warning');
      return;
    }

    if (this.spinnerModalAutoFetch) this.spinnerModalAutoFetch.classList.remove('hidden');
    if (this.btnModalAutoFetchText) this.btnModalAutoFetchText.textContent = 'Fetching...';
    if (this.btnModalAutoFetch) this.btnModalAutoFetch.disabled = true;

    try {
      const meta = await this.fetchVideoMetadata(url);
      if (!meta) throw new Error('Could not fetch details');

      if (meta.title && this.inputLecTitle) this.inputLecTitle.value = meta.title;
      if (meta.subject && this.inputLecSubject) this.inputLecSubject.value = meta.subject;
      if (meta.chapter && this.inputLecChapter) this.inputLecChapter.value = meta.chapter;
      if (meta.instructor && this.inputLecInstructor) this.inputLecInstructor.value = meta.instructor;
      if (meta.platform && this.inputLecPlatform) this.inputLecPlatform.value = meta.platform;
      if (meta.durationMinutes && this.inputLecDuration) this.inputLecDuration.value = meta.durationMinutes;
      if (meta.videoUrl && this.inputLecUrl) this.inputLecUrl.value = meta.videoUrl;

      if (meta.color) {
        const colorRadio = document.querySelector(`input[name="lecColor"][value="${meta.color}"]`);
        if (colorRadio) colorRadio.checked = true;
      }

      this.showToast(`⚡ Details auto-filled for "${meta.title}"!`, 'success');
    } catch (err) {
      this.showToast(`Auto-fill error: ${err.message || 'Please check URL'}`, 'warning');
    } finally {
      if (this.spinnerModalAutoFetch) this.spinnerModalAutoFetch.classList.add('hidden');
      if (this.btnModalAutoFetchText) this.btnModalAutoFetchText.textContent = '⚡ Auto-Fill';
      if (this.btnModalAutoFetch) this.btnModalAutoFetch.disabled = false;
    }
  }

  openVideoPlayer(lec) {
    if (!this.modalVideoPlayer) return;
    this.activePlayerLecture = lec;

    const { user, friend } = this.plannerState.profiles || { user: { name: 'Shahzeb' }, friend: { name: 'Aman' } };

    if (this.playerSubjectBadge) this.playerSubjectBadge.textContent = lec.subject || 'Lecture';
    if (this.playerLectureTitle) this.playerLectureTitle.textContent = lec.title || 'Lecture Video';
    if (this.playerExternalLink) {
      this.playerExternalLink.href = lec.videoUrl || '#';
      this.playerExternalLink.style.display = lec.videoUrl ? 'inline-flex' : 'none';
    }
    if (this.playerInstructorText) this.playerInstructorText.textContent = lec.instructor || 'Instructor';
    if (this.playerPlatformText) this.playerPlatformText.textContent = lec.platform || 'Online Portal';
    if (this.playerDurationText) this.playerDurationText.textContent = `${lec.durationMinutes || 60} mins`;
    
    const expiry = this.computeExpiryInfo(lec.expiresAt, lec.postedAt);
    if (this.playerExpiryText) this.playerExpiryText.textContent = expiry.text;
    if (this.playerNotesText) {
      this.playerNotesText.textContent = lec.notes ? `📝 ${lec.notes}` : '';
      this.playerNotesText.style.display = lec.notes ? 'block' : 'none';
    }

    this.updatePlayerWatchButtons();

    const container = this.videoTheatreContainer;
    container.innerHTML = '';

    const embed = this.parseVideoEmbed(lec.videoUrl);
    if (!embed) {
      container.innerHTML = `
        <div class="theatre-fallback-prompt">
          <div style="font-size:2.5rem;">🎬</div>
          <h4 style="color:#fff;margin:0;font-size:1.15rem;">No Direct Video URL Attached</h4>
          <p>This lecture was scheduled for platform countdown tracking. You can edit this lecture to add its YouTube video or website class link anytime.</p>
          <button type="button" class="btn btn-primary btn-sm btn-edit-from-theatre">Edit & Add URL</button>
        </div>
      `;
      container.querySelector('.btn-edit-from-theatre')?.addEventListener('click', () => {
        this.closeVideoPlayer();
        this.openEditModal(lec);
      });
    } else if (embed.type === 'youtube' || embed.type === 'vimeo') {
      const iframe = document.createElement('iframe');
      iframe.className = 'theatre-iframe';
      iframe.src = embed.embedUrl;
      iframe.title = lec.title;
      iframe.frameBorder = '0';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      container.appendChild(iframe);
    } else if (embed.type === 'video') {
      const video = document.createElement('video');
      video.className = 'theatre-video';
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      const src = document.createElement('source');
      src.src = embed.embedUrl;
      video.appendChild(src);
      container.appendChild(video);
    } else {
      const iframe = document.createElement('iframe');
      iframe.className = 'theatre-iframe';
      iframe.src = embed.embedUrl;
      iframe.title = lec.title;
      iframe.allow = 'autoplay; fullscreen';
      container.appendChild(iframe);
    }

    this.modalVideoPlayer.classList.remove('hidden');
  }

  updatePlayerWatchButtons() {
    if (!this.activePlayerLecture) return;
    const lec = this.activePlayerLecture;
    const { user, friend } = this.plannerState.profiles || { user: { name: 'Shahzeb' }, friend: { name: 'Aman' } };
    const canEditUser = this.currentAuthUser === 'user';
    const canEditFriend = this.currentAuthUser === 'friend';

    if (this.playerUserWatchStatus) {
      this.playerUserWatchStatus.textContent = (lec.userWatched ? '✓ Watched' : '○ Mark Watched') + (!canEditUser ? ' 🔒' : '');
    }
    if (this.playerUserName) this.playerUserName.textContent = `(${user.name})`;
    if (this.playerToggleUserWatch) {
      this.playerToggleUserWatch.className = `btn-duo-complete user-complete ${lec.userWatched ? 'completed' : ''} ${!canEditUser ? 'locked' : ''}`;
      this.playerToggleUserWatch.title = canEditUser ? 'Toggle your completion' : `🔒 Locked: Only ${user.name} can mark completion`;
    }

    if (this.playerFriendWatchStatus) {
      this.playerFriendWatchStatus.textContent = (lec.friendWatched ? '✓ Watched' : '○ Mark Watched') + (!canEditFriend ? ' 🔒' : '');
    }
    if (this.playerFriendName) this.playerFriendName.textContent = `(${friend.name})`;
    if (this.playerToggleFriendWatch) {
      this.playerToggleFriendWatch.className = `btn-duo-complete friend-complete ${lec.friendWatched ? 'completed' : ''} ${!canEditFriend ? 'locked' : ''}`;
      this.playerToggleFriendWatch.title = canEditFriend ? 'Toggle your completion' : `🔒 Locked: Only ${friend.name} can mark completion`;
    }
  }

  closeVideoPlayer() {
    if (!this.modalVideoPlayer) return;
    if (this.videoTheatreContainer) {
      this.videoTheatreContainer.innerHTML = '';
    }
    this.activePlayerLecture = null;
    this.modalVideoPlayer.classList.add('hidden');
  }

  showToast(message, type = 'info') {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
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
  window.lecturesApp = new LecturesApp();
});
