// video-generator.js - Generates offline synthetic sample videos with audio for YouTube Clone
window.VideoGenerator = (function() {
  
  // Helper to generate an animated canvas video blob with audio
  async function generateSampleVideoBlob({ width, height, durationSec = 4, renderFrame, audioTone = 440 }) {
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Web Audio API for sound
        let audioCtx;
        let dest;
        let osc;
        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) {
            audioCtx = new AudioContextClass();
            dest = audioCtx.createMediaStreamDestination();
            osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(audioTone, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            osc.connect(gain);
            gain.connect(dest);
            osc.start();
          }
        } catch (e) {
          console.warn('AudioContext not available for synthetic video', e);
        }

        const canvasStream = canvas.captureStream ? canvas.captureStream(30) : null;
        if (!canvasStream || typeof MediaRecorder === 'undefined') {
          // Fallback if MediaRecorder is not supported
          canvas.toBlob((thumbBlob) => {
            resolve({ videoBlob: null, thumbnailBlob: thumbBlob });
          }, 'image/jpeg', 0.85);
          return;
        }

        let combinedStream = canvasStream;
        if (dest && dest.stream && dest.stream.getAudioTracks().length > 0) {
          combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...dest.stream.getAudioTracks()
          ]);
        }

        let mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported('video/webm')) {
          if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
          } else {
            mimeType = '';
          }
        }

        const options = mimeType ? { mimeType } : {};
        const recorder = new MediaRecorder(combinedStream, options);
        const chunks = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        let thumbnailBlob = null;
        let startTime = performance.now();
        const totalMs = durationSec * 1000;
        let animId;

        recorder.onstop = () => {
          if (osc) {
            try { osc.stop(); } catch(e){}
          }
          if (audioCtx) {
            try { audioCtx.close(); } catch(e){}
          }
          const videoBlob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
          resolve({ videoBlob, thumbnailBlob });
        };

        recorder.start();

        function loop(now) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / totalMs, 1);

          renderFrame(ctx, width, height, progress, elapsed);

          // Capture thumbnail at 20% progress
          if (!thumbnailBlob && progress >= 0.2) {
            canvas.toBlob((b) => { thumbnailBlob = b; }, 'image/jpeg', 0.88);
          }

          if (elapsed < totalMs) {
            animId = requestAnimationFrame(loop);
          } else {
            if (!thumbnailBlob) {
              canvas.toBlob((b) => {
                thumbnailBlob = b;
                recorder.stop();
              }, 'image/jpeg', 0.88);
            } else {
              recorder.stop();
            }
          }
        }

        animId = requestAnimationFrame(loop);

      } catch (err) {
        console.error('Error generating sample video:', err);
        // Fallback: create mock blank blob
        resolve({ videoBlob: null, thumbnailBlob: null });
      }
    });
  }

  // Create thumbnail directly from an existing video element or file
  function extractThumbnailFromVideo(videoElement, time = 1.0) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const w = videoElement.videoWidth || 640;
      const h = videoElement.videoHeight || 360;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      const onSeeked = () => {
        ctx.drawImage(videoElement, 0, 0, w, h);
        canvas.toBlob((blob) => {
          videoElement.removeEventListener('seeked', onSeeked);
          resolve(blob);
        }, 'image/jpeg', 0.85);
      };

      videoElement.addEventListener('seeked', onSeeked);
      videoElement.currentTime = Math.min(time, Math.max(0.1, (videoElement.duration || 2) / 2));
    });
  }

  // Built-in presets for demo videos
  const PRESET_VIDEOS = [
    {
      id: 'demo-1',
      title: '🌌 Путешествие на край Вселенной в 4K Ultra HD | Документальный фильм',
      channel: 'Космос Онлайн',
      avatarColor: '#1a73e8',
      avatarInitial: 'К',
      verified: true,
      subscribers: '2,48 млн подписчиков',
      views: '1,4 млн просмотров',
      date: '2 дня назад',
      duration: '04:12',
      durationSec: 252,
      type: 'video',
      category: 'Наука',
      tags: ['#космос', '#вселенная', '#астрономия', '#наука'],
      likes: 124500,
      dislikes: 120,
      description: 'Погрузитесь в захватывающее путешествие сквозь галактики, туманности и черные дыры. Полное руководство по глубинам космоса в высочайшем качестве!\n\n🔔 Подписывайтесь на канал и ставьте лайки!',
      generator: {
        width: 640,
        height: 360,
        durationSec: 4,
        audioTone: 320,
        render: (ctx, w, h, p, t) => {
          // Deep space gradient
          const grad = ctx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, '#05051a');
          grad.addColorStop(0.5, '#120b2e');
          grad.addColorStop(1, '#020208');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);

          // Stars
          const starCount = 80;
          for (let i = 0; i < starCount; i++) {
            const sx = (i * 12345 + t * 0.05 * (i % 3 + 1)) % w;
            const sy = (i * 6789) % h;
            const size = (i % 3) + 1;
            const alpha = 0.4 + 0.6 * Math.sin(t * 0.005 + i);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(sx, sy, size, size);
          }

          // Glowing Nebula
          const cx = w * 0.5 + Math.cos(t * 0.001) * 30;
          const cy = h * 0.5 + Math.sin(t * 0.001) * 20;
          const radGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 140);
          radGrad.addColorStop(0, 'rgba(168, 85, 247, 0.7)');
          radGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.4)');
          radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = radGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, 140, 0, Math.PI * 2);
          ctx.fill();

          // Glowing Planet
          const px = w * 0.72;
          const py = h * 0.4;
          const pRad = 45;
          const planetGrad = ctx.createRadialGradient(px - 15, py - 15, 5, px, py, pRad);
          planetGrad.addColorStop(0, '#60a5fa');
          planetGrad.addColorStop(0.7, '#1e3a8a');
          planetGrad.addColorStop(1, '#020617');
          ctx.fillStyle = planetGrad;
          ctx.beginPath();
          ctx.arc(px, py, pRad, 0, Math.PI * 2);
          ctx.fill();

          // Overlay Title badge
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.roundRect ? ctx.roundRect(20, h - 60, 280, 40, 8) : ctx.fillRect(20, h - 60, 280, 40);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px Roboto, sans-serif';
          ctx.fillText('SPACE EXPLORATION 4K', 35, h - 35);
        }
      }
    },
    {
      id: 'demo-2',
      title: '⚡ Как выучить JavaScript и React в 2026 году | Дорожная карта программиста с нуля',
      channel: 'CodeMaster Pro',
      avatarColor: '#10b981',
      avatarInitial: 'C',
      verified: true,
      subscribers: '890 тыс. подписчиков',
      views: '540 тыс. просмотров',
      date: '1 неделю назад',
      duration: '18:45',
      durationSec: 1125,
      type: 'video',
      category: 'Обучение',
      tags: ['#javascript', '#react', '#frontend', '#webdev'],
      likes: 67300,
      dislikes: 85,
      description: 'В этом подробном видео мы разберем актуальный роадмап для изучения веб-разработки: от базы HTML/CSS до современного Fullstack, SSR и ИИ инструментов.\n\nМатериалы и ссылки в закрепленном комментарии!',
      generator: {
        width: 640,
        height: 360,
        durationSec: 4,
        audioTone: 440,
        render: (ctx, w, h, p, t) => {
          // Dark IDE background
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, w, h);

          // Code lines matrix effect
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(30, 25, w - 60, h - 50);

          // Window dots
          ctx.fillStyle = '#ef4444';
          ctx.beginPath(); ctx.arc(50, 45, 6, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath(); ctx.arc(70, 45, 6, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#10b981';
          ctx.beginPath(); ctx.arc(90, 45, 6, 0, Math.PI*2); ctx.fill();

          // Code text
          ctx.font = '14px monospace';
          const lines = [
            { text: 'const developer = new WebDeveloper({', col: '#94a3b8' },
            { text: '  name: "Frontend Master",', col: '#38bdf8' },
            { text: '  skills: ["HTML5", "CSS3", "JavaScript", "React"],', col: '#a78bfa' },
            { text: '  mode: "Full Offline Capability",', col: '#4ade80' },
            { text: '  learningRate: 1.0,', col: '#fbbf24' },
            { text: '});', col: '#94a3b8' },
            { text: 'console.log("Welcome to YouTube Clone!");', col: '#f43f5e' }
          ];

          lines.forEach((l, idx) => {
            ctx.fillStyle = l.col;
            ctx.fillText(l.text, 50, 85 + idx * 26);
          });

          // Typing cursor
          if (Math.floor(t / 400) % 2 === 0) {
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(400, 85 + 6 * 26 - 12, 10, 16);
          }
        }
      }
    },
    {
      id: 'demo-3',
      title: '🎧 Lo-Fi Chill Beats | Музыка для учебы, работы и отдыха [Оффлайн Релакс]',
      channel: 'Lo-Fi Chill Zone',
      avatarColor: '#f59e0b',
      avatarInitial: 'L',
      verified: true,
      subscribers: '3,12 млн подписчиков',
      views: '4,8 млн просмотров',
      date: '3 месяца назад',
      duration: '45:00',
      durationSec: 2700,
      type: 'video',
      category: 'Музыка',
      tags: ['#lofi', '#chill', '#beats', '#study'],
      likes: 310000,
      dislikes: 410,
      description: 'Уютная Lo-Fi музыка для продуктивной работы, учебы и крепкого сна. Создайте атмосферу уюта прямо у себя в комнате.\n\nТрек-лист в описании!',
      generator: {
        width: 640,
        height: 360,
        durationSec: 4,
        audioTone: 261.6,
        render: (ctx, w, h, p, t) => {
          // Warm sunset cozy room
          const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
          bgGrad.addColorStop(0, '#f97316');
          bgGrad.addColorStop(0.5, '#ea580c');
          bgGrad.addColorStop(1, '#431407');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, w, h);

          // Big sun
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(w * 0.5, h * 0.55, 90, 0, Math.PI * 2);
          ctx.fill();

          // City skyline silhouette
          ctx.fillStyle = '#1c1917';
          for (let i = 0; i < 15; i++) {
            const bw = 35 + (i * 7 % 25);
            const bh = 70 + (i * 23 % 100);
            const bx = i * 44;
            ctx.fillRect(bx, h - bh, bw, bh);
          }

          // Sound wave bars
          ctx.fillStyle = '#ffffff';
          const bars = 24;
          for (let i = 0; i < bars; i++) {
            const barH = 15 + Math.sin(t * 0.008 + i * 0.5) * 18 + 10;
            ctx.fillRect(w * 0.25 + i * 14, h - 30 - barH, 8, barH);
          }

          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.roundRect ? ctx.roundRect(w * 0.5 - 130, 25, 260, 45, 20) : ctx.fillRect(w * 0.5 - 130, 25, 260, 45);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 15px Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('LO-FI CHILL RADIO 24/7', w * 0.5, 52);
          ctx.textAlign = 'left';
        }
      }
    },
    // SHORTS
    {
      id: 'demo-short-1',
      title: 'Невероятный лайфхак со смартфоном! Ты точно этого не знал 😱🔥 #shorts #tricks',
      channel: 'TechHacks Ru',
      avatarColor: '#ec4899',
      avatarInitial: 'T',
      verified: true,
      subscribers: '1,2 млн',
      views: '2,9 млн',
      date: '1 день назад',
      duration: '00:30',
      durationSec: 30,
      type: 'short',
      category: 'Лайфхаки',
      tags: ['#shorts', '#tricks', '#lifehack'],
      likes: 245000,
      dislikes: 1200,
      description: 'Попробуй эту фишку прямо сейчас в настройках!',
      audioTrack: 'Original Sound - TechHacks Ru',
      generator: {
        width: 360,
        height: 640,
        durationSec: 4,
        audioTone: 520,
        render: (ctx, w, h, p, t) => {
          // Vertical gradient
          const grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, '#831843');
          grad.addColorStop(0.5, '#be185d');
          grad.addColorStop(1, '#500724');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);

          // Animated pulse circle
          const scale = 1 + 0.1 * Math.sin(t * 0.008);
          ctx.save();
          ctx.translate(w * 0.5, h * 0.4);
          ctx.scale(scale, scale);

          const rGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 90);
          rGrad.addColorStop(0, '#f472b6');
          rGrad.addColorStop(1, 'rgba(236, 72, 153, 0)');
          ctx.fillStyle = rGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 90, 0, Math.PI * 2);
          ctx.fill();

          // Smartphone mockup inside shorts
          ctx.fillStyle = '#0f172a';
          ctx.roundRect ? ctx.roundRect(-50, -90, 100, 180, 16) : ctx.fillRect(-50, -90, 100, 180);
          ctx.fill();

          ctx.fillStyle = '#38bdf8';
          ctx.roundRect ? ctx.roundRect(-42, -75, 84, 150, 10) : ctx.fillRect(-42, -75, 84, 150);
          ctx.fill();

          // Lightning icon
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.moveTo(5, -25);
          ctx.lineTo(-15, 10);
          ctx.lineTo(0, 10);
          ctx.lineTo(-5, 30);
          ctx.lineTo(20, -5);
          ctx.lineTo(5, -5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          // Big Shorts Title text
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 24px Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('СЕКРЕТНЫЙ ТРЮК!', w * 0.5, h * 0.7);
          ctx.font = '600 16px Roboto, sans-serif';
          ctx.fillStyle = '#fde047';
          ctx.fillText('СМОТРИ ДО КОНЦА 👇', w * 0.5, h * 0.75);
          ctx.textAlign = 'left';
        }
      }
    },
    {
      id: 'demo-short-2',
      title: 'Кот впервые увидел пылесос-робот 😂🐈 #shorts #cats #funny',
      channel: 'Мяу Клуб',
      avatarColor: '#8b5cf6',
      avatarInitial: 'М',
      verified: true,
      subscribers: '650 тыс.',
      views: '5,1 млн',
      date: '4 дня назад',
      duration: '00:15',
      durationSec: 15,
      type: 'short',
      category: 'Животные',
      tags: ['#shorts', '#cats', '#funny'],
      likes: 620000,
      dislikes: 800,
      description: 'Его реакция просто бесценна! Поставьте лайк пушистому!',
      audioTrack: 'Funny Meow Beats - Viral TikTok',
      generator: {
        width: 360,
        height: 640,
        durationSec: 4,
        audioTone: 660,
        render: (ctx, w, h, p, t) => {
          // Playful pastel background
          const grad = ctx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, '#6366f1');
          grad.addColorStop(0.5, '#4f46e5');
          grad.addColorStop(1, '#312e81');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);

          // Draw funny cute cat face
          const cx = w * 0.5;
          const cy = h * 0.42;

          // Cat Ears
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.moveTo(cx - 70, cy - 40);
          ctx.lineTo(cx - 50, cy - 110);
          ctx.lineTo(cx - 15, cy - 65);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(cx + 70, cy - 40);
          ctx.lineTo(cx + 50, cy - 110);
          ctx.lineTo(cx + 15, cy - 65);
          ctx.closePath();
          ctx.fill();

          // Cat Head
          ctx.fillStyle = '#fb923c';
          ctx.beginPath();
          ctx.arc(cx, cy, 70, 0, Math.PI * 2);
          ctx.fill();

          // Big Cute Eyes
          const eyeBlink = Math.sin(t * 0.006) > 0.95 ? 2 : 18;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(cx - 28, cy - 10, 18, eyeBlink, 0, 0, Math.PI * 2);
          ctx.ellipse(cx + 28, cy - 10, 18, eyeBlink, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(cx - 28, cy - 10, Math.min(10, eyeBlink), 0, Math.PI * 2);
          ctx.arc(cx + 28, cy - 10, Math.min(10, eyeBlink), 0, Math.PI * 2);
          ctx.fill();

          // Nose & mouth
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(cx, cy + 12, 7, 0, Math.PI * 2);
          ctx.fill();

          // Animated Question marks
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 36px Roboto, sans-serif';
          ctx.fillText('???', cx + 60 + Math.sin(t * 0.01) * 8, cy - 50);

          // Text
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 22px Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('КОТ VS РОБОТ-ПЫЛЕСОС 🙀', w * 0.5, h * 0.72);
          ctx.font = '500 16px Roboto, sans-serif';
          ctx.fillStyle = '#cbd5e1';
          ctx.fillText('Шок контент!', w * 0.5, h * 0.77);
          ctx.textAlign = 'left';
        }
      }
    }
  ];

  // Initialize preset demo videos into IndexedDB if needed
  async function seedDemoVideosIfEmpty(db) {
    const existing = await db.getAllVideos();
    if (existing && existing.length > 0) {
      return false; // Already has data
    }

    console.log('Seeding initial demo videos...');
    for (const preset of PRESET_VIDEOS) {
      const { videoBlob, thumbnailBlob } = await generateSampleVideoBlob({
        width: preset.generator.width,
        height: preset.generator.height,
        durationSec: preset.generator.durationSec,
        audioTone: preset.generator.audioTone,
        renderFrame: preset.generator.render
      });

      const videoRecord = {
        id: preset.id,
        title: preset.title,
        channel: preset.channel,
        avatarColor: preset.avatarColor,
        avatarInitial: preset.avatarInitial,
        verified: preset.verified,
        subscribers: preset.subscribers,
        views: preset.views,
        date: preset.date,
        duration: preset.duration,
        durationSec: preset.durationSec,
        type: preset.type,
        category: preset.category,
        tags: preset.tags,
        likes: preset.likes,
        dislikes: preset.dislikes,
        description: preset.description,
        audioTrack: preset.audioTrack || '',
        videoBlob: videoBlob,
        thumbnailBlob: thumbnailBlob,
        createdAt: Date.now()
      };

      await db.addVideo(videoRecord);
    }
    console.log('Demo videos initialized successfully!');
    return true;
  }

  return {
    generateSampleVideoBlob,
    extractThumbnailFromVideo,
    seedDemoVideosIfEmpty,
    PRESET_VIDEOS
  };
})();
