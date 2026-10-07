// SMART TRANSIT BUS & SUBWAY ASSISTANT CLIENT APPLICATION (v2.5)
document.addEventListener('DOMContentLoaded', () => {

  // Global App State
  const state = {
    currentLat: 35.13545, // 대연역 (수영로)
    currentLng: 129.09210,
    currentStation: null,
    destination: null,
    activeTab: 'destination', // 'destination' | 'all-arrivals' | 'appointments' | 'recommendations' | 'favorites'
    transitMode: 'BUS', // 'BUS' | 'SUBWAY'
    showIntermediateStops: false, // 사용자가 노선을 누를 때만 경유 정류소 표시!
    selectedPlaceForNav: null, // 도보 길안내 선택된 장소
    selectedPlaceFilter: 'ALL', // 'ALL' | 'FRIEND' | 'SOLO' | 'PLAY' | 'CAFE' | 'FOOD'
    allStations: [],
    favorites: [],
    cachedArrivals: [],
    cachedMatches: [],
    appointments: [],
    activeAppointment: null,
    recommendations: [],
    timerInterval: null,
    selectedDelayMinutes: 10,
    selectedDelayReason: '버스를 눈앞에서 놓쳐서 다음 버스 탑승 중이에요!'
  };

  // DOM Elements
  const el = {
    // Menu Drawer
    btnOpenMenuDrawer: document.getElementById('btnOpenMenuDrawer'),
    btnCloseMenuDrawer: document.getElementById('btnCloseMenuDrawer'),
    menuDrawer: document.getElementById('menuDrawer'),
    menuBackdrop: document.getElementById('menuBackdrop'),
    drawerNavItems: document.querySelectorAll('.drawer-nav-item'),
    presetChips: document.querySelectorAll('.btn-preset-chip'),

    // Top Header
    gpsStatusText: document.getElementById('gpsStatusText'),
    btnRefreshGps: document.getElementById('btnRefreshGps'),
    btnCenterUserGps: document.getElementById('btnCenterUserGps'),

    // T-Map Navigation
    inputNavOrigin: document.getElementById('inputNavOrigin'),
    inputNavDest: document.getElementById('inputNavDest'),
    btnSwapNavPoints: document.getElementById('btnSwapNavPoints'),
    btnSelectBusMode: document.getElementById('btnSelectBusMode'),
    btnSelectSubwayMode: document.getElementById('btnSelectSubwayMode'),
    busStopsToggleText: document.getElementById('busStopsToggleText'),
    subwayStopsToggleText: document.getElementById('subwayStopsToggleText'),
    btnToggleStopsPin: document.getElementById('btnToggleStopsPin'),
    stopsVisibilityNotice: document.getElementById('stopsVisibilityNotice'),

    // Delay Alert & Modal
    delayAlertBanner: document.getElementById('delayAlertBanner'),
    delayAlertTitle: document.getElementById('delayAlertTitle'),
    delayAlertDesc: document.getElementById('delayAlertDesc'),
    delayModal: document.getElementById('delayModal'),
    btnCloseDelayModal: document.getElementById('btnCloseDelayModal'),
    btnCancelDelay: document.getElementById('btnCancelDelay'),
    btnSubmitDelay: document.getElementById('btnSubmitDelay'),
    delayMinutesGroup: document.getElementById('delayMinutesGroup'),
    delayReasonChips: document.getElementById('delayReasonChips'),
    inputCustomDelayReason: document.getElementById('inputCustomDelayReason'),

    // Destination Modal
    destModal: document.getElementById('destModal'),
    btnCloseDestModal: document.getElementById('btnCloseDestModal'),
    modalStationList: document.getElementById('modalStationList'),
    inputSearchStation: document.getElementById('inputSearchStation'),

    // Place Navigation Banner
    placeNavigationBanner: document.getElementById('placeNavigationBanner'),
    placeNavTitle: document.getElementById('placeNavTitle'),
    placeNavDistance: document.getElementById('placeNavDistance'),
    placeNavWalkTime: document.getElementById('placeNavWalkTime'),
    placeNavAddress: document.getElementById('placeNavAddress'),
    btnOpenNaverMap: document.getElementById('btnOpenNaverMap'),
    btnOpenKakaoMap: document.getElementById('btnOpenKakaoMap'),
    btnClosePlaceNav: document.getElementById('btnClosePlaceNav'),

    // Tabs & Cards
    tabs: document.querySelectorAll('.tab-btn'),
    fastestCard: document.getElementById('fastestCard'),
    fastestBusTitle: document.getElementById('fastestBusTitle'),
    fastestBusDesc: document.getElementById('fastestBusDesc'),
    busListContainer: document.getElementById('busListContainer'),
    favoritesBoxCard: document.getElementById('favoritesBoxCard'),
    inputFavBusNumber: document.getElementById('inputFavBusNumber'),
    inputFavMemo: document.getElementById('inputFavMemo'),
    btnAddFavorite: document.getElementById('btnAddFavorite'),
    favoritesGrid: document.getElementById('favoritesGrid'),
    favCountBadge: document.getElementById('favCountBadge'),

    // Bottom Sheet & Clock
    liveClock: document.getElementById('liveClock'),
    mapContainer: document.getElementById('realLeafletMap'),
    transitBottomSheet: document.getElementById('transitBottomSheet'),
    sheetDragHandle: document.getElementById('sheetDragHandle'),
    btnToggleSheet: document.getElementById('btnToggleSheet'),
    miniModeBadge: document.getElementById('miniModeBadge'),
    miniSummaryText: document.getElementById('miniSummaryText'),
    appToast: document.getElementById('appToast')
  };

  let currentSheetState = 'half';
  let toastTimer = null;

  // Initialize App
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

    // 1-second countdown and UI loop
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      decrementCountdownTimes();
      updateClock();
      renderCurrentTab();
      drawMap();
    }, 1000);

    // 4-second backend sync
    setInterval(async () => {
      await fetchAppointments();
      await refreshAllData(false);
    }, 4000);
  }

  function setupEventListeners() {
    // 1. Menu Drawer Open/Close
    if (el.btnOpenMenuDrawer) {
      el.btnOpenMenuDrawer.addEventListener('click', openMenuDrawer);
    }
    if (el.btnCloseMenuDrawer) {
      el.btnCloseMenuDrawer.addEventListener('click', closeMenuDrawer);
    }
    if (el.menuBackdrop) {
      el.menuBackdrop.addEventListener('click', closeMenuDrawer);
    }

    // Drawer Nav Items
    if (el.drawerNavItems) {
      el.drawerNavItems.forEach(item => {
        item.addEventListener('click', () => {
          const action = item.dataset.action;
          handleMenuAction(action);
          closeMenuDrawer();
        });
      });
    }

    // Drawer Presets
    if (el.presetChips) {
      el.presetChips.forEach(chip => {
        chip.addEventListener('click', () => {
          el.presetChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          const [lat, lng] = chip.dataset.coords.split(',').map(Number);
          state.currentLat = lat;
          state.currentLng = lng;
          el.gpsStatusText.textContent = `${chip.textContent} (시뮬레이션)`;
          closeMenuDrawer();
          refreshAllData();
          if (leafletMap) leafletMap.setView([lat, lng], 15);
          showToast(`위치가 [${chip.textContent}]으로 설정되었습니다.`);
        });
      });
    }

    // 2. Navigation Modes (Bus vs Subway)
    if (el.btnSelectBusMode) {
      el.btnSelectBusMode.addEventListener('click', () => {
        if (state.transitMode === 'BUS') {
          state.showIntermediateStops = !state.showIntermediateStops;
        } else {
          state.transitMode = 'BUS';
          state.showIntermediateStops = true;
        }
        updateStopsVisibilityUI();
        setTransitMode('BUS');
      });
    }

    if (el.btnSelectSubwayMode) {
      el.btnSelectSubwayMode.addEventListener('click', () => {
        if (state.transitMode === 'SUBWAY') {
          state.showIntermediateStops = !state.showIntermediateStops;
        } else {
          state.transitMode = 'SUBWAY';
          state.showIntermediateStops = true;
        }
        updateStopsVisibilityUI();
        setTransitMode('SUBWAY');
      });
    }

    // 정류소 핀 보기 토글 버튼
    if (el.btnToggleStopsPin) {
      el.btnToggleStopsPin.addEventListener('click', () => {
        state.showIntermediateStops = !state.showIntermediateStops;
        updateStopsVisibilityUI();
        drawMap();
      });
    }

    // Origin ⇄ Destination Swap
    if (el.btnSwapNavPoints) {
      el.btnSwapNavPoints.addEventListener('click', () => {
        const temp = el.inputNavOrigin.value;
        el.inputNavOrigin.value = el.inputNavDest.value;
        el.inputNavDest.value = temp;
        showToast('출발지와 도착지가 맞바뀌었습니다.');
      });
    }

    // 3. Top Header GPS Buttons
    if (el.btnRefreshGps) el.btnRefreshGps.addEventListener('click', requestDeviceGps);
    if (el.btnCenterUserGps) {
      el.btnCenterUserGps.addEventListener('click', () => {
        if (leafletMap) {
          leafletMap.setView([state.currentLat, state.currentLng], 16);
          showToast('내 위치로 지도를 이동했습니다.');
        }
      });
    }

    // 4. Place Navigation Banner Close
    if (el.btnClosePlaceNav) {
      el.btnClosePlaceNav.addEventListener('click', () => {
        state.selectedPlaceForNav = null;
        if (el.placeNavigationBanner) el.placeNavigationBanner.style.display = 'none';
        drawMap();
        showToast('길안내 표기가 해제되었습니다.');
      });
    }

    // 5. Tabs
    el.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        el.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeTab = tab.dataset.tab;
        renderCurrentTab();
      });
    });

    // 6. Delay Modal
    if (el.btnCloseDelayModal) el.btnCloseDelayModal.addEventListener('click', closeDelayModal);
    if (el.btnCancelDelay) el.btnCancelDelay.addEventListener('click', closeDelayModal);
    if (el.delayModal) {
      el.delayModal.addEventListener('click', (e) => {
        if (e.target === el.delayModal) closeDelayModal();
      });
    }

    if (el.delayMinutesGroup) {
      const minChips = el.delayMinutesGroup.querySelectorAll('.chip-time');
      minChips.forEach(chip => {
        chip.addEventListener('click', () => {
          minChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          state.selectedDelayMinutes = parseInt(chip.dataset.mins, 10);
        });
      });
    }

    if (el.delayReasonChips) {
      const reasonChips = el.delayReasonChips.querySelectorAll('.chip-reason');
      reasonChips.forEach(chip => {
        chip.addEventListener('click', () => {
          reasonChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          const reason = chip.dataset.reason;
          if (reason === 'custom') {
            el.inputCustomDelayReason.value = '';
            el.inputCustomDelayReason.focus();
            state.selectedDelayReason = '';
          } else {
            el.inputCustomDelayReason.value = reason;
            state.selectedDelayReason = reason;
          }
        });
      });
    }

    if (el.inputCustomDelayReason) {
      el.inputCustomDelayReason.addEventListener('input', (e) => {
        state.selectedDelayReason = e.target.value;
      });
    }

    if (el.btnSubmitDelay) el.btnSubmitDelay.addEventListener('click', submitDelayNotification);

    // 7. Destination Modal
    if (el.btnCloseDestModal) {
      el.btnCloseDestModal.addEventListener('click', () => el.destModal.classList.remove('is-open'));
    }
    if (el.destModal) {
      el.destModal.addEventListener('click', (e) => {
        if (e.target === el.destModal) el.destModal.classList.remove('is-open');
      });
    }
    if (el.inputSearchStation) {
      el.inputSearchStation.addEventListener('input', (e) => {
        renderStationModalList(e.target.value);
      });
    }

    // 8. Add Favorite
    if (el.btnAddFavorite) {
      el.btnAddFavorite.addEventListener('click', async () => {
        const busNum = el.inputFavBusNumber.value.trim();
        const memo = el.inputFavMemo.value.trim();
        if (!busNum) {
          alert('버스 번호를 입력해주세요.');
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
              memo: memo || '즐겨찾기'
            })
          });
          if (res.ok) {
            el.inputFavBusNumber.value = '';
            el.inputFavMemo.value = '';
            await fetchFavorites();
            showToast(`⭐ ${busNum}번 버스가 즐겨찾기에 등록되었습니다.`);
          }
        } catch (e) { console.error(e); }
      });
    }

    // 9. Bottom Sheet Gesture
    setupBottomSheetGesture();
  }

  // Drawer
  function openMenuDrawer() {
    if (el.menuDrawer && el.menuBackdrop) {
      el.menuDrawer.classList.add('is-open');
      el.menuBackdrop.classList.add('is-open');
    }
  }

  function closeMenuDrawer() {
    if (el.menuDrawer && el.menuBackdrop) {
      el.menuDrawer.classList.remove('is-open');
      el.menuBackdrop.classList.remove('is-open');
    }
  }

  function handleMenuAction(action) {
    if (action === 'nav-bus') {
      state.transitMode = 'BUS';
      state.showIntermediateStops = true;
      updateStopsVisibilityUI();
      setTransitMode('BUS');
      showToast('🚌 부산 24번 버스 도로 노선 모드로 전환되었습니다.');
    } else if (action === 'nav-subway') {
      state.transitMode = 'SUBWAY';
      state.showIntermediateStops = true;
      updateStopsVisibilityUI();
      setTransitMode('SUBWAY');
      showToast('🚇 부산 2호선 지하철역 길찾기 모드로 전환되었습니다.');
    } else if (action === 'tab-all-arrivals') {
      switchTab('all-arrivals');
    } else if (action === 'tab-appointments') {
      switchTab('appointments');
    } else if (action === 'share-appointment-link') {
      copyAppointmentShareLink();
    } else if (action === 'open-delay-modal') {
      openDelayModal();
    } else if (action === 'tab-recommendations') {
      switchTab('recommendations');
    } else if (action === 'tab-favorites') {
      switchTab('favorites');
    } else if (action === 'open-dest-modal') {
      if (el.destModal) {
        el.destModal.classList.add('is-open');
        renderStationModalList('');
      }
    } else if (action === 'refresh-gps') {
      requestDeviceGps();
    }
  }

  function switchTab(tabName) {
    el.tabs.forEach(t => {
      if (t.dataset.tab === tabName) t.classList.add('active');
      else t.classList.remove('active');
    });
    state.activeTab = tabName;
    renderCurrentTab();
  }

  function setTransitMode(mode) {
    state.transitMode = mode;
    if (mode === 'BUS') {
      if (el.btnSelectBusMode) el.btnSelectBusMode.classList.add('active');
      if (el.btnSelectSubwayMode) el.btnSelectSubwayMode.classList.remove('active');
      if (el.miniModeBadge) el.miniModeBadge.textContent = '🚌 24번 직통';
      if (el.miniSummaryText) el.miniSummaryText.textContent = '대연역 ➔ 서면역 직통 (14분 소요)';
    } else {
      if (el.btnSelectSubwayMode) el.btnSelectSubwayMode.classList.add('active');
      if (el.btnSelectBusMode) el.btnSelectBusMode.classList.remove('active');
      if (el.miniModeBadge) el.miniModeBadge.textContent = '🚇 부산 2호선';
      if (el.miniSummaryText) el.miniSummaryText.textContent = '대연역 ➔ 서면역 정시도착 (11분 소요)';
    }
    renderCurrentTab();
    drawMap();
  }

  function updateStopsVisibilityUI() {
    const isBus = state.transitMode === 'BUS';
    if (state.showIntermediateStops) {
      if (el.stopsVisibilityNotice) {
        el.stopsVisibilityNotice.textContent = isBus
          ? '📍 24번 버스 경유 정류소 8개가 지도에 표시 중입니다.'
          : '📍 부산 2호선 7개 지하철역이 지도에 표시 중입니다.';
      }
      if (el.btnToggleStopsPin) el.btnToggleStopsPin.textContent = '정류소 숨기기';
      if (el.busStopsToggleText) el.busStopsToggleText.textContent = isBus ? '8개 정류소 표시 중 (클릭 시 접기)' : '환승 0회 · 클릭 시 정류소 8개 노선도 표시';
      if (el.subwayStopsToggleText) el.subwayStopsToggleText.textContent = !isBus ? '7개 역 표시 중 (클릭 시 접기)' : '환승 0회 · 클릭 시 7개 지하철역 표시';
    } else {
      if (el.stopsVisibilityNotice) {
        el.stopsVisibilityNotice.textContent = '💡 노선 카드를 누르면 지도에 경유 정류소가 표기됩니다.';
      }
      if (el.btnToggleStopsPin) el.btnToggleStopsPin.textContent = '정류소 핀 보기';
      if (el.busStopsToggleText) el.busStopsToggleText.textContent = '환승 0회 · 클릭 시 정류소 8개 노선도 표시';
      if (el.subwayStopsToggleText) el.subwayStopsToggleText.textContent = '환승 0회 · 클릭 시 7개 지하철역 표시';
    }
  }

  // Delay Modal
  function openDelayModal() {
    if (el.delayModal) el.delayModal.classList.add('is-open');
  }

  function closeDelayModal() {
    if (el.delayModal) el.delayModal.classList.remove('is-open');
  }

  async function submitDelayNotification() {
    const mins = state.selectedDelayMinutes || 10;
    const reason = state.selectedDelayReason || (el.inputCustomDelayReason ? el.inputCustomDelayReason.value : '이동 지연');
    const meetId = state.activeAppointment ? state.activeAppointment.id : 'MEET-2490';

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delay',
          id: meetId,
          who: '민재(나)',
          delayMinutes: mins,
          reason: reason
        })
      });

      if (res.ok) {
        closeDelayModal();
        showToast(`⏳ 상대방에게 +${mins}분 지연 사유가 전송되었습니다.`);
        await fetchAppointments();
        renderCurrentTab();
      }
    } catch (e) {
      closeDelayModal();
      showToast(`⏳ 지연 알림이 처리되었습니다 (+${mins}분)`);
    }
  }

  // Copy Link
  async function copyAppointmentShareLink() {
    const meetId = state.activeAppointment ? state.activeAppointment.id : 'MEET-2490';
    const shareUrl = `${window.location.origin}${window.location.pathname}?meetId=${meetId}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const temp = document.createElement('input');
        temp.value = shareUrl;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      showToast('약속 공유 링크가 복사되었습니다!');
    } catch (e) {
      showToast('링크: ' + shareUrl);
    }
  }

  function showToast(msg) {
    if (!el.appToast) return;
    el.appToast.textContent = msg;
    el.appToast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.appToast.classList.remove('show'), 2800);
  }

  // Haversine Distance Formula (km)
  function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Location & GPS
  async function loadInitialLocation() {
    state.currentLat = 35.13545;
    state.currentLng = 129.09210;
    if (el.gpsStatusText) el.gpsStatusText.textContent = '대연역 (수영로)';
  }

  function requestDeviceGps() {
    if (!('geolocation' in navigator)) {
      showToast('브라우저가 GPS를 지원하지 않습니다.');
      return;
    }
    if (el.gpsStatusText) el.gpsStatusText.textContent = 'GPS 탐색 중...';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.currentLat = pos.coords.latitude;
        state.currentLng = pos.coords.longitude;
        if (el.gpsStatusText) el.gpsStatusText.textContent = 'GPS 실시간 연동';
        showToast('내 위치 GPS가 갱신되었습니다.');
        refreshAllData();
        if (leafletMap) leafletMap.setView([state.currentLat, state.currentLng], 16);
      },
      () => {
        if (el.gpsStatusText) el.gpsStatusText.textContent = '대연역 (기본값)';
        showToast('GPS 위치를 가져올 수 없어 기본값으로 유지합니다.');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }

  // Backend Fetches
  async function fetchStations() {
    try {
      const res = await fetch('/api/stations');
      if (res.ok) state.allStations = await res.json();
    } catch (e) { console.error(e); }
  }

  async function fetchDestination() {
    try {
      const res = await fetch('/api/destination');
      if (res.ok) state.destination = await res.json();
    } catch (e) { console.error(e); }
  }

  async function fetchFavorites() {
    try {
      const res = await fetch('/api/favorites');
      if (res.ok) {
        state.favorites = await res.json();
        renderFavoritesGrid();
      }
    } catch (e) { console.error(e); }
  }

  async function fetchAppointments() {
    try {
      const res = await fetch('/api/appointments');
      if (res.ok) {
        const list = await res.json();
        state.appointments = list;
        if (list.length > 0) {
          state.activeAppointment = list[0];
          updateDelayAlertBanner();
        }
      }
    } catch (e) { console.error(e); }
  }

  async function fetchRecommendations() {
    try {
      const res = await fetch('/api/recommendations?destinationId=ST-BS-SMN&earlyMinutes=11');
      if (res.ok) state.recommendations = await res.json();
    } catch (e) { console.error(e); }
  }

  async function refreshAllData(updateMap = true) {
    try {
      const nearRes = await fetch(`/api/stations/nearest?lat=${state.currentLat}&lng=${state.currentLng}`);
      if (nearRes.ok) state.currentStation = await nearRes.json();

      const matchRes = await fetch(`/api/destination/matches?lat=${state.currentLat}&lng=${state.currentLng}`);
      if (matchRes.ok) state.cachedMatches = await matchRes.json();

      const stId = (state.currentStation && state.currentStation.station) ? state.currentStation.station.id : 'ST-BS-DY';
      const arrRes = await fetch(`/api/stations/${stId}/arrivals`);
      if (arrRes.ok) state.cachedArrivals = await arrRes.json();

      renderCurrentTab();
      if (updateMap) drawMap();
    } catch (e) { console.error(e); }
  }

  function updateDelayAlertBanner() {
    const app = state.activeAppointment;
    if (!el.delayAlertBanner) return;

    if (app && app.delayReason && app.delayReason.trim().length > 0) {
      el.delayAlertBanner.style.display = 'flex';
      el.delayAlertTitle.textContent = `⚠️ [약속 지연] ${app.delaySender || '일행'}님이 +${app.delayMinutes || 10}분 지연을 알렸습니다`;
      el.delayAlertDesc.textContent = `사유: "${app.delayReason}"`;
    } else {
      el.delayAlertBanner.style.display = 'none';
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
        if (m.arrivalInfo && m.arrivalInfo.remainingSeconds > 0) m.arrivalInfo.remainingSeconds--;
      });
    }
  }

  function updateClock() {
    const now = new Date();
    if (el.liveClock) {
      el.liveClock.textContent = `${now.toLocaleTimeString('ko-KR', { hour12: false })} 동기화`;
    }
  }

  // Render Tabs
  function renderCurrentTab() {
    if (el.favoritesBoxCard) {
      el.favoritesBoxCard.style.display = (state.activeTab === 'favorites') ? 'block' : 'none';
    }

    if (state.activeTab === 'destination') {
      if (state.transitMode === 'SUBWAY') renderSubwayRouteDetails();
      else renderDestinationMatches();
    } else if (state.activeTab === 'all-arrivals') {
      renderAllArrivals();
    } else if (state.activeTab === 'appointments') {
      renderAppointmentsTab();
    } else if (state.activeTab === 'recommendations') {
      renderRecommendationsTab();
    } else if (state.activeTab === 'favorites') {
      renderFavoriteArrivals();
    }
  }

  // 1. SUBWAY VIEW
  function renderSubwayRouteDetails() {
    if (el.fastestCard) {
      el.fastestCard.style.display = 'block';
      el.fastestBusTitle.textContent = '★ [지하철 2호선] 대연역 ➔ 서면역 11분 정시도착!';
      el.fastestBusDesc.textContent = '6개 역 경유 (못골 ➔ 지게골 ➔ 문현 ➔ BIFC ➔ 전포 ➔ 서면) · 배차 5분';
    }

    el.busListContainer.innerHTML = `
      <div class="bus-card">
        <div class="card-top-row">
          <div class="bus-badge-container">
            <span class="bus-number-chip" style="background:#10B981;">부산 2호선</span>
            <div class="bus-dir-info">
              <span class="bus-dir-text">양산/호포 방면 (상행)</span>
              <span class="bus-stops-estimate">서면역까지 6개 역 경유 (약 11분 소요)</span>
            </div>
          </div>
          <span style="font-size:12px; font-weight:800; color:#10B981;">정시 운행</span>
        </div>

        <div class="arrival-row">
          <div class="time-and-stops">
            <span class="primary-remaining-time urgent">2분 후 도착</span>
            <span class="stops-remaining-text">전역 출발 (경성대역)</span>
          </div>
          <div class="meta-tags-group">
            <span class="meta-pill pill-여유">보통 (혼잡도 낮음)</span>
            <span class="meta-pill" style="background:#ECFDF5; color:#065F46;">쾌적 냉방</span>
          </div>
        </div>

        <div class="stops-preview-box">
          <span class="stops-preview-title">경유 지하철역 (클릭 시 지도에서 확인):</span>
          <div class="stops-chips-row">
            <span class="stop-chip current">대연역(승차)</span>
            <span class="stop-arrow">→</span>
            <span class="stop-chip">못골</span>
            <span class="stop-arrow">→</span>
            <span class="stop-chip">지게골</span>
            <span class="stop-arrow">→</span>
            <span class="stop-chip">문현</span>
            <span class="stop-arrow">→</span>
            <span class="stop-chip">BIFC</span>
            <span class="stop-arrow">→</span>
            <span class="stop-chip">전포</span>
            <span class="stop-arrow">→</span>
            <span class="stop-chip is-dest">서면역(하차)</span>
          </div>
        </div>
      </div>
    `;
  }

  // 2. BUS DESTINATION MATCHES
  function renderDestinationMatches() {
    const matches = state.cachedMatches || [];

    if (matches.length === 0) {
      if (el.fastestCard) el.fastestCard.style.display = 'none';
      el.busListContainer.innerHTML = `
        <div class="empty-state">
          현재 위치에서 목적지까지 운행하는 직통 버스가 없습니다.<br>
          <span style="color:var(--brand-primary); font-weight:700; margin-top:6px; display:inline-block;">
            상단 [지하철 정시도착]을 눌러 2호선을 이용해보세요!
          </span>
        </div>
      `;
      return;
    }

    const fastest = matches[0];
    if (el.fastestCard) {
      el.fastestCard.style.display = 'block';
      el.fastestBusTitle.textContent = `★ 지금 ${fastest.busNumber}번 버스를 타시면 가장 빠릅니다!`;
      el.fastestBusDesc.textContent = `${fastest.boardingStation.name} 탑승 시 6개 정류장 후 [${fastest.destinationStation.name}] 도착 (총 약 ${fastest.totalEstimatedMinutes}분 소요)`;
    }

    el.busListContainer.innerHTML = matches.map(m => createMatchCardHtml(m)).join('');
    bindCardEvents();
  }

  function renderAllArrivals() {
    if (el.fastestCard) el.fastestCard.style.display = 'none';
    const arrivals = state.cachedArrivals || [];

    if (arrivals.length === 0) {
      el.busListContainer.innerHTML = `<div class="empty-state">도착 예정인 버스 정보가 없습니다.</div>`;
      return;
    }

    el.busListContainer.innerHTML = arrivals.map(a => createArrivalCardHtml(a)).join('');
    bindCardEvents();
  }

  // 3. APPOINTMENTS TAB
  function renderAppointmentsTab() {
    if (el.fastestCard) el.fastestCard.style.display = 'none';
    const app = state.activeAppointment;

    if (!app) {
      el.busListContainer.innerHTML = `
        <div class="empty-state">
          진행 중인 실시간 약속이 없습니다.<br>
          <button class="btn-primary-action" id="btnCreateSampleMeetup" style="margin-top:12px;">
            + 서면 약속 만들기
          </button>
        </div>
      `;
      return;
    }

    const delayBadgeHtml = app.delayReason ? `
      <div style="background:#FFF7ED; border:1px solid #FDBA74; border-radius:10px; padding:8px 12px; margin-bottom:12px;">
        <div style="font-size:12px; font-weight:800; color:#C2410C;">
          ⏳ 지연 알림: ${app.delaySender || '일행'} (+${app.delayMinutes}분 연장)
        </div>
        <div style="font-size:11.5px; color:#9A3412; margin-top:2px;">"${app.delayReason}"</div>
      </div>
    ` : '';

    el.busListContainer.innerHTML = `
      <div class="appointment-card">
        <div class="appointment-header">
          <div class="appointment-title"><span>🤝 ${app.title}</span></div>
          <div style="display:flex; gap:6px;">
            <button class="btn-cancel" id="btnCardDelayLink" style="padding:4px 8px; font-size:11px;">⏳ 지연 전송</button>
            <button class="btn-primary-action" id="btnCardShareLink" style="padding:4px 10px; font-size:11px;">🔗 링크 복사</button>
          </div>
        </div>

        ${delayBadgeHtml}

        <div style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">
          <strong>장소:</strong> ${app.destinationName} &nbsp;|&nbsp; <strong>예정 시각:</strong> 25분 뒤 (12:30)
        </div>

        <div class="appointment-members">
          <div class="member-col">
            <div class="member-avatar avatar-me">나</div>
            <div>
              <div class="member-info-name">${app.creatorName}</div>
              <div class="member-info-status">대연역 (24번 탑승 준비)</div>
            </div>
          </div>
          <div class="member-col">
            <div class="member-avatar avatar-friend">친</div>
            <div>
              <div class="member-info-name">${app.friendName || '친구 대기 중'}</div>
              <div class="member-info-status">문현역 부근 (도착 8분 전)</div>
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11px; color:#2563EB; font-weight:700;">
            약속 시간 동안에만 서로의 GPS가 지도에 실시간 표시됩니다.
          </span>
        </div>
      </div>
    `;

    const btnCardShare = document.getElementById('btnCardShareLink');
    if (btnCardShare) btnCardShare.addEventListener('click', copyAppointmentShareLink);

    const btnCardDelay = document.getElementById('btnCardDelayLink');
    if (btnCardDelay) btnCardDelay.addEventListener('click', openDelayModal);
  }

  // 4. RECOMMENDATIONS TAB (RICH PHOTOS & THEME FILTERS & NAVIGATION)
  function renderRecommendationsTab() {
    if (el.fastestCard) el.fastestCard.style.display = 'none';
    const allList = state.recommendations || [];

    if (allList.length === 0) {
      el.busListContainer.innerHTML = `<div class="empty-state">추천 장소를 불러오는 중입니다...</div>`;
      return;
    }

    // Filter Logic
    const currentFilter = state.selectedPlaceFilter;
    const filteredList = allList.filter(item => {
      if (currentFilter === 'ALL') return true;
      if (currentFilter === 'FRIEND') return item.theme === 'FRIEND' || item.theme === 'ALL';
      if (currentFilter === 'SOLO') return item.theme === 'SOLO' || item.theme === 'ALL';
      if (currentFilter === 'PLAY') return item.category.includes('놀거리') || item.category.includes('소품');
      if (currentFilter === 'CAFE') return item.category.includes('카페');
      if (currentFilter === 'FOOD') return item.category.includes('음식점');
      return true;
    });

    el.busListContainer.innerHTML = `
      <div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:12px; padding:12px 14px; margin-bottom:10px;">
        <div style="font-weight:800; font-size:13.5px; color:#1E40AF; margin-bottom:2px;">
          ✨ 서면역 약속 전 핫플레이스 (${filteredList.length}곳)
        </div>
        <div style="font-size:11.5px; color:#1E3A8A;">
          카드를 클릭하면 <strong>현재 내 위치에서의 거리와 도보 길안내선</strong>이 지도에 표시됩니다.
        </div>
      </div>

      <!-- THEME FILTER CHIPS ROW -->
      <div class="place-filter-chips-row">
        <button class="btn-filter-tag ${currentFilter === 'ALL' ? 'active' : ''}" data-filter="ALL">🌟 전체보기 (${allList.length})</button>
        <button class="btn-filter-tag ${currentFilter === 'FRIEND' ? 'active' : ''}" data-filter="FRIEND">👥 친구와 함께</button>
        <button class="btn-filter-tag ${currentFilter === 'SOLO' ? 'active' : ''}" data-filter="SOLO">🧘 혼자 여유</button>
        <button class="btn-filter-tag ${currentFilter === 'PLAY' ? 'active' : ''}" data-filter="PLAY">🎲 놀거리/체험</button>
        <button class="btn-filter-tag ${currentFilter === 'FOOD' ? 'active' : ''}" data-filter="FOOD">🥩 맛집/식사</button>
        <button class="btn-filter-tag ${currentFilter === 'CAFE' ? 'active' : ''}" data-filter="CAFE">☕ 카페/디저트</button>
      </div>

      <!-- PLACES GRID -->
      <div class="places-grid-container">
        ${filteredList.map((item, idx) => {
          // Calculate Real Distance from current GPS
          const distKm = (item.latitude && item.longitude)
            ? calculateDistanceKm(state.currentLat, state.currentLng, item.latitude, item.longitude)
            : 0.5;
          const distText = distKm >= 1 ? `${distKm.toFixed(1)}km` : `${Math.round(distKm * 1000)}m`;
          const walkMins = Math.max(1, Math.round((distKm * 1000) / 67));

          return `
            <div class="place-card-v2" data-name="${item.name}" style="cursor:pointer;">
              <div class="place-image-wrap">
                <img src="${item.imageUrl}" alt="${item.name}" class="place-thumb-img" onerror="this.src='https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=700&q=80'">
                <div class="place-floating-tags">
                  <span class="place-cat-tag">${item.category}</span>
                  <span class="place-walk-tag" style="background:#0F172A;">📍 내 위치에서 ${distText}</span>
                </div>
              </div>
              <div class="place-body-wrap">
                <div class="place-name-row">
                  <h3 class="place-title">${idx + 1}. ${item.name}</h3>
                  <span class="place-badge-tag">${item.badge}</span>
                </div>
                <p class="place-description">${item.description}</p>
                <div class="place-meta-footer" style="justify-content:space-between;">
                  <div>
                    <span class="place-star-rating">★ ${item.googleRating}</span>
                    <span style="margin-left:4px;">리뷰 ${item.reviewCount}건</span>
                  </div>
                  <span style="color:#2563EB; font-weight:800; font-size:11.5px;">
                    🚶 도보 약 ${walkMins}분 길안내 보기 →
                  </span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Filter Chips Event Binding
    const filterButtons = el.busListContainer.querySelectorAll('.btn-filter-tag');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedPlaceFilter = btn.dataset.filter;
        renderRecommendationsTab();
      });
    });

    // Place Cards Click Event (Walking Navigation & Map Pin)
    const placeCards = el.busListContainer.querySelectorAll('.place-card-v2');
    placeCards.forEach(card => {
      card.addEventListener('click', () => {
        const placeName = card.dataset.name;
        const targetPlace = allList.find(p => p.name === placeName);
        if (targetPlace) {
          selectPlaceForNavigation(targetPlace);
        }
      });
    });
  }

  // SELECT PLACE FOR WALKING NAVIGATION
  function selectPlaceForNavigation(place) {
    state.selectedPlaceForNav = place;

    // Calculate Distance
    const distKm = (place.latitude && place.longitude)
      ? calculateDistanceKm(state.currentLat, state.currentLng, place.latitude, place.longitude)
      : 0.5;
    const distText = distKm >= 1 ? `${distKm.toFixed(1)}km` : `${Math.round(distKm * 1000)}m`;
    const walkMins = Math.max(1, Math.round((distKm * 1000) / 67));

    // Show Place Navigation Banner
    if (el.placeNavigationBanner) {
      el.placeNavigationBanner.style.display = 'block';
      if (el.placeNavTitle) el.placeNavTitle.textContent = place.name;
      if (el.placeNavDistance) el.placeNavDistance.textContent = distText;
      if (el.placeNavWalkTime) el.placeNavWalkTime.textContent = `도보 약 ${walkMins}분 소요`;
      if (el.placeNavAddress) el.placeNavAddress.textContent = place.address || '부산 서면 중심가';

      // Naver & Kakao Map Links
      if (el.btnOpenNaverMap) {
        el.btnOpenNaverMap.href = `https://map.naver.com/v5/search/${encodeURIComponent(place.name)}`;
      }
      if (el.btnOpenKakaoMap) {
        el.btnOpenKakaoMap.href = `https://map.kakao.com/link/search/${encodeURIComponent(place.name)}`;
      }
    }

    // Move Map View & Draw Walking Line
    if (leafletMap && place.latitude && place.longitude) {
      leafletMap.setView([place.latitude, place.longitude], 16);
    }
    drawMap();
    showToast(`[${place.name}]까지의 도보 거리(${distText}) 및 길안내선이 지도에 표시되었습니다!`);
  }

  // 5. FAVORITES TAB
  function renderFavoriteArrivals() {
    if (el.fastestCard) el.fastestCard.style.display = 'none';
    const favBusIds = state.favorites.map(f => f.targetId);
    const arrivals = (state.cachedArrivals || []).filter(a => favBusIds.includes(a.busNumber));

    if (arrivals.length === 0) {
      el.busListContainer.innerHTML = `
        <div class="empty-state">
          자주 타는 버스 중 현재 도착 예정인 버스가 없습니다.<br>
          아래 입력창에서 자주 타는 버스 번호를 추가해보세요.
        </div>
      `;
      return;
    }

    el.busListContainer.innerHTML = arrivals.map(a => createArrivalCardHtml(a)).join('');
    bindCardEvents();
  }

  // Card HTML Helpers
  function createMatchCardHtml(m) {
    const arr = m.arrivalInfo;
    const isSoon = arr.remainingSeconds <= 35;
    const timeFormatted = formatSeconds(arr.remainingSeconds);
    const isFav = state.favorites.some(f => f.targetId === m.busNumber);

    return `
      <div class="bus-card">
        <div class="card-top-row">
          <div class="bus-badge-container">
            <span class="bus-number-chip">${m.busNumber}</span>
            <div class="bus-dir-info">
              <span class="bus-dir-text">${arr.direction || '서면 방면'}</span>
              <span class="bus-stops-estimate">${m.stopsToDestination}정거장 (약 ${m.travelMinutesToDestination}분)</span>
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
            ${arr.isLowFloor ? '<span class="meta-pill" style="background:#EFF6FF; color:#1E40AF;">저상</span>' : ''}
          </div>
        </div>

        <div class="stops-preview-box">
          <span class="stops-preview-title">경유 정류소 (클릭 시 지도에서 확인):</span>
          <div class="stops-chips-row">
            <span class="stop-chip current">${m.boardingStation.name}</span>
            <span class="stop-arrow">→</span>
            <span class="stop-chip">못골</span>
            <span class="stop-arrow">→</span>
            <span class="stop-chip">지게골</span>
            <span class="stop-arrow">→</span>
            <span class="stop-chip">문현</span>
            <span class="stop-arrow">→</span>
            <span class="stop-chip">BIFC</span>
            <span class="stop-arrow">→</span>
            <span class="stop-chip is-dest">${m.destinationStation.name}</span>
          </div>
        </div>
      </div>
    `;
  }

  function createArrivalCardHtml(arr) {
    const isSoon = arr.remainingSeconds <= 35;
    const timeFormatted = formatSeconds(arr.remainingSeconds);
    const isFav = state.favorites.some(f => f.targetId === arr.busNumber);

    return `
      <div class="bus-card">
        <div class="card-top-row">
          <div class="bus-badge-container">
            <span class="bus-number-chip">${arr.busNumber}</span>
            <div class="bus-dir-info">
              <span class="bus-dir-text">${arr.direction || '운행 방면'}</span>
              <span class="bus-stops-estimate">${arr.routeType === 'TRUNK' ? '간선' : '지선'}</span>
            </div>
          </div>
          <button class="btn-favorite-toggle ${isFav ? 'is-active' : ''}" data-bus="${arr.busNumber}" title="즐겨찾기">★</button>
        </div>

        <div class="arrival-row">
          <div class="time-and-stops">
            <span class="primary-remaining-time ${isSoon ? 'urgent' : ''}">${timeFormatted}</span>
            <span class="stops-remaining-text">${arr.remainingStations}번째 전 (${arr.currentStationName})</span>
          </div>
          <div class="meta-tags-group">
            <span class="meta-pill pill-${arr.congestion}">${arr.congestion}</span>
          </div>
        </div>
      </div>
    `;
  }

  function bindCardEvents() {
    const favToggles = el.busListContainer.querySelectorAll('.btn-favorite-toggle');
    favToggles.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const busNum = btn.dataset.bus;
        const existing = state.favorites.find(f => f.targetId === busNum);

        if (existing) {
          await fetch(`/api/favorites/${existing.id}`, { method: 'DELETE' });
          showToast(`⭐ ${busNum}번 버스가 즐겨찾기에서 해제되었습니다.`);
        } else {
          await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'BUS',
              targetId: busNum,
              name: `${busNum}번 버스`,
              memo: '목적지 노선'
            })
          });
          showToast(`⭐ ${busNum}번 버스가 즐겨찾기에 등록되었습니다.`);
        }
        await fetchFavorites();
        renderCurrentTab();
      });
    });
  }

  function renderFavoritesGrid() {
    if (!el.favoritesGrid) return;
    if (state.favorites.length === 0) {
      el.favoritesGrid.innerHTML = `<span style="font-size:12px; color:var(--text-caption);">등록된 즐겨찾기가 없습니다.</span>`;
      if (el.favCountBadge) el.favCountBadge.textContent = '0개 등록';
      return;
    }

    if (el.favCountBadge) el.favCountBadge.textContent = `${state.favorites.length}개 등록`;

    el.favoritesGrid.innerHTML = state.favorites.map(f => `
      <div class="fav-chip" style="display:inline-flex; align-items:center; gap:6px; background:#F1F5F9; padding:5px 10px; border-radius:8px; font-size:12px; margin:3px;">
        <span style="color:#F59E0B;">★</span>
        <span style="font-weight:700;">${f.name}</span>
        <button class="fav-chip-remove" data-id="${f.id}" style="border:none; background:none; cursor:pointer; color:#94A3B8;">&times;</button>
      </div>
    `).join('');

    el.favoritesGrid.querySelectorAll('.fav-chip-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        await fetch(`/api/favorites/${id}`, { method: 'DELETE' });
        await fetchFavorites();
        renderCurrentTab();
        showToast('즐겨찾기가 삭제되었습니다.');
      });
    });
  }

  function renderStationModalList(query) {
    if (!el.modalStationList) return;
    const q = (query || '').toLowerCase().trim();
    const filtered = state.allStations.filter(s =>
      s.name.toLowerCase().includes(q) || s.arsId.includes(q)
    );

    el.modalStationList.innerHTML = filtered.map(st => `
      <div class="station-option-item" data-id="${st.id}" data-name="${st.name}" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #F1F5F9; cursor:pointer;">
        <div>
          <div style="font-size:13.5px; font-weight:800; color:var(--text-main);">${st.name}</div>
          <div style="font-size:11px; color:var(--text-muted);">ARS ${st.arsId}</div>
        </div>
        <button class="btn-cancel" style="font-size:11px; padding:4px 8px;">선택</button>
      </div>
    `).join('');

    el.modalStationList.querySelectorAll('.station-option-item').forEach(item => {
      item.addEventListener('click', async () => {
        const stId = item.dataset.id;
        const stName = item.dataset.name;

        await fetch('/api/destination', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stationId: stId, memo: stName })
        });

        if (el.inputNavDest) el.inputNavDest.value = stName;
        el.destModal.classList.remove('is-open');
        await fetchDestination();
        await refreshAllData();
        showToast(`목적지가 [${stName}]으로 설정되었습니다.`);
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

  // ========================================================
  // REAL LEAFLET MAP ENGINE (WITH WALKING NAVIGATION TO PLACE)
  // ========================================================
  let leafletMap = null;
  let busPolyline = null;
  let subwayPolyline = null;
  let walkingPolyline = null;
  let stationMarkersGroup = null;
  let liveBusMarkersGroup = null;
  let hotplaceMarkerGroup = null;
  let currentTileLayer = null;

  // 1. 부산 24번 버스 도로 궤적
  const busan24RoadCoords = [
    [35.13545, 129.09210], // 대연역
    [35.13555, 129.09050],
    [35.13570, 129.08800],
    [35.13605, 129.08470], // 못골역
    [35.13635, 129.08250],
    [35.13665, 129.08020],
    [35.13695, 129.07830],
    [35.13735, 129.07605], // 지게골역
    [35.13765, 129.07400],
    [35.13805, 129.07120],
    [35.13840, 129.06880],
    [35.13865, 129.06730],
    [35.13885, 129.06640], // 문현교차로
    [35.13960, 129.06640],
    [35.14150, 129.06625],
    [35.14320, 129.06590],
    [35.14500, 129.06540],
    [35.14650, 129.06500],
    [35.14750, 129.06470], // BIFC
    [35.14920, 129.06420],
    [35.14928, 129.06330],
    [35.14935, 129.06200], // 동천교
    [35.14940, 129.06140],
    [35.14945, 129.06080], // 지오플레이스
    [35.15020, 129.06030],
    [35.15120, 129.05990],
    [35.15220, 129.05970],
    [35.15320, 129.05950], // 서면한전
    [35.15450, 129.05935],
    [35.15600, 129.05925],
    [35.15780, 129.05920]  // 서면역
  ];

  // 2. 지하철 2호선 궤적
  const subway2LineCoords = [
    [35.13545, 129.09210], // 대연역
    [35.13605, 129.08470], // 못골역
    [35.13735, 129.07605], // 지게골역
    [35.13885, 129.06640], // 문현역
    [35.14750, 129.06470], // BIFC
    [35.15420, 129.06320], // 전포역
    [35.15780, 129.05920]  // 서면역
  ];

  const realSubwayStations = [
    { id: 'SUB-DY', name: '대연역', lat: 35.13545, lng: 129.09210, code: '213' },
    { id: 'SUB-MG', name: '못골역', lat: 35.13605, lng: 129.08470, code: '214' },
    { id: 'SUB-JG', name: '지게골역', lat: 35.13735, lng: 129.07605, code: '215' },
    { id: 'SUB-MH', name: '문현역', lat: 35.13885, lng: 129.06640, code: '216' },
    { id: 'SUB-BIFC', name: '국제금융센터·부산은행역', lat: 35.14750, lng: 129.06470, code: '217' },
    { id: 'SUB-JP', name: '전포역', lat: 35.15420, lng: 129.06320, code: '218' },
    { id: 'SUB-SMN', name: '서면역', lat: 35.15780, lng: 129.05920, code: '219', isDest: true }
  ];

  const realStations = [
    { id: 'ST-BS-DY', name: '대연역', lat: 35.13545, lng: 129.09210, isOrigin: true },
    { id: 'ST-BS-MG', name: '못골역', lat: 35.13605, lng: 129.08470 },
    { id: 'ST-BS-JG', name: '지게골역', lat: 35.13735, lng: 129.07605 },
    { id: 'ST-BS-MH', name: '문현교차로', lat: 35.13885, lng: 129.06640 },
    { id: 'ST-BS-BIFC', name: '국제금융센터(BIFC)', lat: 35.14750, lng: 129.06470 },
    { id: 'ST-BS-GOP', name: '지오플레이스', lat: 35.14945, lng: 129.06080 },
    { id: 'ST-BS-KEPCO', name: '서면한전', lat: 35.15320, lng: 129.05950 },
    { id: 'ST-BS-SMN', name: '서면역', lat: 35.15780, lng: 129.05920, isDest: true }
  ];

  const tileLayers = {
    google: L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&scale=2', {
      tileSize: 256,
      maxNativeZoom: 19,
      maxZoom: 19,
      attribution: '&copy; Google Maps'
    }),
    hybrid: L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&scale=2', {
      tileSize: 256,
      maxNativeZoom: 19,
      maxZoom: 19,
      attribution: '&copy; Google Satellite'
    }),
    osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxNativeZoom: 19,
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    })
  };

  function initRealLeafletMap() {
    if (!el.mapContainer || leafletMap) return;

    leafletMap = L.map(el.mapContainer, {
      center: [35.1465, 129.0740],
      zoom: 15,
      zoomSnap: 1,
      zoomDelta: 1,
      minZoom: 11,
      maxZoom: 19,
      zoomControl: false
    });
    L.control.zoom({ position: 'bottomright' }).addTo(leafletMap);

    currentTileLayer = tileLayers.google.addTo(leafletMap);
    stationMarkersGroup = L.layerGroup().addTo(leafletMap);
    liveBusMarkersGroup = L.layerGroup().addTo(leafletMap);
    hotplaceMarkerGroup = L.layerGroup().addTo(leafletMap);

    busPolyline = L.polyline(busan24RoadCoords, {
      color: '#2563EB',
      weight: 5,
      opacity: 0.9,
      smoothFactor: 1
    }).addTo(leafletMap);

    subwayPolyline = L.polyline(subway2LineCoords, {
      color: '#10B981',
      weight: 6,
      opacity: 0.9,
      dashArray: '8, 6',
      smoothFactor: 1
    }).addTo(leafletMap);

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
        if (btn === activeBtn) btn.classList.add('active');
        else btn.classList.remove('active');
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
    if (!leafletMap) initRealLeafletMap();
    else renderRealMapElements();
  }

  function renderRealMapElements() {
    if (!leafletMap || !stationMarkersGroup || !liveBusMarkersGroup) return;

    stationMarkersGroup.clearLayers();
    liveBusMarkersGroup.clearLayers();
    if (hotplaceMarkerGroup) hotplaceMarkerGroup.clearLayers();

    const isSubway = state.transitMode === 'SUBWAY';
    const showAllStops = state.showIntermediateStops;

    // Transit Lines Styling
    if (busPolyline && subwayPolyline) {
      if (isSubway) {
        busPolyline.setStyle({ opacity: 0.2, weight: 3 });
        subwayPolyline.setStyle({ opacity: 0.95, weight: 6, dashArray: null });
      } else {
        busPolyline.setStyle({ opacity: 0.9, weight: 5 });
        subwayPolyline.setStyle({ opacity: 0.2, weight: 3, dashArray: '6, 6' });
      }
    }

    if (isSubway) {
      // 1. Subway Mode
      realSubwayStations.forEach(st => {
        const isStartOrEnd = (st.id === 'SUB-DY' || st.id === 'SUB-SMN');
        if (showAllStops || isStartOrEnd) {
          const isOrigin = st.id === 'SUB-DY';
          let pinHtml = `<div class="leaflet-subway-pin"></div>`;
          if (isOrigin) pinHtml = `<div class="leaflet-current-pin" title="탑승역"></div>`;
          else if (st.isDest) pinHtml = `<div class="leaflet-dest-pin" title="도착역"></div>`;

          const customIcon = L.divIcon({
            className: 'custom-station-wrapper',
            html: pinHtml,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });

          const marker = L.marker([st.lat, st.lng], { icon: customIcon }).addTo(stationMarkersGroup);
          marker.bindTooltip(`<b>${st.name}</b>`, {
            permanent: true,
            direction: 'bottom',
            offset: [0, 8],
            className: 'subway-tooltip'
          });
        }
      });

      // Subway train beacon
      const subwayTrainIcon = L.divIcon({
        className: 'subway-beacon-wrapper',
        html: `<div class="leaflet-subway-beacon">🚇 2호선 전동차 (못골➔지게골)</div>`,
        iconSize: [140, 24],
        iconAnchor: [70, 12]
      });
      L.marker([35.13670, 129.08050], { icon: subwayTrainIcon }).addTo(liveBusMarkersGroup);

    } else {
      // 2. Bus Mode
      realStations.forEach(st => {
        const isStartOrEnd = (st.isOrigin || st.isDest);
        if (showAllStops || isStartOrEnd) {
          let pinHtml = `<div class="leaflet-station-pin"></div>`;
          if (st.isOrigin) pinHtml = `<div class="leaflet-current-pin" title="탑승지"></div>`;
          else if (st.isDest) pinHtml = `<div class="leaflet-dest-pin" title="목적지"></div>`;

          const customIcon = L.divIcon({
            className: 'custom-station-wrapper',
            html: pinHtml,
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          });

          const marker = L.marker([st.lat, st.lng], { icon: customIcon }).addTo(stationMarkersGroup);
          marker.bindTooltip(`<b>${st.name}</b>`, {
            permanent: true,
            direction: 'bottom',
            offset: [0, 8],
            className: 'station-tooltip'
          });
        }
      });

      // 24 bus live vehicle
      let bus1Sec = 180;
      if (state.cachedMatches && state.cachedMatches.length > 0 && state.cachedMatches[0].arrivalInfo) {
        bus1Sec = state.cachedMatches[0].arrivalInfo.remainingSeconds;
      }

      const busCoord = interpolateRoadPosition(busan24RoadCoords, bus1Sec);
      const busIcon = L.divIcon({
        className: 'bus-icon-wrapper',
        html: `<div class="leaflet-bus-icon"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="3" width="16" height="15" rx="2.5"/><path d="M4 11h16"/><circle cx="8" cy="15" r="1.5" fill="currentColor"/><circle cx="16" cy="15" r="1.5" fill="currentColor"/></svg><span>24번 (${Math.max(1, Math.round(bus1Sec / 60))}분 전)</span></div>`,
        iconSize: [100, 24],
        iconAnchor: [50, 12]
      });

      L.marker(busCoord, { icon: busIcon }).addTo(liveBusMarkersGroup);
    }

    // 3. Meetup Friend Location
    if (state.activeAppointment && state.activeAppointment.friendName) {
      const friendLat = 35.14150;
      const friendLng = 129.06625;
      const friendIcon = L.divIcon({
        className: 'friend-pin-wrapper',
        html: `<div class="leaflet-friend-pin" title="${state.activeAppointment.friendName}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      L.marker([friendLat, friendLng], { icon: friendIcon }).addTo(stationMarkersGroup);
    }

    // 4. SELECTED HOTPLACE WALKING NAVIGATION PIN & PATH
    if (walkingPolyline) {
      leafletMap.removeLayer(walkingPolyline);
      walkingPolyline = null;
    }

    if (state.selectedPlaceForNav && hotplaceMarkerGroup) {
      const p = state.selectedPlaceForNav;
      if (p.latitude && p.longitude) {
        // Hotplace Pin
        const placeIcon = L.divIcon({
          className: 'custom-station-wrapper',
          html: `<div class="leaflet-hotplace-pin" title="${p.name}"></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });

        const placeMarker = L.marker([p.latitude, p.longitude], { icon: placeIcon }).addTo(hotplaceMarkerGroup);
        placeMarker.bindTooltip(`<b>📍 ${p.name}</b>`, {
          permanent: true,
          direction: 'top',
          offset: [0, -10],
          className: 'hotplace-tooltip'
        }).openTooltip();

        // Walking Dash Line from user to place
        walkingPolyline = L.polyline([
          [state.currentLat, state.currentLng],
          [p.latitude, p.longitude]
        ], {
          color: '#EF4444',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 8',
          smoothFactor: 1
        }).addTo(leafletMap);
      }
    }
  }

  function interpolateRoadPosition(coords, remainingSeconds) {
    if (!coords || coords.length === 0) return [35.13550, 129.09200];
    const totalPoints = coords.length - 1;
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

  // Bottom Sheet Gestures
  function setupBottomSheetGesture() {
    if (!el.transitBottomSheet || !el.sheetDragHandle) return;

    el.sheetDragHandle.addEventListener('click', (e) => {
      if (e.target.closest('.sheet-controls-group')) return;
      toggleSheetState();
    });

    if (el.btnToggleSheet) {
      el.btnToggleSheet.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSheetState();
      });
    }
  }

  function toggleSheetState() {
    if (currentSheetState === 'collapsed') setSheetState('half');
    else if (currentSheetState === 'half') setSheetState('expanded');
    else setSheetState('collapsed');
  }

  function setSheetState(newState) {
    currentSheetState = newState;
    el.transitBottomSheet.classList.remove('sheet-state-collapsed', 'sheet-state-half', 'sheet-state-expanded');
    el.transitBottomSheet.classList.add(`sheet-state-${newState}`);

    const icon = el.btnToggleSheet ? el.btnToggleSheet.querySelector('.toggle-icon') : null;
    if (icon) {
      if (newState === 'collapsed') icon.textContent = '▲';
      else if (newState === 'half') icon.textContent = '▲';
      else icon.textContent = '▼';
    }
  }

  function checkUrlAppointmentParam() {
    const params = new URLSearchParams(window.location.search);
    const meetId = params.get('meetId');
    if (meetId) {
      showToast(`약속 [${meetId}]에 연결되었습니다!`);
      switchTab('appointments');
    }
  }

});
