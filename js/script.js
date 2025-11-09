// Small JS for nav toggle, lightbox and typed effect
document.addEventListener('DOMContentLoaded', ()=>{
  // nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  if(toggle){
    toggle.addEventListener('click', ()=>{
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      if(nav.style.display === 'flex') nav.style.display = '';
      else nav.style.display = 'flex';
    });
  }

  // simple lightbox for gallery
  const thumbs = document.querySelectorAll('.thumb');
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  const lbClose = document.querySelector('.lb-close');
  thumbs.forEach(t => t && t.addEventListener('click', (e)=>{
    const src = e.target.getAttribute('src');
    lbImg.src = src; lb.setAttribute('aria-hidden','false');
  }));
  if(lbClose) lbClose.addEventListener('click', ()=>{ lb.setAttribute('aria-hidden','true'); lbImg.src=''; });
  if(lb) lb.addEventListener('click', (e)=>{ if(e.target === lb) { lb.setAttribute('aria-hidden','true'); lbImg.src=''; } });

  // tiny typed effect on letters page
  const typedEl = document.getElementById('typed');
  if(typedEl){
    const text = typedEl.textContent;
    typedEl.textContent = '';
    let i=0;
    const id = setInterval(()=>{
      typedEl.textContent += text.charAt(i);
      i++;
      if(i>text.length) clearInterval(id);
    },50);
  }

  /* Custom audio player + playlist behavior */
  const audio = document.getElementById('player-audio');
  if(audio){
    const playBtn = document.getElementById('ap-play');
    const prevBtn = document.getElementById('ap-prev');
    const nextBtn = document.getElementById('ap-next');
    const repeatBtn = document.getElementById('ap-repeat');
    const filled = document.getElementById('ap-filled');
    const progress = document.getElementById('ap-progress');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const volumeEl = document.getElementById('volume');
    const titleEl = document.getElementById('ap-title');
    const downloadLink = document.getElementById('download-link');
    const trackButtons = Array.from(document.querySelectorAll('.playlist-list .track'));

    // playlist state
    let currentIndex = 0;
    // repeat modes: 'off' | 'one' | 'all'
    let repeatMode = 'off';

    // format seconds to M:SS
    const fmt = (s)=>{
      if(isNaN(s)) return '0:00';
      const m = Math.floor(s/60); const sec = Math.floor(s%60).toString().padStart(2,'0');
      return `${m}:${sec}`;
    };

    // Convert Google Drive sharing URL to streaming URL with error handling
    function getDirectUrl(url) {
      if (!url) return url;
      // Check if it's a Google Drive URL
      if (url.includes('drive.google.com/file/d/')) {
        // Extract the file ID from the URL
        const matches = url.match(/\/d\/([^/]+)/);
        if (matches && matches[1]) {
          const fileId = matches[1];
          // Use the direct media streaming format
          return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=AIzaSyAXZKTk73e1FnBLNxA2v5_bPKAx1_ijYxc`;
        }
      }
      return url;
    }

    // Handle audio errors and show status
    function handleAudioError(audio, titleEl, error) {
      console.error('Audio error:', error);
      titleEl.innerHTML = '⚠️ Playback error - Click again or try another song';
      // Try alternative streaming method if first one fails
      if (audio.src.includes('googleapis.com')) {
        const fileId = audio.src.match(/files\/(.*?)\?/)[1];
        audio.src = `https://drive.google.com/uc?export=download&id=${fileId}`;
        audio.load();
        return;
      }
      if (audio.src.includes('drive.google.com')) {
        const fileId = audio.src.match(/id=(.*?)(&|$)/)[1];
        audio.src = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=AIzaSyAXZKTk73e1FnBLNxA2v5_bPKAx1_ijYxc`;
        audio.load();
      }
    }

    // load given track index (do not autoplay by default)
    function loadTrack(i, autoplay){
      if(i < 0 || i >= trackButtons.length) return;
      currentIndex = i;
      const btn = trackButtons[i];
      const src = getDirectUrl(btn.dataset.src);
      // update active class
      trackButtons.forEach(t => t.classList.toggle('active', t === btn));
      
      // Show loading state
      titleEl.textContent = '⌛ Loading... ' + (btn.textContent || `Track ${i+1}`);
      
      // set audio source
      audio.src = src;
      audio.load();
      downloadLink.href = btn.dataset.src; // Keep original link for download
      
      // reset UI
      filled.style.width = '0%';
      currentTimeEl.textContent = fmt(0);
      durationEl.textContent = fmt(0);
      
      // Handle errors
      audio.onerror = (e) => handleAudioError(audio, titleEl, e);
      
      // Handle successful load
      audio.oncanplay = () => {
        titleEl.textContent = btn.textContent || `Track ${i+1}`;
        if(autoplay){
          audio.play()
            .then(() => playBtn.textContent = '❚❚')
            .catch(e => {
              console.error('Playback failed:', e);
              titleEl.textContent = '⚠️ Playback blocked - Click play to try again';
            });
        } else {
          playBtn.textContent = '►';
        }
      };
      
      if(autoplay){
        audio.play()
          .then(() => playBtn.textContent = '❚❚')
          .catch(e => console.error('Initial playback failed:', e));
      }
    }

    // initialize first track
    if(trackButtons.length > 0){
      loadTrack(0, false);
    }

    // update UI when metadata loaded
    audio.addEventListener('loadedmetadata', ()=>{
      durationEl.textContent = fmt(audio.duration);
      volumeEl.value = audio.volume || 0.8;
    });

    // update progress as audio plays
    audio.addEventListener('timeupdate', ()=>{
      const pct = (audio.currentTime / (audio.duration || 1)) * 100;
      filled.style.width = pct + '%';
      currentTimeEl.textContent = fmt(audio.currentTime);
    });

    // play / pause
    playBtn.addEventListener('click', ()=>{
      if(audio.paused){ audio.play(); playBtn.textContent = '❚❚'; }
      else { audio.pause(); playBtn.textContent = '►'; }
    });

    // prev / next
    function playNext(){
      if(currentIndex < trackButtons.length - 1){
        loadTrack(currentIndex + 1, true);
      } else if(repeatMode === 'all'){
        loadTrack(0, true);
      } else {
        // end of playlist
        audio.pause(); audio.currentTime = 0; playBtn.textContent = '►';
      }
    }
    function playPrev(){
      if(audio.currentTime > 3){
        audio.currentTime = 0; return;
      }
      if(currentIndex > 0){
        loadTrack(currentIndex - 1, true);
      } else if(repeatMode === 'all'){
        loadTrack(trackButtons.length - 1, true);
      } else {
        audio.currentTime = 0; audio.pause(); playBtn.textContent = '►';
      }
    }
    if(nextBtn) nextBtn.addEventListener('click', playNext);
    if(prevBtn) prevBtn.addEventListener('click', playPrev);

    // progress seek
    const seek = (e)=>{
      const rect = progress.getBoundingClientRect();
      const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
      const pct = Math.min(Math.max(0, x / rect.width), 1);
      audio.currentTime = pct * (audio.duration || 1);
    };
    progress.addEventListener('click', seek);
    progress.addEventListener('keydown', (e)=>{
      if(e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
      if(e.key === 'ArrowRight') audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
    });

    // volume control
    volumeEl.addEventListener('input', (e)=>{ audio.volume = parseFloat(e.target.value); });

    // clicking a track
    trackButtons.forEach((t, idx) => {
      t.addEventListener('click', ()=>{ loadTrack(idx, true); });
    });

    // repeat button cycles modes
    if(repeatBtn){
      const modes = ['off','one','all'];
      repeatBtn.addEventListener('click', ()=>{
        const nextMode = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
        repeatMode = nextMode;
        repeatBtn.dataset.mode = repeatMode;
        repeatBtn.setAttribute('aria-pressed', repeatMode !== 'off');
        // visual label (optional)
        if(repeatMode === 'off') repeatBtn.title = 'Repeat: Off';
        else if(repeatMode === 'one') repeatBtn.title = 'Repeat: One';
        else repeatBtn.title = 'Repeat: All';
      });
    }

    // ended behavior
    audio.addEventListener('ended', ()=>{
      if(repeatMode === 'one'){
        audio.currentTime = 0; audio.play();
      } else {
        playNext();
      }
    });
  }
});
