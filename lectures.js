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
    platform: 'PW / Unacademy',
    videoUrl: 'https://youtube.com',
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
    videoUrl: '',
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
    videoUrl: '',
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
    this.lectures = this.loadLectures();
    this.currentAuthUser = localStorage.getItem(AUTH_USER_KEY) || 'user';
    this.isMasterUnlocked = false;
    this.selectedSubject = 'all';
    this.statusFilter = 'all'; // all | available | urgent | expired | watched
    this.searchQuery = '';
    this.clockInterval = null;

    this.initElements();
    this.attachEvents();
    this.updateProfilesUI();
    this.render();

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
      items: []
    };
  }

  loadLectures() {
    try {
      const saved = localStorage.getItem(LECTURES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    // Seed initial
    return JSON.parse(JSON.stringify(SEED_LECTURES));
  }

  saveLectures() {
    try {
      localStorage.setItem(LECTURES_STORAGE_KEY, JSON.stringify(this.lectures));
    } catch (e) {}
    this.render();
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
  }

  attachEvents() {
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
      if (e.key === 'Escape') this.closeModal();
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

        <!-- Duo Study Watch Progress -->
        <div class="lecture-duo-watch">
          <button type="button" class="duo-watch-btn user-btn ${lec.userWatched ? 'completed' : ''}" data-target="user" title="Toggle Shahzeb watched state">
            <span>${lec.userWatched ? '✓ Watched' : '○ Pending'}</span>
            <span style="opacity:0.75;">(${this.escapeHtml(user.name)})</span>
          </button>
          <button type="button" class="duo-watch-btn friend-btn ${lec.friendWatched ? 'completed' : ''}" data-target="friend" title="Toggle Aman watched state">
            <span>${lec.friendWatched ? '✓ Watched' : '○ Pending'}</span>
            <span style="opacity:0.75;">(${this.escapeHtml(friend.name)})</span>
          </button>
        </div>
      </div>

      <div class="lecture-card-footer">
        ${lec.videoUrl ? `
          <a href="${this.escapeHtml(lec.videoUrl)}" target="_blank" rel="noopener noreferrer" class="lecture-link-btn">
            <span>Play Lecture</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
          </a>
        ` : `<span style="font-size:0.75rem;color:var(--text-subtle);">Direct portal view</span>`}
        
        <div class="lecture-card-actions">
          <button type="button" class="btn-icon-subtle btn-delete-lec" title="Delete lecture">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;

    // Watch status clicks
    card.querySelectorAll('.duo-watch-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = btn.dataset.target;
        if (target === 'user') lec.userWatched = !lec.userWatched;
        if (target === 'friend') lec.friendWatched = !lec.friendWatched;
        this.saveLectures();
        this.showToast('Updated watch progress!', 'success');
      });
    });

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
        existing.notes = notes;
        existing.color = color;
        existing.expiresAt = expiresAt;
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
        notes,
        color,
        postedAt: Date.now(),
        expiresAt,
        userWatched: !isFriend && watchedState,
        friendWatched: isFriend && watchedState
      };
      this.lectures.unshift(newLec);
      this.showToast('New lecture added!', 'success');
    }

    this.saveLectures();
    this.closeModal();
  }

  deleteLecture(id, title) {
    if (!this.checkPermissionOrPrompt('deleteLecture', 'delete platform lectures')) {
      return;
    }

    if (confirm(`Are you sure you want to remove "${title}" from lectures?`)) {
      this.lectures = this.lectures.filter(l => l.id !== id);
      this.saveLectures();
      this.showToast('Lecture removed.', 'info');
    }
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
