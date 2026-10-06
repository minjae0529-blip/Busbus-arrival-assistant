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
    mapContainer: document.getElementById('realLeafletMap'),
    transitBottomSheet: document.getElementById('transitBottomSheet'),
    sheetDragHandle: document.getElementById('sheetDragHandle'),
    btnToggleSheet: document.getElementById('btnToggleSheet'),
    miniSummaryText: document.getElementById('miniSummaryText'),
    btnShareAppointmentLink: document.getElementById('btnShareAppointmentLink'),
    btnCenterUserGps: document.getElementById('btnCenterUserGps'),
    appToast: document.getElementById('appToast')
  };

  // Bottom Sheet State ('collapsed' | 'half' | 'expanded')
  let currentSheetState = 'half';
  let toastTimer = null;

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
    checkUrlAppointmentParam();

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

    // Mobile Bottom Sheet Controls & Gestures
    setupBottomSheet();

    // Share Appointment Link
    setupShareLink();

    // Map Center GPS Floating Button
    setupMapControls();

    window.addEventListener('resize', () => {
      if (leafletMap) leafletMap.invalidateSize();
    });
  }

  // Toast Notification System
  function showToast(message, duration = 3000) {
    if (!el.appToast) return;
    el.appToast.innerHTML = `<span>⚡</span> <span>${message}</span>`;
    el.appToast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.appToast.classList.remove('show');
    }, duration);
  }

  // Bottom Sheet Controller
  function setBottomSheetState(newState) {
    if (!el.transitBottomSheet) return;
    el.transitBottomSheet.classList.remove('sheet-state-collapsed', 'sheet-state-half', 'sheet-state-expanded');
    el.transitBottomSheet.classList.add(`sheet-state-${newState}`);
    currentSheetState = newState;

    if (el.btnToggleSheet) {
      const icon = el.btnToggleSheet.querySelector('.toggle-icon');
      if (icon) {
        if (newState === 'expanded') {
          icon.textContent = '▼';
        } else if (newState === 'collapsed') {
          icon.textContent = '▲';
        } else {
          icon.textContent = '▲';
        }
      }
    }

    setTimeout(() => {
      if (leafletMap) leafletMap.invalidateSize();
    }, 320);
  }

  function cycleBottomSheetState() {
    if (currentSheetState === 'collapsed') {
      setBottomSheetState('half');
    } else if (currentSheetState === 'half') {
      setBottomSheetState('expanded');
    } else {
      setBottomSheetState('collapsed');
    }
  }

  function setupBottomSheet() {
    if (!el.transitBottomSheet) return;

    // Toggle button click
    if (el.btnToggleSheet) {
      el.btnToggleSheet.addEventListener('click', (e) => {
        e.stopPropagation();
        cycleBottomSheetState();
      });
    }

    // Drag handle area click (except toggle button)
    if (el.sheetDragHandle) {
      el.sheetDragHandle.addEventListener('click', (e) => {
        if (e.target.closest('#btnToggleSheet')) return;
        cycleBottomSheetState();
      });

      // Touch swipe gestures
      let touchStartY = 0;
      el.sheetDragHandle.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      el.sheetDragHandle.addEventListener('touchend', (e) => {
        const touchEndY = e.changedTouches[0].clientY;
        const diffY = touchEndY - touchStartY;
        // Swiped Up
        if (diffY < -35) {
          if (currentSheetState === 'collapsed') setBottomSheetState('half');
          else if (currentSheetState === 'half') setBottomSheetState('expanded');
        }
        // Swiped Down
        else if (diffY > 35) {
          if (currentSheetState === 'expanded') setBottomSheetState('half');
          else if (currentSheetState === 'half') setBottomSheetState('collapsed');
        }
      }, { passive: true });
    }
  }

  // Share Appointment Link
  function setupShareLink() {
    if (!el.btnShareAppointmentLink) return;
    el.btnShareAppointmentLink.addEventListener('click', async () => {
      const activeApp = state.activeAppointment || (state.appointments && state.appointments[0]);
      const meetId = activeApp ? activeApp.id : 'MEET-2490';
      const shareUrl = `${window.location.origin}${window.location.pathname}?meetId=${meetId}`;

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl);
        } else {
          const tempInput = document.createElement('input');
          tempInput.value = shareUrl;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand('copy');
          document.body.removeChild(tempInput);
        }
        showToast('약속 공유 링크가 복사되었습니다! 카카오톡이나 메시지로 친구에게 전달해보세요.');
      } catch (err) {
        showToast('공유 링크: ' + shareUrl);
      }
    });
  }

  // Floating Map Center GPS Button
  function setupMapControls() {
    if (el.btnCenterUserGps) {
      el.btnCenterUserGps.addEventListener('click', () => {
        if (leafletMap) {
          leafletMap.setView([state.currentLat, state.currentLng], 15, { animate: true });
          showToast('내 현재 위치로 지도 중심을 이동했습니다.');
        }
      });
    }
  }

  // Check URL Appointment Param
  function checkUrlAppointmentParam() {
    const params = new URLSearchParams(window.location.search);
    const meetId = params.get('meetId');
    if (meetId) {
      state.activeTab = 'appointments';
      el.tabs.forEach(t => {
        if (t.dataset.tab === 'appointments') t.classList.add('active');
        else t.classList.remove('active');
      });
      renderCurrentTab();
      setBottomSheetState('half');
      showToast(`공유받은 약속(${meetId}) 화면으로 자동 연결되었습니다.`);
    }
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
      if (el.miniSummaryText) {
        el.miniSummaryText.textContent = '목적지까지 직통 버스 없음';
      }
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

    if (el.miniSummaryText) {
      el.miniSummaryText.textContent = `${fastest.boardingStation.name} ➔ ${fastest.destinationStation.name} (${fastest.busNumber}번 약 ${fastest.totalEstimatedMinutes}분)`;
    }

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

  // ========================================================
  // REAL INTERACTIVE MAP ENGINE (LEAFLET + REAL STREET TILES)
  // ========================================================
  let leafletMap = null;
  let busPolyline = null;
  let stationMarkersGroup = null;
  let liveBusMarkersGroup = null;
  let userPinMarker = null;
  let friendPinMarker = null;

  // 부산 24번 버스 대연역 ~ 서면역 실제 도로 GPS 위경도 경로 (도로를 따라 정밀 매핑)
  const busan24RoadCoords = [
    [35.13550, 129.09200], // 대연역 (부산고려병원)
    [35.13570, 129.08800], // 수영로 도로 커브
    [35.13600, 129.08450], // 못골역 (남구청)
    [35.13660, 129.08000], // 대연고개
    [35.13720, 129.07600], // 지게골역
    [35.13810, 129.07100], // 문현로 축
    [35.13900, 129.06650], // 문현교차로 (문현역)
    [35.14350, 129.06550], // 금융거리 진입
    [35.14800, 129.06450], // 국제금융센터·부산은행역 (BIFC 63빌딩)
    [35.15200, 129.06200], // 범내골 교차로 방면
    [35.15500, 129.06050], // 중앙대로 진입
    [35.15780, 129.05920]  // 서면역 (서면지하상가)
  ];

  // 주요 정류소 정보 (실제 GPS)
  const realStations = [
    { id: 'ST-BS-DY', name: '대연역 (부산고려병원)', lat: 35.13550, lng: 129.09200, ars: '07-070', sub: '부산2호선' },
    { id: 'ST-BS-MG', name: '못골역 (남구청)', lat: 35.13600, lng: 129.08450, ars: '07-078', sub: '부산2호선' },
    { id: 'ST-BS-JG', name: '지게골역', lat: 35.13720, lng: 129.07600, ars: '07-085', sub: '부산2호선' },
    { id: 'ST-BS-MH', name: '문현교차로 (문현역)', lat: 35.13900, lng: 129.06650, ars: '07-092', sub: '부산2호선' },
    { id: 'ST-BS-BIFC', name: '국제금융센터·부산은행역', lat: 35.14800, lng: 129.06450, ars: '05-015', sub: 'BIFC 63빌딩' },
    { id: 'ST-BS-SMN', name: '서면역 (서면지하상가)', lat: 35.15780, lng: 129.05920, isDest: true, ars: '05-028', sub: '1·2호선 환승역' }
  ];

  // 지도 타일 레이어 객체
  let currentTileLayer = null;
  const tileLayers = {
    // 1. Google Maps 실제 일반 지도 (실제 도로, 건물, 골목, 랜드마크 고해상도 한글 표기)
    google: L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Maps'
    }),
    // 2. Google Maps 실제 위성 + 도로명 하이브리드 지도 (실제 건물 옥상, 항공뷰, 도로망)
    hybrid: L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Satellite'
    }),
    // 3. OpenStreetMap 상세 골목 지도 (세부 지번, 상가명, 횡단보도 정밀 표시)
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    })
  };

  function initRealLeafletMap() {
    if (!el.mapContainer || leafletMap) return;

    // 대연역과 서면역 사이 중앙에 카메라 포커스 (기본 줌 레벨 14.5로 도로/상가가 선명히 보이게 설정)
    leafletMap = L.map(el.mapContainer, {
      center: [35.1465, 129.0740],
      zoom: 14.5,
      zoomControl: false
    });
    L.control.zoom({ position: 'bottomright' }).addTo(leafletMap);

    // 기본 레이어: Google Maps 실제 도로/건물 지도 적용!
    currentTileLayer = tileLayers.google.addTo(leafletMap);

    stationMarkersGroup = L.layerGroup().addTo(leafletMap);
    liveBusMarkersGroup = L.layerGroup().addTo(leafletMap);

    // 실제 도로를 따라 달리는 파란색 노선선 (Google Transit Blue)
    busPolyline = L.polyline(busan24RoadCoords, {
      color: '#1A73E8',
      weight: 6,
      opacity: 0.85,
      smoothFactor: 1
    }).addTo(leafletMap);

    busPolyline.bindPopup('<b>🚌 부산 24번 버스 실제 도로 노선축</b><br>대연역 ➔ 못골역 ➔ 지게골역 ➔ 문현교차로 ➔ BIFC ➔ 서면역');

    // 지도 타일 전환 버튼 이벤트 바인딩
    setupTileSwitcherEvents();

    renderRealMapElements();
  }

  function setupTileSwitcherEvents() {
    const btnGoogle = document.getElementById('btnTileGoogle');
    const btnHybrid = document.getElementById('btnTileHybrid');
    const btnOsm = document.getElementById('btnTileOsm');

    function setActiveBtn(activeBtn) {
      [btnGoogle, btnHybrid, btnOsm].forEach(btn => {
        if (!btn) return;
        if (btn === activeBtn) {
          btn.style.background = '#2563EB';
          btn.style.color = '#FFFFFF';
          btn.style.borderColor = '#2563EB';
        } else {
          btn.style.background = '#FFFFFF';
          btn.style.color = '#334155';
          btn.style.borderColor = '#CBD5E1';
        }
      });
    }

    if (btnGoogle) {
      btnGoogle.addEventListener('click', () => {
        if (currentTileLayer) leafletMap.removeLayer(currentTileLayer);
        currentTileLayer = tileLayers.google.addTo(leafletMap);
        setActiveBtn(btnGoogle);
      });
    }
    if (btnHybrid) {
      btnHybrid.addEventListener('click', () => {
        if (currentTileLayer) leafletMap.removeLayer(currentTileLayer);
        currentTileLayer = tileLayers.hybrid.addTo(leafletMap);
        setActiveBtn(btnHybrid);
      });
    }
    if (btnOsm) {
      btnOsm.addEventListener('click', () => {
        if (currentTileLayer) leafletMap.removeLayer(currentTileLayer);
        currentTileLayer = tileLayers.osm.addTo(leafletMap);
        setActiveBtn(btnOsm);
      });
    }
  }

  function drawMap() {
    if (!leafletMap) {
      initRealLeafletMap();
    } else {
      renderRealMapElements();
    }
  }

  function renderRealMapElements() {
    if (!leafletMap || !stationMarkersGroup || !liveBusMarkersGroup) return;

    stationMarkersGroup.clearLayers();
    liveBusMarkersGroup.clearLayers();

    // 1. 실제 정류소 핀 렌더링
    realStations.forEach(st => {
      const isCur = (state.currentStation && state.currentStation.station && state.currentStation.station.id === st.id) || (st.id === 'ST-BS-DY' && !state.currentStation);
      
      let iconHtml = '';
      if (isCur) {
        iconHtml = `<div class="leaflet-current-pin" title="${st.name}"></div>`;
      } else if (st.isDest) {
        iconHtml = `<div class="leaflet-dest-pin" title="${st.name}"></div>`;
      } else {
        iconHtml = `<div class="leaflet-station-pin" title="${st.name}"></div>`;
      }

      const customIcon = L.divIcon({
        className: 'custom-station-wrapper',
        html: iconHtml,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      const marker = L.marker([st.lat, st.lng], { icon: customIcon }).addTo(stationMarkersGroup);
      
      // 정류소 이름을 지도 위에 항상 표시 (클릭하지 않아도 이름 확인 가능)
      marker.bindTooltip(`<b>${st.name.split(' ')[0]}</b>`, {
        permanent: true,
        direction: 'bottom',
        offset: [0, 8],
        className: 'station-tooltip'
      });

      marker.bindPopup(`
        <div style="font-family:-apple-system, sans-serif; font-size:12px; min-width:140px;">
          <strong style="font-size:14px; color:#1E293B;">🚏 ${st.name}</strong><br>
          <span style="color:#64748B;">ARS ${st.ars} · ${st.sub}</span><br>
          <span style="display:inline-block; margin-top:4px; padding:2px 6px; background:#EFF6FF; color:#2563EB; font-weight:700; border-radius:4px;">
            ${isCur ? '📍 현재 내 위치' : (st.isDest ? '🚩 약속 목적지' : '정차 정류소')}
          </span>
        </div>
      `);
    });

    // 2. [실시간 약속] 친구 실시간 GPS 핀 (실제 문현~지게골 사이 도로 좌표)
    if (state.activeAppointment && state.activeAppointment.friendName) {
      const friendLat = 35.1415;
      const friendLng = 129.0660;
      const friendIcon = L.divIcon({
        className: 'friend-pin-wrapper',
        html: `<div class="leaflet-friend-pin"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      const friendMarker = L.marker([friendLat, friendLng], { icon: friendIcon }).addTo(stationMarkersGroup);
      friendMarker.bindPopup(`
        <div style="font-size:12px;">
          <strong style="color:#EA580C; font-size:13px;">🤝 ${state.activeAppointment.friendName}</strong><br>
          <span>실시간 이동 중 (서면 도착 8분 전)</span>
        </div>
      `).openPopup();
    }

    // 3. 실제 도착 시간과 연동되어 도로 위를 달리는 24번 버스 마커
    let bus1Sec = 180;
    if (state.cachedMatches && state.cachedMatches.length > 0 && state.cachedMatches[0].arrivalInfo) {
      bus1Sec = state.cachedMatches[0].arrivalInfo.remainingSeconds;
    }

    // 도로 좌표 배열에서 보간 위치 계산
    const busCoord = interpolateRoadPosition(busan24RoadCoords, bus1Sec);
    const busIcon = L.divIcon({
      className: 'bus-icon-wrapper',
      html: `<div class="leaflet-bus-icon">🚌 24번 (${Math.max(1, Math.round(bus1Sec / 60))}분 전)</div>`,
      iconSize: [100, 24],
      iconAnchor: [50, 12]
    });

    const liveBusMarker = L.marker(busCoord, { icon: busIcon }).addTo(liveBusMarkersGroup);
    liveBusMarker.bindPopup(`<b>🚌 부산 24번 버스</b><br>서면 방면 운행 중<br>도착 예정: 약 ${Math.max(1, Math.round(bus1Sec / 60))}분 후`);
  }

  // 실제 도로 좌표 리스트 위에서 남은 시간에 따라 부드럽게 위치 보간하는 함수
  function interpolateRoadPosition(coords, remainingSeconds) {
    if (!coords || coords.length === 0) return [35.13550, 129.09200];
    // 시간이 적을수록 목적지(배열 끝)에 가까워짐
    const totalPoints = coords.length - 1;
    // 0초면 서면역(끝), 600초(10분)면 대연역(시작)
    const factor = Math.max(0, Math.min(1, 1 - (remainingSeconds / 600.0)));
    const targetIndex = factor * totalPoints;
    const idx = Math.min(Math.floor(targetIndex), totalPoints - 1);
    const subProg = targetIndex - idx;

    const p1 = coords[idx];
    const p2 = coords[idx + 1];

    const lat = p1[0] + (p2[0] - p1[0]) * subProg;
    const lng = p1[1] + (p2[1] - p1[1]) * subProg;
    return [lat, lng];
  }

});

