// db.js - IndexedDB storage manager for YouTube Clone
window.YouTubeDB = (function() {
  const DB_NAME = 'YouTubeOfflineDB';
  const DB_VERSION = 1;

  let dbInstance = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      if (dbInstance) {
        resolve(dbInstance);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Videos store (both regular videos and shorts)
        if (!db.objectStoreNames.contains('videos')) {
          const videoStore = db.createObjectStore('videos', { keyPath: 'id' });
          videoStore.createIndex('type', 'type', { unique: false });
          videoStore.createIndex('category', 'category', { unique: false });
          videoStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // History store
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
          historyStore.createIndex('videoId', 'videoId', { unique: false });
          historyStore.createIndex('watchedAt', 'watchedAt', { unique: false });
        }

        // Liked videos store
        if (!db.objectStoreNames.contains('liked')) {
          const likedStore = db.createObjectStore('liked', { keyPath: 'id' });
          likedStore.createIndex('likedAt', 'likedAt', { unique: false });
        }

        // Comments store
        if (!db.objectStoreNames.contains('comments')) {
          const commentsStore = db.createObjectStore('comments', { keyPath: 'id', autoIncrement: true });
          commentsStore.createIndex('videoId', 'videoId', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async function addVideo(video) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('videos', 'readwrite');
      const store = tx.objectStore('videos');
      const req = store.put(video);
      req.onsuccess = () => resolve(video);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAllVideos() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('videos', 'readonly');
      const store = tx.objectStore('videos');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function getRegularVideos(category = 'Все') {
    const all = await getAllVideos();
    let regular = all.filter(v => v.type === 'video');
    if (category && category !== 'Все') {
      regular = regular.filter(v => v.category === category || (v.tags && v.tags.some(t => t.toLowerCase().includes(category.toLowerCase()))));
    }
    // Sort newly uploaded first, then presets
    regular.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return regular;
  }

  async function getShorts() {
    const all = await getAllVideos();
    const shorts = all.filter(v => v.type === 'short');
    shorts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return shorts;
  }

  async function getVideoById(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('videos', 'readonly');
      const store = tx.objectStore('videos');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function updateVideo(video) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('videos', 'readwrite');
      const store = tx.objectStore('videos');
      const req = store.put(video);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteVideo(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('videos', 'readwrite');
      const store = tx.objectStore('videos');
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async function addToHistory(videoId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readwrite');
      const store = tx.objectStore('history');
      const req = store.add({
        videoId: videoId,
        watchedAt: Date.now()
      });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async function getHistory() {
    const db = await openDB();
    const historyEntries = await new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readonly');
      const store = tx.objectStore('history');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    historyEntries.sort((a, b) => b.watchedAt - a.watchedAt);

    // Fetch video info for each history item
    const videos = await getAllVideos();
    const videoMap = new Map(videos.map(v => [v.id, v]));

    return historyEntries
      .map(h => ({
        ...h,
        video: videoMap.get(h.videoId)
      }))
      .filter(h => h.video);
  }

  async function toggleLike(videoId) {
    const video = await getVideoById(videoId);
    if (!video) return null;

    if (video.isLiked) {
      video.isLiked = false;
      video.likes = Math.max(0, (video.likes || 1) - 1);
    } else {
      video.isLiked = true;
      video.likes = (video.likes || 0) + 1;
      if (video.isDisliked) {
        video.isDisliked = false;
        video.dislikes = Math.max(0, (video.dislikes || 1) - 1);
      }
    }
    await updateVideo(video);
    return video;
  }

  async function toggleDislike(videoId) {
    const video = await getVideoById(videoId);
    if (!video) return null;

    if (video.isDisliked) {
      video.isDisliked = false;
      video.dislikes = Math.max(0, (video.dislikes || 1) - 1);
    } else {
      video.isDisliked = true;
      video.dislikes = (video.dislikes || 0) + 1;
      if (video.isLiked) {
        video.isLiked = false;
        video.likes = Math.max(0, (video.likes || 1) - 1);
      }
    }
    await updateVideo(video);
    return video;
  }

  async function addComment(videoId, author, text) {
    const db = await openDB();
    const comment = {
      videoId,
      author: author || 'Вы',
      avatarColor: '#ff0000',
      avatarInitial: (author || 'В')[0].toUpperCase(),
      text,
      time: 'Только что',
      likes: 0,
      createdAt: Date.now()
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction('comments', 'readwrite');
      const store = tx.objectStore('comments');
      const req = store.add(comment);
      req.onsuccess = () => resolve(comment);
      req.onerror = () => reject(req.error);
    });
  }

  async function getComments(videoId) {
    const db = await openDB();
    const userComments = await new Promise((resolve, reject) => {
      const tx = db.transaction('comments', 'readonly');
      const store = tx.objectStore('comments');
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result || []).filter(c => c.videoId === videoId));
      req.onerror = () => reject(req.error);
    });

    // Provide default authentic YouTube comments if few
    const defaultComments = [
      {
        id: 'def-1',
        author: 'Александр Иванов',
        avatarColor: '#0284c7',
        avatarInitial: 'А',
        text: 'Очень качественно сделано! Спасибо за отличный контент 🔥',
        time: '3 часа назад',
        likes: 142
      },
      {
        id: 'def-2',
        author: 'TechGeek_2026',
        avatarColor: '#16a34a',
        avatarInitial: 'T',
        text: 'Круто, что работает полностью локально и без интернета! Лайк однозначно 👍',
        time: '1 день назад',
        likes: 89
      },
      {
        id: 'def-3',
        author: 'Мария Смирнова',
        avatarColor: '#9333ea',
        avatarInitial: 'М',
        text: 'Жду продолжения! Сделай отдельный ролик на эту тему 🙏',
        time: '2 дня назад',
        likes: 27
      }
    ];

    return [...userComments.reverse(), ...defaultComments];
  }

  async function getStorageStats() {
    const videos = await getAllVideos();
    let totalBytes = 0;
    let videoCount = 0;
    let shortsCount = 0;

    videos.forEach(v => {
      if (v.type === 'short') shortsCount++;
      else videoCount++;

      if (v.videoBlob && v.videoBlob.size) totalBytes += v.videoBlob.size;
      if (v.thumbnailBlob && v.thumbnailBlob.size) totalBytes += v.thumbnailBlob.size;
    });

    const mb = (totalBytes / (1024 * 1024)).toFixed(1);
    return {
      totalBytes,
      mb,
      videoCount,
      shortsCount,
      totalCount: videos.length
    };
  }

  async function clearAll() {
    const db = await openDB();
    const stores = ['videos', 'history', 'liked', 'comments'];
    const tx = db.transaction(stores, 'readwrite');
    stores.forEach(s => tx.objectStore(s).clear());
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
    });
  }

  return {
    openDB,
    addVideo,
    getAllVideos,
    getRegularVideos,
    getShorts,
    getVideoById,
    updateVideo,
    deleteVideo,
    addToHistory,
    getHistory,
    toggleLike,
    toggleDislike,
    addComment,
    getComments,
    getStorageStats,
    clearAll
  };
})();
