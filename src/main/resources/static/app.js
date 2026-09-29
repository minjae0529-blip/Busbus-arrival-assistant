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
    appointments: [],
    activeAppointment: null,
    recommendations: [],
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
    await fetchAppointments();
    await fetchRecommendations();
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
      await fetchAppointments();
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

  async function fetchAppointments() {
    try {
      const res = await fetch('/api/appointments');
      state.appointments = await res.json();
      if (state.appointments && state.appointments.length > 0) {
        state.activeAppointment = state.appointments[0];
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchRecommendations() {
    try {
      const destId = (state.destination && state.destination.stationId) ? state.destination.stationId : 'ST-BS-SMN';
      const res = await fetch(`/api/recommendations?destinationId=${destId}&earlyMinutes=20`);
      state.recommendations = await res.json();
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
    } else if (state.activeTab === 'appointments') {
      renderAppointmentsTab();
    } else if (state.activeTab === 'recommendations') {
      renderRecommendationsTab();
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

  function renderAppointmentsTab() {
    el.fastestCard.style.display = 'none';
    const app = state.activeAppointment;

    if (!app) {
      el.busListContainer.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">🤝</span>
          진행 중인 실시간 약속이 없습니다.<br>
          <button class="btn-pill" id="btnCreateSampleMeetup" style="margin:12px auto; display:block;">
            + 서면 약속 생성하기
          </button>
        </div>
      `;
      const btn = document.getElementById('btnCreateSampleMeetup');
      if (btn) {
        btn.addEventListener('click', async () => {
          await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: '서면 카페 & 점심 약속',
              destinationId: 'ST-BS-SMN',
              destinationName: '서면역',
              inMinutes: 25,
              creatorName: '민재(나)'
            })
          });
          await fetchAppointments();
          renderAppointmentsTab();
          drawMap();
        });
      }
      return;
    }

    el.busListContainer.innerHTML = `
      <div class="appointment-card">
        <div class="appointment-header">
          <div class="appointment-title">
            <span>🤝</span> ${app.title}
          </div>
          <span class="appointment-badge">실시간 위치 공유 중</span>
        </div>

        <div style="font-size:13px; color:var(--text-muted); margin-bottom:8px;">
          📍 <strong>약속 장소:</strong> ${app.destinationName} &nbsp;|&nbsp; ⏱️ <strong>약속 시간:</strong> 25분 뒤 (12:30)
        </div>

        <div class="appointment-members">
          <div class="member-col">
            <div class="member-avatar avatar-me">나</div>
            <div>
              <div class="member-info-name">${app.creatorName}</div>
              <div class="member-info-status">📍 대연역 (24번 탑승 준비)</div>
            </div>
          </div>
          <div class="member-col">
            <div class="member-avatar avatar-friend">친</div>
            <div>
              <div class="member-info-name">${app.friendName || '친구 대기 중'}</div>
              <div class="member-info-status">📍 지게골역 부근 (도착 8분 전)</div>
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
          <span style="font-size:12px; color:#2563EB; font-weight:700;">
            ⚡ 약속 시간 동안에만 서로의 GPS가 지도에 실시간 표시됩니다.
          </span>
          <button class="btn-pill" id="btnSimulateFriendMove" style="font-size:11px;">
            친구 위치 갱신
          </button>
        </div>
      </div>

      <div class="station-overview-card" style="margin-top:12px; border-left:4px solid #2563EB;">
        <div style="font-size:14px; font-weight:800; color:var(--text-title); margin-bottom:4px;">
          💡 실시간 도착 예측 & 일정 피드백
        </div>
        <div style="font-size:13px; color:var(--text-body);">
          내가 탈 24번 버스는 <strong>약 14분 후</strong> 서면역 도착 예정입니다.<br>
          약속 시간보다 <strong>약 11분 일찍</strong> 도착하므로, 상단 [✨ 조기 도착 추천] 탭에서 대기할 장소를 확인해보세요!
        </div>
      </div>
    `;

    const btnMove = document.getElementById('btnSimulateFriendMove');
    if (btnMove) {
      btnMove.addEventListener('click', () => {
        alert('친구 [지민]님의 실시간 위치가 갱신되어 노선도에 반영되었습니다!');
        drawMap();
      });
    }
  }

  function renderRecommendationsTab() {
    el.fastestCard.style.display = 'none';
    const list = state.recommendations || [];

    if (list.length === 0) {
      el.busListContainer.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">✨</span>
          추천 장소를 불러오는 중입니다...
        </div>
      `;
      return;
    }

    el.busListContainer.innerHTML = `
      <div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:12px; padding:12px 16px; margin-bottom:14px;">
        <div style="font-weight:800; font-size:14px; color:#1E40AF; margin-bottom:4px;">
          ✨ 서면역 약속시간보다 11분 일찍 도착 예정!
        </div>
        <div style="font-size:12px; color:#1E3A8A;">
          네이버 플레이스 및 구글 지도 실시간 검색 랭킹 상위 장소들입니다. 친구가 오기 전까지 편안하게 둘러보세요.
        </div>
      </div>
    ` + list.map((item, idx) => `
      <div class="place-card">
        <div class="place-head">
          <div class="place-name">${idx + 1}. ${item.name}</div>
          <span class="place-rank-badge">🔥 ${item.badge}</span>
        </div>
        <div class="place-desc">${item.description}</div>
        <div class="place-meta-row">
          <span class="place-walk-time">🚶 ${item.walkMinutes}</span>
          <span class="place-rating">⭐ ${item.googleRating} (${item.reviewCount}건)</span>
          <span style="color:#64748B;">⏱️ ${item.suitableStay}</span>
        </div>
      </div>
    `).join('');
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

    // 2. 부산 해안선 및 수영만 바다
    ctx.fillStyle = '#C4E1F6';
    ctx.beginPath();
    ctx.moveTo(w * 0.55, h);
    ctx.bezierCurveTo(w * 0.65, h * 0.80, w * 0.80, h * 0.72, w, h * 0.65);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // 광안대교 점선
    ctx.strokeStyle = '#93C5FD';
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(w * 0.60, h * 0.85);
    ctx.quadraticCurveTo(w * 0.78, h * 0.78, w * 0.95, h * 0.70);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#60A5FA';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('광안대교', w * 0.72, h * 0.76);
    ctx.fillText('수영만', w * 0.80, h * 0.90);

    // 3. 황령산 녹지 공원 영역
    ctx.fillStyle = '#CEEAD6';
    ctx.beginPath();
    ctx.roundRect(w * 0.22, 15, w * 0.40, h * 0.28, 16);
    ctx.fill();

    ctx.fillStyle = '#166534';
    ctx.font = 'bold 9px -apple-system, sans-serif';
    ctx.fillText('황령산 유원지', w * 0.35, 35);

    // 4. 도시 블록
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

    // 5. 도로망 (구글 지도 스타일 흰색 도로 + 회색 테두리)
    drawGoogleRoad(ctx, [{ x: 60, y: 260 }, { x: 120, y: 220 }, { x: 160, y: 195 }], 14, sx, sy);
    drawGoogleRoad(ctx, [{ x: 80, y: 130 }, { x: 340, y: 140 }], 10, sx, sy);
    drawGoogleRoad(ctx, [{ x: 435, y: 20 }, { x: 435, y: 150 }], 14, sx, sy);

    // 부산 24번 노선 정류장 (대연역 ~ 서면역 구간)
    const busan24Stations = [
      { id: 'ST-BS-DY', name: '대연역', x: 60, y: 280, ars: '07-070' },
      { id: 'ST-BS-MG', name: '못골역(남구청)', x: 140, y: 250, ars: '07-078' },
      { id: 'ST-BS-JG', name: '지게골역', x: 220, y: 215, ars: '07-085' },
      { id: 'ST-BS-MH', name: '문현교차로', x: 300, y: 170, ars: '07-092' },
      { id: 'ST-BS-BIFC', name: '국제금융센터(BIFC)', x: 370, y: 120, ars: '05-015' },
      { id: 'ST-BS-SMN', name: '서면역', x: 435, y: 60, isDest: true, ars: '05-028' }
    ];

    // 현재 사용자의 GPS 및 가장 가까운 역에 따라 isCurrent 동적 지정
    const curStId = (state.currentStation && state.currentStation.station) ? state.currentStation.station.id : 'ST-BS-DY';
    let hasCur = false;
    busan24Stations.forEach(st => {
      st.isCurrent = (st.id === curStId);
      if (st.isCurrent) hasCur = true;
    });
    if (!hasCur) busan24Stations[0].isCurrent = true; // 기본값 대연역

    // 주요 도로 (수영로 → 문현 → 서면)
    drawGoogleRoad(ctx, busan24Stations, 18, sx, sy);

    // 도로명 표시
    ctx.fillStyle = '#70757A';
    ctx.font = '500 10px Roboto, sans-serif';
    ctx.fillText('수영로 (부산2호선 축)', 120 * sx, 270 * sy);
    ctx.fillText('중앙대로 (서면)', 375 * sx, 50 * sy);
    ctx.fillText('황령대로', 200 * sx, 135 * sy);

    // 6. 구글 지도 스타일 블루 노선 폴리라인 (24번 버스)
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

    // 선명한 구글 교통 블루
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

    // 7. 파란색 선 상에 실시간 소요 시간 배지
    const leg1MidX = 280 * sx;
    const leg1MidY = 180 * sy;
    let leg1TimeText = '14분';
    if (state.cachedMatches && state.cachedMatches.length > 0) {
      const fastest = state.cachedMatches[0];
      leg1TimeText = `${fastest.travelMinutesToDestination}분`;
    }
    drawTimeOnRouteBadge(ctx, leg1MidX, leg1MidY, leg1TimeText, '5.2km · 원활', '#1A73E8', '#188038');

    // 8. 정류장 마커 (구글 지도 교통 핀 스타일)
    busan24Stations.forEach(st => {
      const cx = st.x * sx;
      const cy = st.y * sy;

      if (st.isCurrent) {
        // [내 GPS 실시간 위치]: 블루 펄스 비콘
        ctx.fillStyle = 'rgba(37, 99, 235, 0.22)';
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2563EB';
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        drawMapLabel(ctx, st.name + ' (내 GPS 위치)', cx, cy - 14, '#2563EB', true);

      } else if (st.isDest) {
        // [목적지]: 레드 핀
        drawGoogleRedPin(ctx, cx, cy);
        drawMapLabel(ctx, st.name + ' (목적지)', cx, cy - 24, '#DC2626', true);

      } else {
        // 일반 정류소
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 2;
        ctx.stroke();

        drawMapLabel(ctx, st.name, cx + 9, cy + 3, '#334155', false);
      }
    });

    // 9. [실시간 약속] 친구 실시간 위치 표시 (친구가 약속에 참여중인 경우)
    if (state.activeAppointment && state.activeAppointment.friendName) {
      // 친구 위치를 노선상 지게골역~문현교차로 사이로 현실적 매핑
      const fx = 250 * sx;
      const fy = 195 * sy;

      ctx.fillStyle = 'rgba(234, 88, 12, 0.25)';
      ctx.beginPath();
      ctx.arc(fx, fy, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#EA580C';
      ctx.beginPath();
      ctx.arc(fx, fy, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      drawMapLabel(ctx, `🤝 ${state.activeAppointment.friendName} (이동 중 · 8분 남음)`, fx, fy - 14, '#EA580C', true);
    }

    // 10. [현실적인 버스 주행 물리] 실제 도착 잔여 시간 연동 위치 계산
    // 24번 버스 실제 남은 시간(초)에 따라 정류장 사이에서 정확한 물리 보간
    let bus1Sec = 180; // 기본 3분 전
    let bus2Sec = 480; // 기본 8분 전
    if (state.cachedMatches && state.cachedMatches.length > 0) {
      const match = state.cachedMatches[0];
      if (match.arrivalInfo) {
        bus1Sec = match.arrivalInfo.remainingSeconds;
      }
    }

    // 현실적 주행: 60초당 약 0.15 구간 진행
    const curIdx = busan24Stations.findIndex(st => st.isCurrent);
    const targetIdx = curIdx >= 0 ? curIdx : 0;

    // 버스 1: 내 정류장으로 다가오는 24번 버스
    const bus1Prog = Math.max(0, targetIdx - (bus1Sec / 120.0));
    const bus2Prog = Math.max(0, targetIdx - (bus2Sec / 120.0));

    drawGoogleLiveBusByProgress(ctx, busan24Stations, bus1Prog, '24', '#2563EB', sx, sy);
    drawGoogleLiveBusByProgress(ctx, busan24Stations, bus2Prog, '24', '#10B981', sx, sy);

    ctx.restore();
  }

  // Helper: 현실적 구간별 좌표 보간 버스 그리기
  function drawGoogleLiveBusByProgress(ctx, stations, rawProg, busNum, color, sx, sy) {
    const totalSegs = stations.length - 1;
    const clampedProg = Math.max(0, Math.min(totalSegs, rawProg));
    const segIdx = Math.min(Math.floor(clampedProg), totalSegs - 1);
    const subProg = clampedProg - segIdx;

    const p1 = stations[segIdx];
    const p2 = stations[segIdx + 1];

    const bx = (p1.x + (p2.x - p1.x) * subProg) * sx;
    const by = (p1.y + (p2.y - p1.y) * subProg) * sy;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    // 버스 알약 카드
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(bx - 22, by - 11, 44, 22, 11);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🚌${busNum}`, bx, by);
    ctx.restore();
  }

  // 헬퍼: 구글 지도 스타일 도로 그리기
  function drawGoogleRoad(ctx, points, width, sx, sy) {
    if (points.length < 2) return;
    // 외곽 테두리
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

    // 내부 흰색 도로
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

  // 헬퍼: 파란색 선 상 시간 배지 (구글 내비게이션 스타일)
  function drawTimeOnRouteBadge(ctx, x, y, timeText, subText, accentColor, statusColor) {
    ctx.save();

    const pillWidth = 92;
    const pillHeight = 24;
    const bx = x - pillWidth / 2;
    const by = y - pillHeight / 2;

    // 그림자
    ctx.shadowColor = 'rgba(60, 64, 67, 0.28)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    // 흰색 알약 카드
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(bx, by, pillWidth, pillHeight, 12);
    ctx.fill();

    // 테두리
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#DADCE0';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 시계 아이콘
    ctx.fillStyle = accentColor;
    ctx.font = '10px sans-serif';
    ctx.fillText('⏱️', bx + 6, by + 16);

    // 소요 시간
    ctx.fillStyle = '#202124';
    ctx.font = 'bold 11px -apple-system, Roboto, sans-serif';
    ctx.fillText(timeText, bx + 22, by + 16);

    // 거리 및 상태 표시
    ctx.fillStyle = statusColor;
    ctx.font = '9px -apple-system, Roboto, sans-serif';
    const subX = bx + 22 + ctx.measureText(timeText).width + 5;
    ctx.fillText(subText, subX, by + 16);

    ctx.restore();
  }

  // 헬퍼: 구글 빨간 목적지 핀 마커
  function drawGoogleRedPin(ctx, x, y) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;

    // 핀 본체
    ctx.fillStyle = '#EA4335';
    ctx.beginPath();
    ctx.arc(x, y - 10, 8, 0, Math.PI * 2);
    ctx.moveTo(x - 6, y - 8);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 6, y - 8);
    ctx.fill();

    // 내부 흰 점
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, y - 10, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 헬퍼: 지도 정류장 라벨
  function drawMapLabel(ctx, text, x, y, color, isBold) {
    ctx.save();
    ctx.font = (isBold ? 'bold 11px' : '500 10px') + ' -apple-system, Roboto, sans-serif';

    // 가독성을 위한 흰 외곽선
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.strokeText(text, x, y);

    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // 헬퍼: 실시간 버스 차량 노선 이동
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

    // 버스 알약 모양
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(bx - 20, by - 11, 40, 22, 11);
    ctx.fill();

    // 흰 테두리
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 버스 번호 텍스트
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🚌${busNum}`, bx, by);

    ctx.restore();
  }

});
