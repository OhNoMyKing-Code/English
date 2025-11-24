// app.js - handles TTS, recording, recognition and scoring
(() => {
  // Helpers
  const $ = id => document.getElementById(id);
  const sanitize = s => (s||'').toLowerCase().replace(/[^\w\s']/g, '').trim();

  // Levenshtein distance
  function levenshtein(a, b){
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = Array.from({length: m+1}, () => new Array(n+1).fill(0));
    for (let i=0;i<=m;i++) dp[i][0]=i;
    for (let j=0;j<=n;j++) dp[0][j]=j;
    for (let i=1;i<=m;i++){
      for (let j=1;j<=n;j++){
        const cost = a[i-1] === b[j-1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i-1][j] + 1,
          dp[i][j-1] + 1,
          dp[i-1][j-1] + cost
        );
      }
    }
    return dp[m][n];
  }

  // Score as percentage similarity (0-100)
  function similarityScore(ref, hyp){
    const a = sanitize(ref);
    const b = sanitize(hyp);
    if (!a && !b) return 100;
    if (!a || !b) return 0;
    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    const score = Math.max(0, Math.round((1 - dist / maxLen) * 100));
    return score;
  }

  // Elements
  const preset = $('preset');
  const textEl = $('text');
  const voiceSelect = $('voiceSelect');
  const speakBtn = $('speakBtn');
  const startRecBtn = $('startRecBtn');
  const stopRecBtn = $('stopRecBtn');
  const transcriptEl = $('transcript');
  const scoreEl = $('score');
  const notesEl = $('notes');
  const playRefBtn = $('playRefBtn');
  const downloadBtn = $('downloadBtn');
  const statusEl = $('status');
  const yearEl = $('year');

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Speech Synthesis (voices)
  let voices = [];
  function loadVoices(){
    voices = speechSynthesis.getVoices();
    voiceSelect.innerHTML = '';
    if (!voices || voices.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = 'Default';
      voiceSelect.appendChild(opt);
      return;
    }
    voices.forEach((v, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${v.name} ${v.lang}${v.default ? ' — default' : ''}`;
      voiceSelect.appendChild(opt);
    });
  }
  loadVoices();
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  function speakText(text){
    if (!window.speechSynthesis) {
      alert('Trình duyệt không hỗ trợ SpeechSynthesis.');
      return;
    }
    const ut = new SpeechSynthesisUtterance(text);
    const idx = parseInt(voiceSelect.value, 10);
    if (!isNaN(idx) && voices[idx]) ut.voice = voices[idx];
    ut.rate = 1.0;
    ut.pitch = 1.0;
    speechSynthesis.cancel();
    speechSynthesis.speak(ut);
  }

  // Preset selection -> fill textarea
  preset.addEventListener('change', () => {
    textEl.value = preset.value;
  });

  // Play reference button
  playRefBtn.addEventListener('click', () => {
    speakText(textEl.value || preset.value);
  });

  // Speak button (TTS)
  speakBtn.addEventListener('click', () => {
    const t = textEl.value || preset.value;
    if (!t || t.trim() === '') return;
    speakText(t);
  });

  // Recording + Recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let recognition = null;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
  }

  let mediaRecorder = null;
  let recordedChunks = [];
  let audioBlob = null;

  async function startRecording() {
    transcriptEl.textContent = '—';
    scoreEl.textContent = '—';
    notesEl.textContent = '';
    statusEl.textContent = 'Đang chuẩn bị...';
    recordedChunks = [];
    audioBlob = null;
    downloadBtn.disabled = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
      };
      mediaRecorder.onstart = () => {
        statusEl.textContent = 'Đang ghi âm...';
      };
      mediaRecorder.onstop = () => {
        audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
        downloadBtn.disabled = false;
        statusEl.textContent = 'Ghi âm hoàn tất.';
      };
      mediaRecorder.start();

      // Start recognition if available
      if (recognition) {
        recognition.start();
        statusEl.textContent = 'Đang ghi âm và nhận dạng...';
      } else {
        statusEl.textContent = 'Đang ghi âm (trình duyệt không hỗ trợ nhận dạng giọng nói).';
      }

      startRecBtn.disabled = true;
      stopRecBtn.disabled = false;
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Không thể truy cập microphone: ' + (err.message || err.name);
      startRecBtn.disabled = false;
      stopRecBtn.disabled = true;
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    try {
      // stop all tracks
      if (mediaRecorder && mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
      }
    } catch (e) {}
    if (recognition) {
      try { recognition.stop(); } catch(e){}
    }
    startRecBtn.disabled = false;
    stopRecBtn.disabled = true;
  }

  // Recognition events
  if (recognition) {
    recognition.addEventListener('result', (e) => {
      const text = Array.from(e.results)
        .map(r => r[0].transcript)
        .join(' ');
      transcriptEl.textContent = text;
      // compute score
      const ref = textEl.value || preset.value;
      const score = similarityScore(ref, text);
      scoreEl.textContent = score + '%';
      if (score < 60) {
        notesEl.textContent = 'Hơi khác nhiều. Hãy thử chậm lại, chú ý phát âm từng từ.';
      } else if (score < 85) {
        notesEl.textContent = 'Tốt — có vài khác biệt. Luyện thêm để cải thiện ngữ điệu và từ khó.';
      } else {
        notesEl.textContent = 'Rất tốt! Gần giống mẫu.';
      }
    });

    recognition.addEventListener('end', () => {
      // recognition ended (either user stopped or silence)
      if (!audioBlob && recordedChunks.length > 0) {
        audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
        downloadBtn.disabled = false;
      }
      statusEl.textContent = 'Nhận dạng kết thúc.';
    });

    recognition.addEventListener('error', (e) => {
      console.warn('Recognition error', e);
      statusEl.textContent = 'Lỗi nhận dạng giọng nói: ' + (e.error || e.message || e.type);
    });
  }

  // Buttons
  startRecBtn.addEventListener('click', startRecording);
  stopRecBtn.addEventListener('click', stopRecording);

  // Download recorded audio
  downloadBtn.addEventListener('click', () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recording.webm';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // Keep UI updated for browsers without APIs
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    startRecBtn.disabled = true;
    stopRecBtn.disabled = true;
    statusEl.textContent = 'Trình duyệt không hỗ trợ ghi âm (MediaDevices).';
  }
  if (!window.speechSynthesis) {
    speakBtn.disabled = true;
    playRefBtn.disabled = true;
    statusEl.textContent = (statusEl.textContent ? statusEl.textContent + ' ' : '') + 'Trình duyệt không hỗ trợ TTS.';
  }
  if (!SpeechRecognition) {
    statusEl.textContent = (statusEl.textContent ? statusEl.textContent + ' ' : '') + 'Nhận dạng giọng nói không khả dụng trên trình duyệt này.';
  }

  // Small UX: update textarea when preset changes on load
  document.addEventListener('DOMContentLoaded', () => {
    if (preset && textEl && !textEl.value) textEl.value = preset.value || '';
  });

})();
