// app.js - YouTube Mobile Offline App Controller
(function() {
  'use strict';

  // State
  let currentTab = 'home';
  let currentCategory = 'Все';
  let allRegularVideos = [];
  let allShorts = [];
  let activeWatchVideo = null;
  let activeShortIndex = 0;
  let currentPlaybackSpeed = 1.0;
  let controlsTimeout = null;
  let isDraggingProgress = false;

  // DOM Elements
  const appViewport = document.getElementById('app-viewport');
  const btnToggleFrame = document.getElementById('btn-toggle-frame');
  const frameBtnText = document.getElementById('frame-btn-text');
  const btnToggleTheme = document.getElementById('btn-toggle-theme');
  const phoneClock = document.getElementById('phone-clock');

  // Bottom Nav
  const bottomNav = document.getElementById('bottom-nav');
  const navItems = bottomNav.querySelectorAll('.nav-item[data-view]');
  const btnCreate = document.getElementById('btn-create');
  const tabViews = document.querySelectorAll('.view-content');

  // Home
  const homeFeedContainer = document.getElementById('home-feed-container');
  const categoryChips = document.getElementById('category-chips');
  const quickStorageInfo = document.getElementById('quick-storage-info');

  // Subscriptions & You
  const subscriptionsFeedContainer = document.getElementById('subscriptions-feed-container');
  const userVideosList = document.getElementById('user-videos-list');
  const userVideoCount = document.getElementById('user-video-count');
  const historyItemsContainer = document.getElementById('history-items-container');
  const storageMbLabel = document.getElementById('storage-mb-label');
  const storageProgressBar = document.getElementById('storage-progress-bar');
  const btnResetDemo = document.getElementById('btn-reset-demo');
  const btnQuickUploadAction = document.getElementById('btn-quick-upload-action');
  const btnClearHistory = document.getElementById('btn-clear-history');

  // Watch Screen & Player
  const watchScreen = document.getElementById('watch-screen');
  const mainVideoPlayer = document.getElementById('main-video-player');
  const playerControlsOverlay = document.getElementById('player-controls-overlay');
  const btnPlayerBack = document.getElementById('btn-player-back');
  const btnPlayerToggle = document.getElementById('btn-player-toggle');
  const iconPlayerPlay = document.getElementById('icon-player-play');
  const iconPlayerPause = document.getElementById('icon-player-pause');
  const btnSeekBack10 = document.getElementById('btn-seek-back-10');
  const btnSeekForward10 = document.getElementById('btn-seek-forward-10');
  const playerProgressContainer = document.getElementById('player-progress-container');
  const playerProgressBuffer = document.getElementById('player-progress-buffer');
  const playerProgressCurrent = document.getElementById('player-progress-current');
  const playerProgressThumb = document.getElementById('player-progress-thumb');
  const playerTimeDisplay = document.getElementById('player-time-display');
  const btnPlayerSpeedBadge = document.getElementById('btn-player-speed-badge');
  const btnPlayerSettings = document.getElementById('btn-player-settings');
  const btnPlayerFullscreen = document.getElementById('btn-player-fullscreen');

  // Watch Info Elements
  const watchTitle = document.getElementById('watch-title');
  const watchViews = document.getElementById('watch-views');
  const watchDate = document.getElementById('watch-date');
  const watchChannelName = document.getElementById('watch-channel-name');
  const watchChannelSubs = document.getElementById('watch-channel-subs');
  const watchChannelAvatar = document.getElementById('watch-channel-avatar');
  const watchSubscribeBtn = document.getElementById('watch-subscribe-btn');
  const watchBtnLike = document.getElementById('watch-btn-like');
  const watchLikeCount = document.getElementById('watch-like-count');
  const watchBtnDislike = document.getElementById('watch-btn-dislike');
  const watchBtnShare = document.getElementById('watch-btn-share');
  const watchDescBox = document.getElementById('watch-desc-box');
  const watchDescText = document.getElementById('watch-desc-text');
  const watchDescToggle = document.getElementById('watch-desc-toggle');
  const watchCommentsBox = document.getElementById('watch-comments-box');
  const watchCommentsCount = document.getElementById('watch-comments-count');
  const watchFirstComment = document.getElementById('watch-first-comment');
  const watchUpNextFeed = document.getElementById('watch-up-next-feed');

  // Shorts Tab Elements
  const shortsVideo = document.getElementById('shorts-video');
  const shortsTapArea = document.getElementById('shorts-tap-area');
  const shortsPulseIcon = document.getElementById('shorts-pulse-icon');
  const shortsBtnLike = document.getElementById('shorts-btn-like');
  const shortsLikeCount = document.getElementById('shorts-like-count');
  const shortsBtnDislike = document.getElementById('shorts-btn-dislike');
  const shortsBtnComments = document.getElementById('shorts-btn-comments');
  const shortsBtnShare = document.getElementById('shorts-btn-share');
  const shortsTitle = document.getElementById('shorts-title');
  const shortsChannelName = document.getElementById('shorts-channel-name');
  const shortsChannelAvatar = document.getElementById('shorts-channel-avatar');
  const shortsSubscribeBtn = document.getElementById('shorts-subscribe-btn');
  const shortsSoundName = document.getElementById('shorts-sound-name');
  const btnShortsPrev = document.getElementById('btn-shorts-prev');
  const btnShortsNext = document.getElementById('btn-shorts-next');

  // Modals
  const modalSettings = document.getElementById('modal-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const modalUpload = document.getElementById('modal-upload');
  const btnCloseUpload = document.getElementById('btn-close-upload');
  const modalComments = document.getElementById('modal-comments');
  const btnCloseComments = document.getElementById('btn-close-comments');
  const modalCommentsList = document.getElementById('modal-comments-list');
  const inputNewComment = document.getElementById('input-new-comment');
  const btnPostComment = document.getElementById('btn-post-comment');

  // Upload Form
  const uploadVideoForm = document.getElementById('upload-video-form');
  const dropzoneTrigger = document.getElementById('dropzone-trigger');
  const inputVideoFile = document.getElementById('input-video-file');
  const fileDropText = document.getElementById('file-drop-text');
  const uploadPreviewContainer = document.getElementById('upload-preview-container');
  const uploadPreviewVideo = document.getElementById('upload-preview-video');
  const inputVideoTitle = document.getElementById('input-video-title');
  const inputVideoChannel = document.getElementById('input-video-channel');
  const inputVideoCategory = document.getElementById('input-video-category');
  const inputVideoDesc = document.getElementById('input-video-desc');
  const typeBtnVideo = document.getElementById('type-btn-video');
  const typeBtnShort = document.getElementById('type-btn-short');
  const uploadProgressBox = document.getElementById('upload-progress-box');
  const uploadProgressBar = document.getElementById('upload-progress-bar');
  const uploadStatusPercent = document.getElementById('upload-status-percent');
  const uploadStatusText = document.getElementById('upload-status-text');
  const btnSubmitUpload = document.getElementById('btn-submit-upload');

  let selectedUploadType = 'video';
  let uploadedFileBlob = null;
  let generatedThumbnailBlob = null;
  let uploadedDurationSec = 0;

  // Search Elements
  const searchOverlay = document.getElementById('search-overlay');
  const btnOpenSearch = document.getElementById('btn-open-search');
  const btnCloseSearch = document.getElementById('btn-close-search');
  const inputSearchQuery = document.getElementById('input-search-query');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const searchResultsContainer = document.getElementById('search-results-container');

  // Object URL caches for clean memory management
  const blobUrlCache = new Map();

  function getBlobUrl(blob) {
    if (!blob) return '';
    if (blobUrlCache.has(blob)) {
      return blobUrlCache.get(blob);
    }
    const url = URL.createObjectURL(blob);
    blobUrlCache.set(blob, url);
    return url;
  }

  // Formatting helpers
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function formatViews(count) {
    if (typeof count === 'string') return count;
    if (!count) return '0 просмотров';
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1).replace('.0', '')} млн просмотров`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(0)} тыс. просмотров`;
    }
    return `${count} просмотров`;
  }

  // Phone Clock
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    if (phoneClock) phoneClock.textContent = `${h}:${m}`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Desktop Frame Switcher
  btnToggleFrame.addEventListener('click', () => {
    const isFrame = appViewport.classList.toggle('device-frame');
    frameBtnText.textContent = isFrame ? 'Рамка телефона' : 'На весь экран';
  });

  // Theme Switcher
  btnToggleTheme.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
  });

  // Tab Navigation
  function switchTab(viewName) {
    currentTab = viewName;

    // Pause watch video or shorts video if moving away
    if (viewName !== 'shorts') {
      shortsVideo.pause();
    }
    if (viewName === 'shorts') {
      mainVideoPlayer.pause();
      watchScreen.classList.remove('open');
      playShort(activeShortIndex);
    }

    // Update bottom nav buttons
    navItems.forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update view panels
    tabViews.forEach(view => {
      if (view.id === `view-${viewName}`) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    // Refresh data if needed
    if (viewName === 'you') {
      renderLibraryView();
    } else if (viewName === 'subscriptions') {
      renderSubscriptionsView();
    } else if (viewName === 'home') {
      renderHomeFeed();
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.getAttribute('data-view');
      switchTab(targetView);
    });
  });

  document.getElementById('btn-logo-home').addEventListener('click', () => {
    watchScreen.classList.remove('open');
    mainVideoPlayer.pause();
    switchTab('home');
  });

  document.getElementById('btn-header-profile').addEventListener('click', () => {
    switchTab('you');
  });

  // Category Filtering
  categoryChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.yt-chip');
    if (!chip) return;

    categoryChips.querySelectorAll('.yt-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentCategory = chip.getAttribute('data-category');
    renderHomeFeed();
  });

  // RENDER HOME FEED
  async function renderHomeFeed() {
    homeFeedContainer.innerHTML = '';
    const videos = await YouTubeDB.getRegularVideos(currentCategory);
    allRegularVideos = videos;
    const shorts = await YouTubeDB.getShorts();
    allShorts = shorts;

    // Update storage quick info
    const stats = await YouTubeDB.getStorageStats();
    if (quickStorageInfo) {
      quickStorageInfo.textContent = `${stats.mb} МБ (${stats.totalCount} видео)`;
    }

    if (videos.length === 0 && shorts.length === 0) {
      homeFeedContainer.innerHTML = `
        <div style="padding: 40px 20px; text-align:center; color:var(--yt-text-secondary);">
          <p style="font-size: 16px; margin-bottom: 8px;">Нет видео в этой категории</p>
          <p style="font-size: 13px;">Нажмите кнопку (+) внизу, чтобы добавить свое первое локальное видео!</p>
        </div>
      `;
      return;
    }

    // Render first 2 videos
    const firstSlice = videos.slice(0, 2);
    firstSlice.forEach(v => {
      homeFeedContainer.appendChild(createVideoCardElement(v));
    });

    // Insert Shorts Shelf in between if we have shorts
    if (shorts.length > 0) {
      const shortsShelf = document.createElement('div');
      shortsShelf.className = 'shorts-shelf';
      shortsShelf.innerHTML = `
        <div class="shorts-shelf-header">
          <div class="shorts-shelf-title">
            <svg viewBox="0 0 24 24"><path d="M17.77 10.32l-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 6.94c-1.29.68-2.07 2.04-2 3.49.07 1.42.93 2.67 2.22 3.25.03.01 1.2.5 1.2.5L6 14.93c-1.83.97-2.53 3.24-1.56 5.07.97 1.83 3.24 2.53 5.07 1.56l8.5-4.5c1.29-.68 2.06-2.04 1.99-3.49-.07-1.42-.94-2.68-2.23-3.25zM10 14.5v-5l4.5 2.5-4.5 2.5z"/></svg>
            <span>Shorts</span>
          </div>
        </div>
        <div class="shorts-shelf-scroll" id="shorts-shelf-row"></div>
      `;

      const shelfRow = shortsShelf.querySelector('#shorts-shelf-row');
      shorts.forEach((s, idx) => {
        const sCard = document.createElement('div');
        sCard.className = 'shorts-shelf-card';
        const thumbUrl = s.thumbnailBlob ? getBlobUrl(s.thumbnailBlob) : '';
        sCard.innerHTML = `
          ${thumbUrl ? `<img class="shorts-shelf-thumb" src="${thumbUrl}" alt="Shorts">` : `<div style="width:100%;height:100%;background:${s.avatarColor || '#333'}"></div>`}
          <div class="shorts-shelf-overlay">
            <span class="shorts-shelf-card-title">${escapeHtml(s.title)}</span>
            <span class="shorts-shelf-card-views">${escapeHtml(s.views)}</span>
          </div>
        `;
        sCard.addEventListener('click', () => {
          activeShortIndex = idx;
          switchTab('shorts');
        });
        shelfRow.appendChild(sCard);
      });

      homeFeedContainer.appendChild(shortsShelf);
    }

    // Render remaining regular videos
    const remainingVideos = videos.slice(2);
    remainingVideos.forEach(v => {
      homeFeedContainer.appendChild(createVideoCardElement(v));
    });
  }

  // Create Video Card Element
  function createVideoCardElement(v) {
    const card = document.createElement('article');
    card.className = 'video-card';
    const thumbUrl = v.thumbnailBlob ? getBlobUrl(v.thumbnailBlob) : '';

    card.innerHTML = `
      <div class="thumbnail-wrap">
        ${thumbUrl ? `<img class="thumbnail-img" src="${thumbUrl}" alt="thumbnail" loading="lazy">` : `<div style="width:100%;height:100%;background:#1e293b;"></div>`}
        <span class="duration-badge">${v.duration || '00:00'}</span>
      </div>
      <div class="video-info-row">
        <div class="channel-avatar" style="background:${v.avatarColor || '#3b82f6'};">
          ${v.avatarInitial || (v.channel ? v.channel[0].toUpperCase() : 'Y')}
        </div>
        <div class="video-meta">
          <h2 class="video-title">${escapeHtml(v.title)}</h2>
          <div class="video-sub-meta">
            <span>${escapeHtml(v.channel)}</span>
            ${v.verified ? `<svg class="verified-badge" width="12" height="12" viewBox="0 0 24 24" fill="#aaa"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>` : ''}
            <span>•</span>
            <span>${escapeHtml(v.views)}</span>
            <span>•</span>
            <span>${escapeHtml(v.date)}</span>
          </div>
        </div>
        <button class="video-more-btn" title="Действия">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
        </button>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.video-more-btn')) {
        showVideoActionsModal(v);
        return;
      }
      openWatchScreen(v);
    });

    return card;
  }

  // Show 3-dots actions menu
  function showVideoActionsModal(v) {
    if (confirm(`Удалить видео "${v.title}" из локального хранилища?`)) {
      YouTubeDB.deleteVideo(v.id).then(() => {
        renderHomeFeed();
        renderLibraryView();
      });
    }
  }

  // WATCH SCREEN CONTROLS & PLAYBACK
  async function openWatchScreen(video) {
    activeWatchVideo = video;
    shortsVideo.pause();

    // Prepare video source
    let videoUrl = '';
    if (video.videoBlob) {
      videoUrl = getBlobUrl(video.videoBlob);
    } else if (video.videoUrl) {
      videoUrl = video.videoUrl;
    }

    if (videoUrl) {
      mainVideoPlayer.src = videoUrl;
      mainVideoPlayer.playbackRate = currentPlaybackSpeed;
      mainVideoPlayer.play().catch(e => console.log('Autoplay handled:', e));
    }

    // Record into history
    YouTubeDB.addToHistory(video.id);

    // Populate info
    watchTitle.textContent = video.title;
    watchViews.textContent = video.views;
    watchDate.textContent = video.date;
    watchChannelName.textContent = video.channel;
    watchChannelSubs.textContent = video.subscribers || '1 тыс. подписчиков';
    watchChannelAvatar.textContent = video.avatarInitial || (video.channel ? video.channel[0].toUpperCase() : 'Y');
    watchChannelAvatar.style.background = video.avatarColor || '#3b82f6';
    
    watchLikeCount.textContent = formatViews(video.likes || 120);
    watchBtnLike.classList.toggle('active', !!video.isLiked);
    watchBtnDislike.classList.toggle('active', !!video.isDisliked);

    watchSubscribeBtn.classList.toggle('subscribed', !!video.isSubscribed);
    watchSubscribeBtn.textContent = video.isSubscribed ? 'Вы подписаны 🔔' : 'Подписаться';

    watchDescText.textContent = video.description || 'Описания нет.';
    watchDescText.classList.add('collapsed');
    watchDescToggle.textContent = 'Еще';

    // Load comments
    loadWatchComments(video.id);

    // Load next videos
    renderUpNextFeed(video.id);

    // Open Screen
    watchScreen.classList.add('open');
    showPlayerControls();
  }

  btnPlayerBack.addEventListener('click', () => {
    mainVideoPlayer.pause();
    watchScreen.classList.remove('open');
    renderHomeFeed();
  });

  // Watch Player Play/Pause
  function togglePlayPause() {
    if (mainVideoPlayer.paused) {
      mainVideoPlayer.play();
      iconPlayerPlay.style.display = 'none';
      iconPlayerPause.style.display = 'block';
    } else {
      mainVideoPlayer.pause();
      iconPlayerPlay.style.display = 'block';
      iconPlayerPause.style.display = 'none';
    }
  }

  btnPlayerToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlayPause();
    resetControlsTimeout();
  });

  mainVideoPlayer.addEventListener('play', () => {
    iconPlayerPlay.style.display = 'none';
    iconPlayerPause.style.display = 'block';
  });

  mainVideoPlayer.addEventListener('pause', () => {
    iconPlayerPlay.style.display = 'block';
    iconPlayerPause.style.display = 'none';
  });

  // 10s backward / forward
  btnSeekBack10.addEventListener('click', (e) => {
    e.stopPropagation();
    mainVideoPlayer.currentTime = Math.max(0, mainVideoPlayer.currentTime - 10);
    resetControlsTimeout();
  });

  btnSeekForward10.addEventListener('click', (e) => {
    e.stopPropagation();
    mainVideoPlayer.currentTime = Math.min(mainVideoPlayer.duration || 9999, mainVideoPlayer.currentTime + 10);
    resetControlsTimeout();
  });

  // Controls overlay auto-hide
  function showPlayerControls() {
    playerControlsOverlay.classList.add('visible');
    resetControlsTimeout();
  }

  function hidePlayerControls() {
    if (!mainVideoPlayer.paused) {
      playerControlsOverlay.classList.remove('visible');
    }
  }

  function resetControlsTimeout() {
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
      hidePlayerControls();
    }, 3200);
  }

  document.getElementById('player-wrapper').addEventListener('click', (e) => {
    if (e.target.closest('.control-circle-btn') || e.target.closest('.icon-btn') || e.target.closest('.speed-badge-btn')) {
      return;
    }
    if (playerControlsOverlay.classList.contains('visible')) {
      hidePlayerControls();
    } else {
      showPlayerControls();
    }
  });

  // Scrubber Progress Bar
  mainVideoPlayer.addEventListener('timeupdate', () => {
    if (isDraggingProgress) return;
    const cur = mainVideoPlayer.currentTime;
    const dur = mainVideoPlayer.duration || activeWatchVideo?.durationSec || 1;
    const pct = Math.min(100, (cur / dur) * 100);

    playerProgressCurrent.style.width = `${pct}%`;
    playerProgressThumb.style.left = `${pct}%`;
    playerTimeDisplay.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;

    // Buffer bar
    if (mainVideoPlayer.buffered.length > 0) {
      const bufEnd = mainVideoPlayer.buffered.end(mainVideoPlayer.buffered.length - 1);
      const bufPct = Math.min(100, (bufEnd / dur) * 100);
      playerProgressBuffer.style.width = `${bufPct}%`;
    }
  });

  function seekFromEvent(e) {
    const rect = playerProgressContainer.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = x / rect.width;
    const dur = mainVideoPlayer.duration || activeWatchVideo?.durationSec || 1;
    mainVideoPlayer.currentTime = pct * dur;
    playerProgressCurrent.style.width = `${pct * 100}%`;
    playerProgressThumb.style.left = `${pct * 100}%`;
  }

  playerProgressContainer.addEventListener('mousedown', (e) => {
    isDraggingProgress = true;
    seekFromEvent(e);
  });
  window.addEventListener('mousemove', (e) => {
    if (isDraggingProgress) seekFromEvent(e);
  });
  window.addEventListener('mouseup', () => {
    isDraggingProgress = false;
  });

  // Touch seek support
  playerProgressContainer.addEventListener('touchstart', (e) => {
    isDraggingProgress = true;
    if (e.touches[0]) seekFromEvent(e.touches[0]);
  });
  window.addEventListener('touchmove', (e) => {
    if (isDraggingProgress && e.touches[0]) seekFromEvent(e.touches[0]);
  });
  window.addEventListener('touchend', () => {
    isDraggingProgress = false;
  });

  // Fullscreen
  btnPlayerFullscreen.addEventListener('click', (e) => {
    e.stopPropagation();
    const wrapper = document.getElementById('player-wrapper');
    if (!document.fullscreenElement) {
      if (wrapper.requestFullscreen) wrapper.requestFullscreen();
      else if (mainVideoPlayer.webkitEnterFullscreen) mainVideoPlayer.webkitEnterFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  });

  // Playback Speed & Settings Modal
  btnPlayerSpeedBadge.addEventListener('click', (e) => {
    e.stopPropagation();
    openSettingsModal();
  });
  btnPlayerSettings.addEventListener('click', (e) => {
    e.stopPropagation();
    openSettingsModal();
  });

  function openSettingsModal() {
    modalSettings.classList.add('open');
    modalSettings.querySelectorAll('#speed-options-list [data-speed]').forEach(item => {
      const speed = parseFloat(item.getAttribute('data-speed'));
      const checkEl = item.querySelector('.opt-check');
      if (Math.abs(speed - currentPlaybackSpeed) < 0.01) {
        item.classList.add('selected');
        if (checkEl) checkEl.textContent = '✓';
      } else {
        item.classList.remove('selected');
        if (checkEl) checkEl.textContent = '';
      }
    });
  }

  btnCloseSettings.addEventListener('click', () => {
    modalSettings.classList.remove('open');
  });
  modalSettings.addEventListener('click', (e) => {
    if (e.target === modalSettings) modalSettings.classList.remove('open');
  });

  // Speed selection handler (0.25x - 2.0x)
  modalSettings.addEventListener('click', (e) => {
    const item = e.target.closest('[data-speed]');
    if (!item) return;

    const speed = parseFloat(item.getAttribute('data-speed'));
    currentPlaybackSpeed = speed;
    mainVideoPlayer.playbackRate = speed;
    btnPlayerSpeedBadge.textContent = `${speed}x`;
    modalSettings.classList.remove('open');
  });

  // Like & Dislike on Watch
  watchBtnLike.addEventListener('click', async () => {
    if (!activeWatchVideo) return;
    const updated = await YouTubeDB.toggleLike(activeWatchVideo.id);
    if (updated) {
      activeWatchVideo = updated;
      watchLikeCount.textContent = formatViews(updated.likes);
      watchBtnLike.classList.toggle('active', !!updated.isLiked);
      watchBtnDislike.classList.toggle('active', !!updated.isDisliked);
    }
  });

  watchBtnDislike.addEventListener('click', async () => {
    if (!activeWatchVideo) return;
    const updated = await YouTubeDB.toggleDislike(activeWatchVideo.id);
    if (updated) {
      activeWatchVideo = updated;
      watchBtnDislike.classList.toggle('active', !!updated.isDisliked);
      watchBtnLike.classList.toggle('active', !!updated.isLiked);
    }
  });

  // Subscribe button toggle
  watchSubscribeBtn.addEventListener('click', async () => {
    if (!activeWatchVideo) return;
    activeWatchVideo.isSubscribed = !activeWatchVideo.isSubscribed;
    await YouTubeDB.updateVideo(activeWatchVideo);
    watchSubscribeBtn.classList.toggle('subscribed', activeWatchVideo.isSubscribed);
    watchSubscribeBtn.textContent = activeWatchVideo.isSubscribed ? 'Вы подписаны 🔔' : 'Подписаться';
  });

  // Description expand/collapse
  watchDescBox.addEventListener('click', () => {
    const isCollapsed = watchDescText.classList.toggle('collapsed');
    watchDescToggle.textContent = isCollapsed ? 'Еще' : 'Свернуть';
  });

  // Comments in Watch
  async function loadWatchComments(videoId) {
    const comments = await YouTubeDB.getComments(videoId);
    watchCommentsCount.textContent = comments.length;
    if (comments.length > 0) {
      watchFirstComment.textContent = comments[0].text;
    }
  }

  watchCommentsBox.addEventListener('click', () => {
    if (activeWatchVideo) openCommentsModal(activeWatchVideo.id);
  });

  async function openCommentsModal(videoId) {
    modalComments.classList.add('open');
    modalCommentsList.innerHTML = '';
    const comments = await YouTubeDB.getComments(videoId);

    comments.forEach(c => {
      const item = document.createElement('div');
      item.className = 'comment-item';
      item.innerHTML = `
        <div style="width:32px; height:32px; border-radius:50%; background:${c.avatarColor || '#3ea6ff'}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0;">
          ${c.avatarInitial || 'В'}
        </div>
        <div class="comment-content">
          <div class="comment-author">${escapeHtml(c.author)} • <span style="font-weight:400; color:var(--yt-text-secondary);">${escapeHtml(c.time || '')}</span></div>
          <div class="comment-text">${escapeHtml(c.text)}</div>
          <div class="comment-footer">
            <span style="display:flex; align-items:center; gap:4px; cursor:pointer;">👍 ${c.likes || 0}</span>
            <span style="cursor:pointer;">Ответить</span>
          </div>
        </div>
      `;
      modalCommentsList.appendChild(item);
    });
  }

  btnCloseComments.addEventListener('click', () => {
    modalComments.classList.remove('open');
  });
  modalComments.addEventListener('click', (e) => {
    if (e.target === modalComments) modalComments.classList.remove('open');
  });

  btnPostComment.addEventListener('click', async () => {
    const text = inputNewComment.value.trim();
    if (!text) return;
    const vidId = activeWatchVideo ? activeWatchVideo.id : (allShorts[activeShortIndex] ? allShorts[activeShortIndex].id : null);
    if (!vidId) return;

    await YouTubeDB.addComment(vidId, 'Вы', text);
    inputNewComment.value = '';
    openCommentsModal(vidId);
    if (activeWatchVideo) loadWatchComments(vidId);
  });

  // Up Next Feed
  async function renderUpNextFeed(currentId) {
    watchUpNextFeed.innerHTML = '';
    const all = await YouTubeDB.getRegularVideos();
    const upNext = all.filter(v => v.id !== currentId);

    upNext.forEach(v => {
      watchUpNextFeed.appendChild(createVideoCardElement(v));
    });
  }

  // DEDICATED SHORTS VIEW CONTROLLER
  async function playShort(index) {
    if (allShorts.length === 0) {
      allShorts = await YouTubeDB.getShorts();
    }
    if (allShorts.length === 0) return;

    if (index < 0) index = allShorts.length - 1;
    if (index >= allShorts.length) index = 0;
    activeShortIndex = index;

    const short = allShorts[activeShortIndex];
    if (!short) return;

    let src = '';
    if (short.videoBlob) src = getBlobUrl(short.videoBlob);
    else if (short.videoUrl) src = short.videoUrl;

    if (src) {
      shortsVideo.src = src;
      shortsVideo.play().catch(e => console.log('Shorts autoplay:', e));
    }

    shortsTitle.textContent = short.title;
    shortsChannelName.textContent = `@${short.channel}`;
    shortsChannelAvatar.textContent = short.avatarInitial || (short.channel ? short.channel[0].toUpperCase() : 'S');
    shortsChannelAvatar.style.background = short.avatarColor || '#f43f5e';
    shortsLikeCount.textContent = formatViews(short.likes || 42000);
    shortsSoundName.textContent = short.audioTrack || `Оригинальный звук - ${short.channel}`;

    shortsBtnLike.classList.toggle('active', !!short.isLiked);
    shortsBtnDislike.classList.toggle('active', !!short.isDisliked);
    shortsSubscribeBtn.classList.toggle('subscribed', !!short.isSubscribed);
    shortsSubscribeBtn.textContent = short.isSubscribed ? 'Подписка' : 'Подписаться';
  }

  // Shorts tap to play/pause
  shortsTapArea.addEventListener('click', () => {
    if (shortsVideo.paused) {
      shortsVideo.play();
      showShortsPulse(false);
    } else {
      shortsVideo.pause();
      showShortsPulse(true);
    }
  });

  function showShortsPulse(isPaused) {
    shortsPulseIcon.innerHTML = isPaused
      ? `<svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
      : `<svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    shortsPulseIcon.classList.add('show');
    setTimeout(() => {
      shortsPulseIcon.classList.remove('show');
    }, 450);
  }

  btnShortsPrev.addEventListener('click', () => {
    playShort(activeShortIndex - 1);
  });
  btnShortsNext.addEventListener('click', () => {
    playShort(activeShortIndex + 1);
  });

  // Swipe Gestures for Shorts (Touch & Mouse Wheel)
  let touchStartY = 0;
  shortsTapArea.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  shortsTapArea.addEventListener('touchend', (e) => {
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    if (deltaY < -50) {
      // Swiped Up -> Next Short
      playShort(activeShortIndex + 1);
    } else if (deltaY > 50) {
      // Swiped Down -> Prev Short
      playShort(activeShortIndex - 1);
    }
  }, { passive: true });

  // Mouse wheel swipe support for shorts
  let wheelThrottle = false;
  document.getElementById('view-shorts').addEventListener('wheel', (e) => {
    if (wheelThrottle) return;
    wheelThrottle = true;
    setTimeout(() => { wheelThrottle = false; }, 600);
    if (e.deltaY > 30) {
      playShort(activeShortIndex + 1);
    } else if (e.deltaY < -30) {
      playShort(activeShortIndex - 1);
    }
  });

  // Shorts Like / Dislike
  shortsBtnLike.addEventListener('click', async () => {
    const short = allShorts[activeShortIndex];
    if (!short) return;
    const updated = await YouTubeDB.toggleLike(short.id);
    if (updated) {
      allShorts[activeShortIndex] = updated;
      shortsLikeCount.textContent = formatViews(updated.likes);
      shortsBtnLike.classList.toggle('active', !!updated.isLiked);
    }
  });

  shortsBtnDislike.addEventListener('click', async () => {
    const short = allShorts[activeShortIndex];
    if (!short) return;
    const updated = await YouTubeDB.toggleDislike(short.id);
    if (updated) {
      allShorts[activeShortIndex] = updated;
      shortsBtnDislike.classList.toggle('active', !!updated.isDisliked);
    }
  });

  shortsBtnComments.addEventListener('click', () => {
    const short = allShorts[activeShortIndex];
    if (short) openCommentsModal(short.id);
  });

  shortsSubscribeBtn.addEventListener('click', async () => {
    const short = allShorts[activeShortIndex];
    if (!short) return;
    short.isSubscribed = !short.isSubscribed;
    await YouTubeDB.updateVideo(short);
    shortsSubscribeBtn.classList.toggle('subscribed', short.isSubscribed);
    shortsSubscribeBtn.textContent = short.isSubscribed ? 'Подписка' : 'Подписаться';
  });

  // UPLOAD / CREATE MODAL (+)
  btnCreate.addEventListener('click', () => {
    openUploadModal();
  });

  btnQuickUploadAction.addEventListener('click', () => {
    openUploadModal();
  });

  function openUploadModal() {
    modalUpload.classList.add('open');
    resetUploadForm();
  }

  btnCloseUpload.addEventListener('click', () => {
    modalUpload.classList.remove('open');
  });
  modalUpload.addEventListener('click', (e) => {
    if (e.target === modalUpload) modalUpload.classList.remove('open');
  });

  function resetUploadForm() {
    uploadVideoForm.reset();
    inputVideoChannel.value = 'Мой Канал';
    fileDropText.textContent = 'Нажмите, чтобы выбрать видео из галереи';
    uploadPreviewContainer.style.display = 'none';
    uploadProgressBox.style.display = 'none';
    btnSubmitUpload.disabled = false;
    uploadedFileBlob = null;
    generatedThumbnailBlob = null;
    uploadedDurationSec = 0;
    setTypeSelection('video');
  }

  typeBtnVideo.addEventListener('click', () => setTypeSelection('video'));
  typeBtnShort.addEventListener('click', () => setTypeSelection('short'));

  function setTypeSelection(type) {
    selectedUploadType = type;
    if (type === 'video') {
      typeBtnVideo.classList.add('selected');
      typeBtnShort.classList.remove('selected');
    } else {
      typeBtnShort.classList.add('selected');
      typeBtnVideo.classList.remove('selected');
    }
  }

  const btnQuickGenerateSample = document.getElementById('btn-quick-generate-sample');

  btnQuickGenerateSample.addEventListener('click', async () => {
    btnQuickGenerateSample.textContent = '⏳ Генерация тестового видео...';
    btnQuickGenerateSample.disabled = true;

    const isShort = selectedUploadType === 'short';
    const sample = await VideoGenerator.generateSampleVideoBlob({
      width: isShort ? 360 : 640,
      height: isShort ? 640 : 360,
      durationSec: isShort ? 5 : 6,
      audioTone: isShort ? 580 : 380,
      renderFrame: (ctx, w, h, p, t) => {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, isShort ? '#831843' : '#1e3a8a');
        grad.addColorStop(0.5, isShort ? '#be185d' : '#2563eb');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(w * 0.5 + Math.cos(t * 0.003) * 50, h * 0.5 + Math.sin(t * 0.003) * 30, 70, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isShort ? 'НОВЫЙ SHORTS ✨' : 'ТЕСТОВОЕ ВИДЕО 🎬', w * 0.5, h * 0.5);
        ctx.font = '14px Roboto, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('Сгенерировано локально без интернета', w * 0.5, h * 0.5 + 32);
        ctx.textAlign = 'left';
      }
    });

    uploadedFileBlob = sample.videoBlob;
    generatedThumbnailBlob = sample.thumbnailBlob;
    uploadedDurationSec = isShort ? 5 : 6;

    if (!inputVideoTitle.value) {
      inputVideoTitle.value = isShort ? 'Мой новый крутой Shorts #shorts' : 'Тестовое оффлайн видео';
    }

    fileDropText.textContent = `Сгенерировано тестовое видео (${isShort ? 'Shorts' : '16:9'}, ${uploadedDurationSec} сек)`;
    btnQuickGenerateSample.textContent = '✓ Видео готово к публикации!';

    if (sample.videoBlob) {
      uploadPreviewVideo.src = URL.createObjectURL(sample.videoBlob);
      uploadPreviewContainer.style.display = 'block';
    }
  });

  // Handle local file selection from phone or computer
  inputVideoFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    uploadedFileBlob = file;
    fileDropText.textContent = `Выбран файл: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} МБ)`;

    // Auto-fill title if empty
    if (!inputVideoTitle.value) {
      inputVideoTitle.value = file.name.replace(/\.[^/.]+$/, '');
    }

    // Load preview and extract video metrics
    const previewUrl = URL.createObjectURL(file);
    uploadPreviewVideo.src = previewUrl;
    uploadPreviewContainer.style.display = 'block';

    uploadPreviewVideo.onloadedmetadata = async () => {
      uploadedDurationSec = Math.round(uploadPreviewVideo.duration || 10);
      const isVertical = uploadPreviewVideo.videoHeight > uploadPreviewVideo.videoWidth;

      // Automatically select Shorts if video is vertical!
      if (isVertical) {
        setTypeSelection('short');
      }

      // Automatically generate thumbnail from video frame
      try {
        generatedThumbnailBlob = await VideoGenerator.extractThumbnailFromVideo(uploadPreviewVideo, 1.0);
      } catch (err) {
        console.warn('Could not extract thumbnail:', err);
      }
    };
  });

  // Submit Upload Form
  btnSubmitUpload.addEventListener('click', async () => {
    const title = inputVideoTitle.value.trim();
    const channel = inputVideoChannel.value.trim() || 'Мой Канал';
    const category = inputVideoCategory.value;
    const desc = inputVideoDesc.value.trim();

    if (!title) {
      alert('Пожалуйста, введите название видео!');
      return;
    }

    // If user didn't pick a file, offer to generate a quick synthetic demo video
    let videoBlobToSave = uploadedFileBlob;
    let thumbToSave = generatedThumbnailBlob;
    let durationSec = uploadedDurationSec;

    btnSubmitUpload.disabled = true;
    uploadProgressBox.style.display = 'block';

    // Simulated YouTube processing steps
    uploadStatusText.textContent = 'Обработка видео (SD)...';
    uploadProgressBar.style.width = '30%';
    uploadStatusPercent.textContent = '30%';

    if (!videoBlobToSave) {
      // Generate custom synthetic clip on the fly!
      uploadStatusText.textContent = 'Генерация локального видео...';
      const isShort = selectedUploadType === 'short';
      const sample = await VideoGenerator.generateSampleVideoBlob({
        width: isShort ? 360 : 640,
        height: isShort ? 640 : 360,
        durationSec: isShort ? 6 : 8,
        audioTone: isShort ? 580 : 380,
        renderFrame: (ctx, w, h, p, t) => {
          // Dynamic colorful gradient
          const grad = ctx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, '#3b82f6');
          grad.addColorStop(0.5, '#8b5cf6');
          grad.addColorStop(1, '#ec4899');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);

          // Moving shapes
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.beginPath();
          ctx.arc(w * 0.5 + Math.cos(t * 0.003) * 60, h * 0.5 + Math.sin(t * 0.003) * 40, 80, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 20px Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(title, w * 0.5, h * 0.5);
          ctx.font = '14px Roboto, sans-serif';
          ctx.fillText(`Канал: ${channel}`, w * 0.5, h * 0.5 + 30);
          ctx.textAlign = 'left';
        }
      });
      videoBlobToSave = sample.videoBlob;
      thumbToSave = sample.thumbnailBlob;
      durationSec = isShort ? 6 : 8;
    }

    uploadProgressBar.style.width = '70%';
    uploadStatusPercent.textContent = '70%';
    uploadStatusText.textContent = 'Сохранение в IndexedDB...';

    const newVideoRecord = {
      id: `user-video-${Date.now()}`,
      title: title,
      channel: channel,
      avatarColor: '#2563eb',
      avatarInitial: channel[0].toUpperCase(),
      verified: false,
      subscribers: '12 подписчиков',
      views: '1 просмотр',
      date: 'Только что',
      duration: formatTime(durationSec),
      durationSec: durationSec,
      type: selectedUploadType,
      category: category,
      tags: ['#локальное', `#${category.toLowerCase()}`],
      likes: 1,
      dislikes: 0,
      description: desc || 'Загружено пользователем локально без интернета.',
      videoBlob: videoBlobToSave,
      thumbnailBlob: thumbToSave,
      createdAt: Date.now()
    };

    await YouTubeDB.addVideo(newVideoRecord);

    uploadProgressBar.style.width = '100%';
    uploadStatusPercent.textContent = '100%';
    uploadStatusText.textContent = 'Готово! Опубликовано!';

    setTimeout(() => {
      modalUpload.classList.remove('open');
      renderHomeFeed();
      renderLibraryView();
      if (selectedUploadType === 'short') {
        switchTab('shorts');
      } else {
        switchTab('home');
      }
    }, 600);
  });

  // YOU / LIBRARY TAB CONTROLLER
  async function renderLibraryView() {
    const stats = await YouTubeDB.getStorageStats();
    storageMbLabel.textContent = `${stats.mb} МБ`;
    const barPct = Math.min(100, Math.max(5, (stats.totalBytes / (50 * 1024 * 1024)) * 100));
    storageProgressBar.style.width = `${barPct}%`;

    const allVideos = await YouTubeDB.getAllVideos();
    const userVids = allVideos.filter(v => v.id.startsWith('user-video-'));
    userVideoCount.textContent = userVids.length;

    userVideosList.innerHTML = '';
    if (userVids.length === 0) {
      userVideosList.innerHTML = `
        <p style="font-size:12px; color:var(--yt-text-secondary);">
          У вас пока нет загруженных видео. Нажмите "Выложить видео", чтобы добавить ролик со смартфона!
        </p>
      `;
    } else {
      userVids.forEach(v => {
        const item = document.createElement('div');
        item.style.cssText = 'display:flex; gap:12px; align-items:center; background:var(--yt-surface); padding:8px 10px; border-radius:10px;';
        const thumbUrl = v.thumbnailBlob ? getBlobUrl(v.thumbnailBlob) : '';
        item.innerHTML = `
          <div style="width:70px; aspect-ratio:16/9; border-radius:6px; overflow:hidden; background:#222; flex-shrink:0;">
            ${thumbUrl ? `<img src="${thumbUrl}" style="width:100%;height:100%;object-fit:cover;">` : ''}
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(v.title)}</div>
            <div style="font-size:11px; color:var(--yt-text-secondary);">${v.type === 'short' ? 'Shorts' : 'Видео'} • ${v.duration}</div>
          </div>
          <button class="icon-btn delete-vid-btn" title="Удалить" style="color:#ef4444;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        `;

        item.querySelector('.delete-vid-btn').addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm(`Удалить "${v.title}"?`)) {
            await YouTubeDB.deleteVideo(v.id);
            renderLibraryView();
            renderHomeFeed();
          }
        });

        item.addEventListener('click', () => {
          if (v.type === 'short') {
            allShorts.unshift(v);
            activeShortIndex = 0;
            switchTab('shorts');
          } else {
            openWatchScreen(v);
          }
        });

        userVideosList.appendChild(item);
      });
    }

    // Render History
    const history = await YouTubeDB.getHistory();
    historyItemsContainer.innerHTML = '';
    if (history.length === 0) {
      historyItemsContainer.innerHTML = `<span style="font-size:12px; color:var(--yt-text-secondary);">История просмотров пуста</span>`;
    } else {
      history.slice(0, 10).forEach(h => {
        const v = h.video;
        const item = document.createElement('div');
        item.style.cssText = 'width:120px; flex-shrink:0; cursor:pointer;';
        const thumbUrl = v.thumbnailBlob ? getBlobUrl(v.thumbnailBlob) : '';
        item.innerHTML = `
          <div style="width:100%; aspect-ratio:16/9; border-radius:8px; overflow:hidden; background:#222; position:relative;">
            ${thumbUrl ? `<img src="${thumbUrl}" style="width:100%;height:100%;object-fit:cover;">` : ''}
            <span class="duration-badge">${v.duration}</span>
          </div>
          <span style="font-size:12px; font-weight:500; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-top:4px;">${escapeHtml(v.title)}</span>
        `;
        item.addEventListener('click', () => {
          if (v.type === 'short') {
            switchTab('shorts');
          } else {
            openWatchScreen(v);
          }
        });
        historyItemsContainer.appendChild(item);
      });
    }
  }

  btnClearHistory.addEventListener('click', async () => {
    const db = await YouTubeDB.openDB();
    const tx = db.transaction('history', 'readwrite');
    tx.objectStore('history').clear();
    tx.oncomplete = () => renderLibraryView();
  });

  // Reset Demo Videos
  btnResetDemo.addEventListener('click', async () => {
    if (confirm('Восстановить демонстрационные видеоролики?')) {
      await YouTubeDB.clearAll();
      await VideoGenerator.seedDemoVideosIfEmpty(YouTubeDB);
      renderHomeFeed();
      renderLibraryView();
      alert('Демонстрационные ролики успешно восстановлены!');
    }
  });

  // SUBSCRIPTIONS TAB VIEW
  async function renderSubscriptionsView() {
    subscriptionsFeedContainer.innerHTML = '';
    const videos = await YouTubeDB.getRegularVideos();
    videos.forEach(v => {
      subscriptionsFeedContainer.appendChild(createVideoCardElement(v));
    });
  }

  // SEARCH FUNCTIONALITY
  btnOpenSearch.addEventListener('click', () => {
    searchOverlay.classList.add('open');
    inputSearchQuery.focus();
    renderSearchResults('');
  });

  btnCloseSearch.addEventListener('click', () => {
    searchOverlay.classList.remove('open');
  });

  btnClearSearch.addEventListener('click', () => {
    inputSearchQuery.value = '';
    btnClearSearch.style.display = 'none';
    renderSearchResults('');
  });

  inputSearchQuery.addEventListener('input', () => {
    const q = inputSearchQuery.value;
    btnClearSearch.style.display = q ? 'block' : 'none';
    renderSearchResults(q);
  });

  async function renderSearchResults(query) {
    searchResultsContainer.innerHTML = '';
    const q = query.toLowerCase().trim();
    const all = await YouTubeDB.getAllVideos();

    const filtered = all.filter(v => {
      if (!q) return true;
      return (
        v.title.toLowerCase().includes(q) ||
        v.channel.toLowerCase().includes(q) ||
        (v.tags && v.tags.some(t => t.toLowerCase().includes(q))) ||
        (v.category && v.category.toLowerCase().includes(q))
      );
    });

    if (filtered.length === 0) {
      searchResultsContainer.innerHTML = `
        <div style="padding:40px 20px; text-align:center; color:var(--yt-text-secondary);">
          Ничего не найдено по запросу "${escapeHtml(query)}"
        </div>
      `;
      return;
    }

    filtered.forEach(v => {
      if (v.type === 'short') {
        const item = document.createElement('div');
        item.style.cssText = 'display:flex; gap:12px; padding:10px 14px; cursor:pointer; align-items:center;';
        const thumbUrl = v.thumbnailBlob ? getBlobUrl(v.thumbnailBlob) : '';
        item.innerHTML = `
          <div style="width:50px; aspect-ratio:9/16; border-radius:6px; overflow:hidden; background:#222; flex-shrink:0;">
            ${thumbUrl ? `<img src="${thumbUrl}" style="width:100%;height:100%;object-fit:cover;">` : ''}
          </div>
          <div style="flex:1;">
            <div style="font-size:14px; font-weight:500;">${escapeHtml(v.title)}</div>
            <div style="font-size:12px; color:var(--yt-text-secondary);">Shorts • ${escapeHtml(v.channel)}</div>
          </div>
        `;
        item.addEventListener('click', () => {
          searchOverlay.classList.remove('open');
          allShorts = [v, ...allShorts.filter(s => s.id !== v.id)];
          activeShortIndex = 0;
          switchTab('shorts');
        });
        searchResultsContainer.appendChild(item);
      } else {
        const item = createVideoCardElement(v);
        item.addEventListener('click', () => {
          searchOverlay.classList.remove('open');
        });
        searchResultsContainer.appendChild(item);
      }
    });
  }

  // Escape HTML helper for security
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // INITIALIZE APP
  async function init() {
    console.log('Initializing YouTube Mobile Offline App...');
    try {
      await YouTubeDB.openDB();
      // Seed preset demo videos if empty
      await VideoGenerator.seedDemoVideosIfEmpty(YouTubeDB);
      // Render Initial View
      await renderHomeFeed();
      // Load initial shorts into memory
      allShorts = await YouTubeDB.getShorts();
    } catch (err) {
      console.error('Initialization error:', err);
    }
  }

  init();

})();
