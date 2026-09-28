// SMART TRANSIT BUS ASSISTANT CLIENT APPLICATION
document.addEventListener('DOMContentLoaded', () => {

  // Global App State
  const state = {
    currentLat: 35.13750, // 부산 경성대·부경대역 (수영로)
    currentLng: 129.10050,
    currentStation: null,
    destination: null,
    activeTab: 'destination', // 'destination' | 'all-arrivals' | 'favorites'
    allStations: [],
    favorites: [],
    cachedArrivals: [],
    cachedMatches: [],
    timerInterval: null
  };

  // DOM Elements
  const el = {
    gpsStatusText: document.getElementById('gpsStatusText'),
    btnRefreshGps: document.getElementById('btnRefreshGps'),
    locationPresetSelect: document.getElementById('locationPresetSelect'),
    bannerCurrentStationName: document.getElementById('bannerCurrentStationName'),
    bannerDestinationStationName: document.getElementById('bannerDestinationStationName'),
    bannerDirectBusesCount: document.getElementById('bannerDirectBusesCount'),
    btnOpenDestModal: document.getElementById('btnOpenDestModal'),
    btnCloseDestModal: document.getElementById('btnCloseDestModal'),
    destModal: document.getElementById('destModal'),
    modalStationList: document.getElementById('modalStationList'),
    inputSearchStation: document.getElementById('inputSearchStation'),
    currentStationTitle: document.getElementById('currentStationTitle'),
    currentStationArs: document.getElementById('currentStationArs'),
    currentStationDistance: document.getElementById('currentStationDistance'),
    currentStationSubwayTags: document.getElementById('currentStationSubwayTags'),
    fastestCard: document.getElementById('fastestCard'),
    fastestBusTitle: document.getElementById('fastestBusTitle'),
    fastestBusDesc: document.getElementById('fastestBusDesc'),
    busListContainer: document.getElementById('busListContainer'),
    tabs: document.querySelectorAll('.tab-btn'),
    inputFavBusNumber: document.getElementById('inputFavBusNumber'),
    inputFavMemo: document.getElementById('inputFavMemo'),
    btnAddFavorite: document.getElementById('btnAddFavorite'),
    favoritesGrid: document.getElementById('favoritesGrid'),
    favCountBadge: document.getElementById('favCountBadge'),
    liveClock: document.getElementById('liveClock'),
    canvas: document.getElementById('routeMapCanvas')
  };

  const ctx = el.canvas ? el.canvas.getContext('2d') : null;

  // Initialize
  init();

  async function init() {
    setupEventListeners();
    await loadInitialLocation();
    await fetchStations();
    await fetchDestination();
    await fetchFavorites();
    await refreshAllData();

    // 1-second UI countdown and periodic fetch
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      decrementCountdownTimes();
      updateClock();
      renderCurrentTab();
      drawMap();
    }, 1000);

    // Re-sync with backend every 4 seconds
    setInterval(async () => {
      await refreshAllData(false);
    }, 4000);
  }

  function setupEventListeners() {
    // Tabs
    el.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        el.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeTab = tab.dataset.tab;
        renderCurrentTab();
      });
    });

    // Refresh GPS
    el.btnRefreshGps.addEventListener('click', () => {
      requestDeviceGps();
    });

    // Preset selector
    el.locationPresetSelect.addEventListener('change', (e) => {
      const [lat, lng] = e.target.value.split(',').map(Number);
      state.currentLat = lat;
      state.currentLng = lng;
      el.gpsStatusText.textContent = `위치 변경: ${e.target.options[e.target.selectedIndex].text.replace('시뮬레이션: ', '')}`;
      refreshAllData();
    });

    // Modal
    el.btnOpenDestModal.addEventListener('click', () => {
      el.destModal.classList.add('is-open');
      renderStationModalList('');
    });

    el.btnCloseDestModal.addEventListener('click', () => {
      el.destModal.classList.remove('is-open');
    });

    el.destModal.addEventListener('click', (e) => {
      if (e.target === el.destModal) {
        el.destModal.classList.remove('is-open');
      }
    });

    el.inputSearchStation.addEventListener('input', (e) => {
      renderStationModalList(e.target.value);
    });

    // Add Favorite
    el.btnAddFavorite.addEventListener('click', async () => {
      const busNum = el.inputFavBusNumber.value.trim();
      const memo = el.inputFavMemo.value.trim();
      if (!busNum) {
        alert('자주 타는 버스 번호를 입력해주세요.');
        return;
      }
      try {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'BUS',
            targetId: busNum,
            name: `${busNum}번 버스`,
            memo: memo || '자주 타는 버스'
          })
        });
        if (res.ok) {
          el.inputFavBusNumber.value = '';
          el.inputFavMemo.value = '';
          await fetchFavorites();
          await refreshAllData();
        }
      } catch (err) {
        console.error(err);
      }
    });

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
  }

  function resizeCanvas() {
    if (!el.canvas) return;
    const rect = el.canvas.parentElement.getBoundingClientRect();
    el.canvas.width = rect.width;
    el.canvas.height = rect.height;
    drawMap();
  }

  // Device GPS
  async function loadInitialLocation() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          state.currentLat = pos.coords.latitude;
          state.currentLng = pos.coords.longitude;
          el.gpsStatusText.textContent = `📍 GPS 정상 수신 (${state.currentLat.toFixed(4)}, ${state.currentLng.toFixed(4)})`;
        },
        (err) => {
          console.warn('GPS fallback:', err.message);
          el.gpsStatusText.textContent = '📍 기본 위치: 부산 수영로 (경성대·부경대역)';
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      el.gpsStatusText.textContent = '📍 기본 위치: 부산 수영로 (경성대·부경대역)';
    }
  }

  function requestDeviceGps() {
    if ('geolocation' in navigator) {
      el.gpsStatusText.textContent = 'GPS 좌표 확인 중...';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          state.currentLat = pos.coords.latitude;
          state.currentLng = pos.coords.longitude;
          el.gpsStatusText.textContent = `📍 GPS 갱신 완료 (${state.currentLat.toFixed(4)}, ${state.currentLng.toFixed(4)})`;
          refreshAllData();
        },
        (err) => {
          alert('GPS 신호를 획득할 수 없어 기본 위치를 유지합니다: ' + err.message);
        },
        { enableHighAccuracy: true, timeout: 7000 }
      );
    }
  }

  // API Requests
  async function fetchStations() {
    try {
      const res = await fetch('/api/stations');
      state.allStations = await res.json();
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchDestination() {
    try {
      const res = await fetch('/api/destination');
      state.destination = await res.json();
      if (state.destination && state.destination.stationName) {
        el.bannerDestinationStationName.textContent = state.destination.stationName;
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchFavorites() {
    try {
      const res = await fetch('/api/favorites');
      state.favorites = await res.json();
      renderFavoritesGrid();
    } catch (e) {
      console.error(e);
    }
  }

  async function refreshAllData(showLoading = true) {
    try {
      // 1. Nearby
      const nearbyRes = await fetch(`/api/stations/nearby?lat=${state.currentLat}&lng=${state.currentLng}&radius=1500`);
      const nearbyList = await nearbyRes.json();

      if (nearbyList && nearbyList.length > 0) {
        state.currentStation = nearbyList[0];
        updateCurrentStationCard(state.currentStation);
      }

      const stId = state.currentStation ? state.currentStation.station.id : 'ST-SNH';

      // 2. Arrivals
      const arrivalsRes = await fetch(`/api/arrivals?stationId=${stId}`);
      state.cachedArrivals = await arrivalsRes.json();

      // 3. Destination Matches
      const matchesRes = await fetch(`/api/destination/matches?lat=${state.currentLat}&lng=${state.currentLng}`);
      state.cachedMatches = await matchesRes.json();

      updateDestinationBannerCount();
      renderCurrentTab();
    } catch (err) {
      console.error(err);
    }
  }

  function updateCurrentStationCard(nearby) {
    if (!nearby || !nearby.station) return;
    const st = nearby.station;
    el.bannerCurrentStationName.textContent = st.name;
    el.currentStationTitle.textContent = st.name;
    el.currentStationArs.textContent = `ARS ${st.arsId || '22-011'}`;
    el.currentStationDistance.textContent = `도보 ${nearby.walkingMinutes}분 (${Math.round(nearby.distanceMeters)}m)`;

    if (st.subwayLines && st.subwayLines.length > 0) {
      el.currentStationSubwayTags.innerHTML = st.subwayLines
        .map(line => `<span class="subway-chip subway-${line}">${line}</span>`)
        .join('');
    } else {
      el.currentStationSubwayTags.innerHTML = '<span class="subway-chip" style="background:#64748B;">버스정류소</span>';
    }
  }

  function updateDestinationBannerCount() {
    const count = state.cachedMatches ? state.cachedMatches.length : 0;
    if (count > 0) {
      el.bannerDirectBusesCount.innerHTML = `<span>🚌</span> 직통 버스 <strong>${count}대</strong> 운행 중`;
    } else {
      el.bannerDirectBusesCount.innerHTML = `<span>⚠️</span> 직통 버스 없음 (환승 필요)`;
    }
  }

  function decrementCountdownTimes() {
    if (state.cachedArrivals) {
      state.cachedArrivals.forEach(arr => {
        if (arr.remainingSeconds > 0) arr.remainingSeconds--;
      });
    }
    if (state.cachedMatches) {
      state.cachedMatches.forEach(m => {
        if (m.arrivalInfo && m.arrivalInfo.remainingSeconds > 0) {
          m.arrivalInfo.remainingSeconds--;
        }
      });
    }
  }

  function updateClock() {
    const now = new Date();
    el.liveClock.textContent = `${now.toLocaleTimeString('ko-KR', { hour12: false })} 실시간 동기화`;
  }

  // Render Tabs
  function renderCurrentTab() {
    if (state.activeTab === 'destination') {
      renderDestinationMatches();
    } else if (state.activeTab === 'all-arrivals') {
      renderAllArrivals();
    } else if (state.activeTab === 'favorites') {
      renderFavoriteArrivals();
    }
  }

  function renderDestinationMatches() {
    const matches = state.cachedMatches || [];

    if (matches.length === 0) {
      el.fastestCard.style.display = 'none';
      el.busListContainer.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">🔍</span>
          현재 위치에서 [${state.destination ? state.destination.stationName : '목적지'}]까지<br>
          운행하는 직통 버스가 없습니다.<br>
          <span style="font-size:12px; color:var(--brand-primary); margin-top:6px; display:inline-block;">
            상단 [목적지 변경]을 통해 다른 역을 설정해보세요.
          </span>
        </div>
      `;
      return;
    }

    const fastest = matches[0];
    el.fastestCard.style.display = 'block';
    el.fastestBusTitle.textContent = `★ 지금 ${fastest.busNumber}번 버스를 타시면 가장 빠릅니다!`;
    el.fastestBusDesc.textContent = `${fastest.boardingStation.name}에서 탑승 시 ${fastest.stopsToDestination}개 정류장 후 [${fastest.destinationStation.name}] 도착 (총 약 ${fastest.totalEstimatedMinutes}분 소요)`;

    el.busListContainer.innerHTML = matches.map(m => createMatchCardHtml(m)).join('');
    bindCardEvents();
  }

  function renderAllArrivals() {
    el.fastestCard.style.display = 'none';
    const arrivals = state.cachedArrivals || [];

    if (arrivals.length === 0) {
      el.busListContainer.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">🚌</span>
          도착 예정인 버스 정보가 없습니다.
        </div>
      `;
      return;
    }

    el.busListContainer.innerHTML = arrivals.map(a => createArrivalCardHtml(a)).join('');
    bindCardEvents();
  }

  function renderFavoriteArrivals() {
    el.fastestCard.style.display = 'none';
    const arrivals = (state.cachedArrivals || []).filter(a => a.isFavorite);

    if (arrivals.length === 0) {
      el.busListContainer.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">⭐</span>
          자주 타는 버스 중 현재 정류소에 도착 예정인 버스가 없습니다.<br>
          <span style="font-size:12px; color:var(--brand-primary); margin-top:6px; display:inline-block;">
            우측 관리창에서 버스를 즐겨찾기로 등록해보세요!
          </span>
        </div>
      `;
      return;
    }

    el.busListContainer.innerHTML = arrivals.map(a => createArrivalCardHtml(a)).join('');
    bindCardEvents();
  }

  // Card Builders
  function createMatchCardHtml(m) {
    const arr = m.arrivalInfo;
    const isSoon = arr.remainingSeconds <= 35;
    const timeFormatted = formatSeconds(arr.remainingSeconds);
    const typeClass = getRouteTypeClass(m.routeType);
    const isFav = state.favorites.some(f => f.targetId === m.busNumber);

    return `
      <div class="bus-card ${m.isFastestOption ? 'is-fastest' : ''}">
        <div class="card-top-row">
          <div class="bus-badge-container">
            <span class="bus-number-chip ${typeClass}">${m.busNumber}</span>
            <div class="bus-dir-info">
              <span class="bus-dir-text">${arr.direction || '목적지 방면'}</span>
              <span class="bus-stops-estimate">목적지까지 ${m.stopsToDestination}정거장 (약 ${m.travelMinutesToDestination}분)</span>
            </div>
          </div>
          <button class="btn-favorite-toggle ${isFav ? 'is-active' : ''}" data-bus="${m.busNumber}" title="즐겨찾기">★</button>
        </div>

        <div class="arrival-row">
          <div class="time-and-stops">
            <span class="primary-remaining-time ${isSoon ? 'urgent' : ''}">${timeFormatted}</span>
            <span class="stops-remaining-text">${arr.remainingStations}번째 전</span>
          </div>

          <div class="meta-tags-group">
            <span class="meta-pill pill-${arr.congestion}">${arr.congestion}</span>
            ${arr.isLowFloor ? '<span class="meta-pill pill-lowfloor">저상</span>' : ''}
          </div>
        </div>

        <!-- TRACK STRIP -->
        <div class="route-track-strip">
          <div class="track-point track-start" title="${arr.previousStationName}"></div>
          <div class="track-bus-marker" title="실시간 위치">🚌</div>
          <div class="track-point track-end" title="${m.boardingStation.name}"></div>
        </div>

        <div class="card-footer-info">
          <span>다음 버스: 약 ${Math.round(arr.secondBusRemainingSeconds / 60)}분 후 (${arr.secondBusRemainingStations}번째 전)</span>
          <span style="font-weight: 700; color: #0F172A;">총 예상: ${m.totalEstimatedMinutes}분</span>
        </div>
      </div>
    `;
  }

  function createArrivalCardHtml(arr) {
    const isSoon = arr.remainingSeconds <= 35;
    const timeFormatted = formatSeconds(arr.remainingSeconds);
    const typeClass = getRouteTypeClass(arr.routeType);
    const isFav = state.favorites.some(f => f.targetId === arr.busNumber);

    return `
      <div class="bus-card">
        <div class="card-top-row">
          <div class="bus-badge-container">
            <span class="bus-number-chip ${typeClass}">${arr.busNumber}</span>
            <div class="bus-dir-info">
              <span class="bus-dir-text">${arr.direction || '순환 방면'}</span>
            </div>
          </div>
          <button class="btn-favorite-toggle ${isFav ? 'is-active' : ''}" data-bus="${arr.busNumber}" title="즐겨찾기">★</button>
        </div>

        <div class="arrival-row">
          <div class="time-and-stops">
            <span class="primary-remaining-time ${isSoon ? 'urgent' : ''}">${timeFormatted}</span>
            <span class="stops-remaining-text">${arr.remainingStations}번째 전</span>
          </div>

          <div class="meta-tags-group">
            <span class="meta-pill pill-${arr.congestion}">${arr.congestion}</span>
            ${arr.isLowFloor ? '<span class="meta-pill pill-lowfloor">저상</span>' : ''}
          </div>
        </div>

        <!-- TRACK STRIP -->
        <div class="route-track-strip">
          <div class="track-point track-start" title="${arr.previousStationName}"></div>
          <div class="track-bus-marker" title="실시간 위치">🚌</div>
          <div class="track-point track-end" title="${arr.stationName}"></div>
        </div>

        <div class="card-footer-info">
          <span>다음 버스: 약 ${Math.round(arr.secondBusRemainingSeconds / 60)}분 후 (${arr.secondBusRemainingStations}번째 전)</span>
          <span>${arr.previousStationName} 출발</span>
        </div>
      </div>
    `;
  }

  function bindCardEvents() {
    document.querySelectorAll('.btn-favorite-toggle').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const busNum = e.target.dataset.bus;
        const existing = state.favorites.find(f => f.targetId === busNum);

        if (existing) {
          await fetch(`/api/favorites/${existing.id}`, { method: 'DELETE' });
        } else {
          await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'BUS',
              targetId: busNum,
              name: `${busNum}번 버스`,
              memo: '즐겨찾기'
            })
          });
        }
        await fetchFavorites();
        await refreshAllData(false);
      });
    });
  }

  function renderFavoritesGrid() {
    el.favCountBadge.textContent = `총 ${state.favorites.length}개 등록됨`;

    if (state.favorites.length === 0) {
      el.favoritesGrid.innerHTML = `
        <div style="grid-column: 1 / -1; color: var(--text-hint); font-size: 12px; text-align: center; padding: 16px;">
          등록된 버스 또는 역이 없습니다.
        </div>
      `;
      return;
    }

    el.favoritesGrid.innerHTML = state.favorites.map(f => `
      <div class="fav-chip">
        <div class="fav-chip-info">
          <span style="font-size: 16px;">${f.type === 'BUS' ? '🚌' : '🚉'}</span>
          <div>
            <div class="fav-chip-title">${f.name}</div>
            <div class="fav-chip-desc">${f.memo || '자주 가는 곳'}</div>
          </div>
        </div>
        <button class="btn-chip-remove" data-id="${f.id}" title="삭제">&times;</button>
      </div>
    `).join('');

    el.favoritesGrid.querySelectorAll('.btn-chip-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        await fetch(`/api/favorites/${id}`, { method: 'DELETE' });
        await fetchFavorites();
        await refreshAllData(false);
      });
    });
  }

  function renderStationModalList(keyword) {
    const filtered = state.allStations.filter(s => {
      if (!keyword) return true;
      return s.name.toLowerCase().includes(keyword.trim().toLowerCase());
    });

    el.modalStationList.innerHTML = filtered.map(s => `
      <div class="station-option-item" data-id="${s.id}" data-name="${s.name}">
        <div>
          <div style="font-weight: 800; font-size: 14px; color: #0F172A;">${s.name}</div>
          <div style="font-size: 11px; color: var(--text-hint);">ARS ${s.arsId || '-'} · ${s.subwayLines.join(', ')}</div>
        </div>
        <button class="btn-primary-action" style="padding: 5px 12px; font-size: 12px;">선택</button>
      </div>
    `).join('');

    el.modalStationList.querySelectorAll('.station-option-item').forEach(item => {
      item.addEventListener('click', async () => {
        const stId = item.dataset.id;
        const stName = item.dataset.name;

        await fetch('/api/destination', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stationId: stId,
            memo: stName
          })
        });

        el.destModal.classList.remove('is-open');
        await fetchDestination();
        await refreshAllData();
      });
    });
  }

  function formatSeconds(secs) {
    if (secs <= 30) return '곧 도착';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}초`;
    return `${m}분 ${s < 10 ? '0' : ''}${s}초`;
  }

  function getRouteTypeClass(type) {
    if (!type) return 'chip-trunk';
    const t = typeof type === 'string' ? type.toUpperCase() : type;
    if (t === 'TRUNK') return 'chip-trunk';
    if (t === 'BRANCH') return 'chip-branch';
    if (t === 'RAPID') return 'chip-rapid';
    if (t === 'TOWN') return 'chip-town';
    return 'chip-trunk';
  }

  // GOOGLE MAPS STYLE CANVAS RENDERER & TIME-ON-ROUTE BADGES
  let mapZoomLevel = 1.0;
  let isTransitLayerActive = true;

  // Zoom control buttons
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnMapDefault = document.getElementById('btnMapDefault');
  const btnMapTransit = document.getElementById('btnMapTransit');

  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      mapZoomLevel = Math.min(1.5, mapZoomLevel + 0.15);
      drawMap();
    });
  }
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      mapZoomLevel = Math.max(0.8, mapZoomLevel - 0.15);
      drawMap();
    });
  }
  if (btnMapDefault && btnMapTransit) {
    btnMapDefault.addEventListener('click', () => {
      btnMapDefault.classList.add('active');
      btnMapTransit.classList.remove('active');
      isTransitLayerActive = false;
      drawMap();
    });
    btnMapTransit.addEventListener('click', () => {
      btnMapTransit.classList.add('active');
      btnMapDefault.classList.remove('active');
      isTransitLayerActive = true;
      drawMap();
    });
  }

  function drawMap() {
    if (!ctx) return;
    const w = el.canvas.width;
    const h = el.canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.save();

    // 1. Google Maps Base Background (Soft Map Gray)
    ctx.fillStyle = '#F1F3F4';
    ctx.fillRect(0, 0, w, h);

    // 2. Busan Coastline & Suyeong Bay / Gwangalli Sea (#C4E1F6)
    ctx.fillStyle = '#C4E1F6';
    ctx.beginPath();
    ctx.moveTo(w * 0.45, h);
    ctx.bezierCurveTo(w * 0.55, h * 0.75, w * 0.75, h * 0.65, w, h * 0.6);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Gwangalli Beach & Gwangan Bridge (Diamond Bridge Vector Line)
    ctx.strokeStyle = '#93C5FD';
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(w * 0.55, h * 0.78);
    ctx.quadraticCurveTo(w * 0.75, h * 0.72, w * 0.95, h * 0.62);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#60A5FA';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('광안대교 (Diamond Bridge)', w * 0.62, h * 0.70);
    ctx.fillText('수영만 / 광안리앞바다', w * 0.72, h * 0.85);

    // 3. Mt. Hwangnyeongsan Greenery Park Area (#CEEAD6)
    ctx.fillStyle = '#CEEAD6';
    ctx.beginPath();
    ctx.roundRect(w * 0.22, 15, w * 0.40, h * 0.28, 16);
    ctx.fill();

    ctx.fillStyle = '#166534';
    ctx.font = 'bold 9px -apple-system, sans-serif';
    ctx.fillText('황령산 유원지', w * 0.35, 35);

    // 4. City Blocks (#E8EAED)
    ctx.fillStyle = '#E8EAED';
    const blockRows = [
      { x: 30, y: 40, bw: 70, bh: 45 },
      { x: 35, y: 110, bw: 80, bh: 50 },
      { x: 340, y: 20, bw: 75, bh: 45 },
      { x: 420, y: 20, bw: 50, bh: 35 },
      { x: 30, y: 200, bw: 65, bh: 50 },
      { x: 100, y: 290, bw: 90, bh: 45 },
      { x: 210, y: 240, bw: 85, bh: 45 }
    ];
    blockRows.forEach(b => {
      ctx.beginPath();
      ctx.roundRect(b.x * (w / 480), b.y * (h / 380), b.bw * (w / 480), b.bh * (h / 380), 4);
      ctx.fill();
    });

    const sx = (w / 480) * mapZoomLevel;
    const sy = (h / 380) * mapZoomLevel;

    // 5. Grid Road Network (Google Maps White Roads with #DADCE0 Borders)
    // Suyeong-ro connection from Gwangan/Namcheon to KSU
    drawGoogleRoad(ctx, [{ x: 310, y: 60 }, { x: 250, y: 110 }, { x: 160, y: 195 }], 14, sx, sy);
    // Hwangnyeong-daero
    drawGoogleRoad(ctx, [{ x: 120, y: 130 }, { x: 340, y: 140 }], 10, sx, sy);
    // Jungang-daero in Seomyeon
    drawGoogleRoad(ctx, [{ x: 435, y: 20 }, { x: 435, y: 150 }], 14, sx, sy);

    // BUSAN ROUTE 24 CORRIDOR STATIONS (실제 정류소 좌표)
    const busan24Stations = [
      { name: '이기대입구', x: 45, y: 310, ars: '07-038' },
      { name: '부경대대연캠퍼스', x: 100, y: 255, ars: '07-045' },
      { name: '경성대·부경대역', x: 160, y: 195, isCurrent: true, ars: '07-062' },
      { name: '대연역', x: 225, y: 195, ars: '07-070' },
      { name: '못골역(남구청)', x: 280, y: 185, ars: '07-078' },
      { name: '지게골역', x: 325, y: 165, ars: '07-085' },
      { name: '문현교차로', x: 360, y: 140, ars: '07-092' },
      { name: '국제금융센터(BIFC)', x: 395, y: 105, ars: '05-015' },
      { name: '서면역(서면지하상가)', x: 435, y: 65, isDest: true, ars: '05-028' }
    ];

    // Main Avenue (Suyeong-ro ➔ Munhyeon ➔ Seomyeon)
    drawGoogleRoad(ctx, busan24Stations, 18, sx, sy);

    // Road Names (Google Maps Typography)
    ctx.fillStyle = '#70757A';
    ctx.font = '500 10px Roboto, sans-serif';
    ctx.fillText('수영로 (부산2호선 축)', 175 * sx, 215 * sy);
    ctx.fillText('중앙대로 (서면)', 375 * sx, 50 * sy);
    ctx.fillText('황령대로', 260 * sx, 135 * sy);

    // 6. [CORE FEATURE] Google Maps Blue Route Polyline for Busan Bus 24
    ctx.strokeStyle = '#1967D2';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    busan24Stations.forEach((st, idx) => {
      const cx = st.x * sx;
      const cy = st.y * sy;
      if (idx === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();

    // Vibrant Google Transit Blue
    ctx.strokeStyle = '#4285F4';
    ctx.lineWidth = 6;
    ctx.beginPath();
    busan24Stations.forEach((st, idx) => {
      const cx = st.x * sx;
      const cy = st.y * sy;
      if (idx === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();

    // Highlight Current Leg (경성대 ➔ 서면역): Vivid Pulsing Electric Blue
    ctx.strokeStyle = '#1A73E8';
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (let i = 2; i < busan24Stations.length; i++) {
      const cx = busan24Stations[i].x * sx;
      const cy = busan24Stations[i].y * sy;
      if (i === 2) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    // 7. [USER REQUEST] 파란색 선 상에 예상 소요 시간 배지 (Google Maps Time-on-Route Tag)
    // Leg 1: 경성대·부경대역 ➔ 서면역 (전체 목적지 구간 중앙)
    // 문현교차로(360, 140) 부근 좌표
    const leg1MidX = 330 * sx;
    const leg1MidY = 160 * sy;

    let leg1TimeText = '14분';
    if (state.cachedMatches && state.cachedMatches.length > 0) {
      const fastest = state.cachedMatches[0];
      leg1TimeText = `${fastest.travelMinutesToDestination}분`;
    }

    drawTimeOnRouteBadge(ctx, leg1MidX, leg1MidY, leg1TimeText, '5.2km · 원활', '#1A73E8', '#188038');

    // Leg 2: 경성대역 ➔ 대연역 구간 시간 배지
    const leg2MidX = ((busan24Stations[2].x + busan24Stations[3].x) / 2) * sx;
    const leg2MidY = ((busan24Stations[2].y + busan24Stations[3].y) / 2) * sy - 14;
    drawTimeOnRouteBadge(ctx, leg2MidX, leg2MidY, '3분', '1.1km', '#4285F4', '#5F6368');

    // 8. Station Markers (Google Maps Transit Pin Style)
    busan24Stations.forEach(st => {
      const cx = st.x * sx;
      const cy = st.y * sy;

      if (st.isCurrent) {
        // [CURRENT GPS PIN]: Google Blue Pulsing Beacon
        ctx.fillStyle = 'rgba(66, 133, 244, 0.25)';
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1A73E8';
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Pin Label
        drawMapLabel(ctx, st.name + ' (내 위치)', cx, cy - 14, '#1A73E8', true);

      } else if (st.isDest) {
        // [DESTINATION PIN]: Google Red Teardrop Marker
        drawGoogleRedPin(ctx, cx, cy);
        drawMapLabel(ctx, st.name + ' (목적지)', cx, cy - 24, '#D93025', true);

      } else {
        // Standard Google Transit Station Dot
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1A73E8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        drawMapLabel(ctx, st.name, cx + 9, cy + 3, '#3C4043', false);
      }
    });

    // 9. Live Busan 24 Buses Navigating on the Blue Route Line
    const t = (Date.now() / 1000) % 20;
    const bus1Prog = (t % 20) / 20;
    const bus2Prog = ((t + 10) % 20) / 20;

    drawGoogleLiveBus(ctx, busan24Stations, bus1Prog, '24', '#1A73E8', sx, sy);
    drawGoogleLiveBus(ctx, busan24Stations, bus2Prog, '24', '#188038', sx, sy);

    ctx.restore();
  }

  // Helper: Draw Google Maps Road Stroke
  function drawGoogleRoad(ctx, points, width, sx, sy) {
    if (points.length < 2) return;
    // Outer border
    ctx.strokeStyle = '#DADCE0';
    ctx.lineWidth = width + 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((p, i) => {
      const px = p.x * sx;
      const py = p.y * sy;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Inner White Road
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = width;
    ctx.beginPath();
    points.forEach((p, i) => {
      const px = p.x * sx;
      const py = p.y * sy;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

  // Helper: [CORE] 파란색 선 상에 시간 배지 (Google Navigation Time Callout Chip)
  function drawTimeOnRouteBadge(ctx, x, y, timeText, subText, accentColor, statusColor) {
    ctx.save();

    const pillWidth = 92;
    const pillHeight = 24;
    const bx = x - pillWidth / 2;
    const by = y - pillHeight / 2;

    // Drop Shadow
    ctx.shadowColor = 'rgba(60, 64, 67, 0.28)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    // White Pill Card
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(bx, by, pillWidth, pillHeight, 12);
    ctx.fill();

    // Border
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#DADCE0';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Mini Transit Clock Icon
    ctx.fillStyle = accentColor;
    ctx.font = '10px sans-serif';
    ctx.fillText('⏱️', bx + 6, by + 16);

    // Primary Time (e.g., "3분")
    ctx.fillStyle = '#202124';
    ctx.font = 'bold 11px -apple-system, Roboto, sans-serif';
    ctx.fillText(timeText, bx + 22, by + 16);

    // Sub Status Dot & Text (e.g. green dot + "0.8km")
    ctx.fillStyle = statusColor;
    ctx.font = '9px -apple-system, Roboto, sans-serif';
    const subX = bx + 22 + ctx.measureText(timeText).width + 5;
    ctx.fillText(subText, subX, by + 16);

    ctx.restore();
  }

  // Helper: Draw Google Red Destination Pin Marker
  function drawGoogleRedPin(ctx, x, y) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;

    // Pin Body
    ctx.fillStyle = '#EA4335';
    ctx.beginPath();
    ctx.arc(x, y - 10, 8, 0, Math.PI * 2);
    ctx.moveTo(x - 6, y - 8);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 6, y - 8);
    ctx.fill();

    // White Inner Center Dot
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, y - 10, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Helper: Google Map Station Label
  function drawMapLabel(ctx, text, x, y, color, isBold) {
    ctx.save();
    ctx.font = (isBold ? 'bold 11px' : '500 10px') + ' -apple-system, Roboto, sans-serif';

    // White outline for readability on map
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.strokeText(text, x, y);

    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // Helper: Live Bus Vehicle on Google Route Line
  function drawGoogleLiveBus(ctx, stations, progress, busNum, color, sx, sy) {
    const segCount = stations.length - 1;
    const segIndex = Math.min(Math.floor(progress * segCount), segCount - 1);
    const subProg = (progress * segCount) - segIndex;

    const p1 = stations[segIndex];
    const p2 = stations[segIndex + 1];

    const bx = (p1.x + (p2.x - p1.x) * subProg) * sx;
    const by = (p1.y + (p2.y - p1.y) * subProg) * sy;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    // Bus Pill
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(bx - 20, by - 11, 40, 22, 11);
    ctx.fill();

    // White Border
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bus Number Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🚌${busNum}`, bx, by);

    ctx.restore();
  }

});
