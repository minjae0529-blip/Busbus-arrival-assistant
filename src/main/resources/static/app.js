// SMART TRANSIT BUS & SUBWAY ASSISTANT CLIENT APPLICATION
document.addEventListener('DOMContentLoaded', () => {

  // Global App State
  const state = {
    currentLat: 35.13545, // 대연역 (수영로)
    currentLng: 129.09210,
    currentStation: null,
    destination: null,
    activeTab: 'destination', // 'destination' | 'all-arrivals' | 'favorites' | 'appointments' | 'recommendations'
    transitMode: 'BUS', // 'BUS' | 'SUBWAY'
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
    menuItems: document.querySelectorAll('.menu-item'),

    // Header Controls
    gpsStatusText: document.getElementById('gpsStatusText'),
    btnRefreshGps: document.getElementById('btnRefreshGps'),
    locationPresetSelect: document.getElementById('locationPresetSelect'),
    btnShareAppointmentLink: document.getElementById('btnShareAppointmentLink'),
    btnQuickDelay: document.getElementById('btnQuickDelay'),

    // T-Map Navigation
    inputNavOrigin: document.getElementById('inputNavOrigin'),
    inputNavDest: document.getElementById('inputNavDest'),
    btnSwapNavPoints: document.getElementById('btnSwapNavPoints'),
    btnSelectBusMode: document.getElementById('btnSelectBusMode'),
    btnSelectSubwayMode: document.getElementById('btnSelectSubwayMode'),

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
    btnOpenDestModal: document.getElementById('btnOpenDestModal'),
    btnCloseDestModal: document.getElementById('btnCloseDestModal'),
    destModal: document.getElementById('destModal'),
    modalStationList: document.getElementById('modalStationList'),
    inputSearchStation: document.getElementById('inputSearchStation'),

    // Station Summary & Recommendations
    currentStationTitle: document.getElementById('currentStationTitle'),
    currentStationArs: document.getElementById('currentStationArs'),
    currentStationDistance: document.getElementById('currentStationDistance'),
    currentStationSubwayTags: document.getElementById('currentStationSubwayTags'),
    fastestCard: document.getElementById('fastestCard'),
    fastestBusTitle: document.getElementById('fastestBusTitle'),
    fastestBusDesc: document.getElementById('fastestBusDesc'),
    busListContainer: document.getElementById('busListContainer'),

    // Tabs & Favorites
    tabs: document.querySelectorAll('.tab-btn'),
    inputFavBusNumber: document.getElementById('inputFavBusNumber'),
    inputFavMemo: document.getElementById('inputFavMemo'),
    btnAddFavorite: document.getElementById('btnAddFavorite'),
    favoritesGrid: document.getElementById('favoritesGrid'),
    favCountBadge: document.getElementById('favCountBadge'),

    // Bottom Sheet & Map
    liveClock: document.getElementById('liveClock'),
    mapContainer: document.getElementById('realLeafletMap'),
    transitBottomSheet: document.getElementById('transitBottomSheet'),
    sheetDragHandle: document.getElementById('sheetDragHandle'),
    btnToggleSheet: document.getElementById('btnToggleSheet'),
    miniModeBadge: document.getElementById('miniModeBadge'),
    miniSummaryText: document.getElementById('miniSummaryText'),
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

    // 1-second UI countdown and periodic draw
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
    // 1. Menu Drawer Toggle
    if (el.btnOpenMenuDrawer) {
      el.btnOpenMenuDrawer.addEventListener('click', openMenuDrawer);
    }
    if (el.btnCloseMenuDrawer) {
      el.btnCloseMenuDrawer.addEventListener('click', closeMenuDrawer);
    }
    if (el.menuBackdrop) {
      el.menuBackdrop.addEventListener('click', closeMenuDrawer);
    }

    // Menu Item Actions
    if (el.menuItems) {
      el.menuItems.forEach(item => {
        item.addEventListener('click', () => {
          const action = item.dataset.action;
          handleMenuAction(action);
          closeMenuDrawer();
        });
      });
    }

    // 2. T-Map Navigation Option Switching
    if (el.btnSelectBusMode) {
      el.btnSelectBusMode.addEventListener('click', () => {
        setTransitMode('BUS');
      });
    }
    if (el.btnSelectSubwayMode) {
      el.btnSelectSubwayMode.addEventListener('click', () => {
        setTransitMode('SUBWAY');
      });
    }

    // Origin ⇄ Destination Swap
    if (el.btnSwapNavPoints) {
      el.btnSwapNavPoints.addEventListener('click', () => {
        const originVal = el.inputNavOrigin.value;
        el.inputNavOrigin.value = el.inputNavDest.value;
        el.inputNavDest.value = originVal;
        showToast('출발지와 도착지가 맞바뀌었습니다.');
      });
    }

    // 3. Delay Modal & Actions
    if (el.btnQuickDelay) {
      el.btnQuickDelay.addEventListener('click', openDelayModal);
    }
    if (el.btnCloseDelayModal) {
      el.btnCloseDelayModal.addEventListener('click', closeDelayModal);
    }
    if (el.btnCancelDelay) {
      el.btnCancelDelay.addEventListener('click', closeDelayModal);
    }
    if (el.delayModal) {
      el.delayModal.addEventListener('click', (e) => {
        if (e.target === el.delayModal) closeDelayModal();
      });
    }

    // Delay Minutes Selection Chips
    if (el.delayMinutesGroup) {
      const minuteChips = el.delayMinutesGroup.querySelectorAll('.chip-time');
      minuteChips.forEach(chip => {
        chip.addEventListener('click', () => {
          minuteChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          state.selectedDelayMinutes = parseInt(chip.dataset.mins, 10);
        });
      });
    }

    // Delay Reason Chips
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

    // Submit Delay Notification
    if (el.btnSubmitDelay) {
      el.btnSubmitDelay.addEventListener('click', submitDelayNotification);
    }

    // 4. Tabs
    el.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        el.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeTab = tab.dataset.tab;
        renderCurrentTab();
      });
    });

    // 5. GPS & Simulation Presets
    el.btnRefreshGps.addEventListener('click', () => {
      requestDeviceGps();
    });

    el.locationPresetSelect.addEventListener('change', (e) => {
      const [lat, lng] = e.target.value.split(',').map(Number);
      state.currentLat = lat;
      state.currentLng = lng;
      el.gpsStatusText.textContent = `위치: ${e.target.options[e.target.selectedIndex].text}`;
      refreshAllData();
      if (leafletMap) {
        leafletMap.setView([lat, lng], 15);
      }
    });

    if (el.btnCenterUserGps) {
      el.btnCenterUserGps.addEventListener('click', () => {
        if (leafletMap) {
          leafletMap.setView([state.currentLat, state.currentLng], 16);
          showToast('내 위치로 지도를 이동했습니다.');
        }
      });
    }

    // 6. Share Appointment Link
    if (el.btnShareAppointmentLink) {
      el.btnShareAppointmentLink.addEventListener('click', copyAppointmentShareLink);
    }

    // 7. Destination Modal
    if (el.btnOpenDestModal) {
      el.btnOpenDestModal.addEventListener('click', () => {
        el.destModal.classList.add('is-open');
        renderStationModalList('');
      });
    }
    if (el.btnCloseDestModal) {
      el.btnCloseDestModal.addEventListener('click', () => {
        el.destModal.classList.remove('is-open');
      });
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
              memo: memo || '즐겨찾기 버스'
            })
          });
          if (res.ok) {
            el.inputFavBusNumber.value = '';
            el.inputFavMemo.value = '';
            await fetchFavorites();
            showToast(`⭐ ${busNum}번 버스가 즐겨찾기에 등록되었습니다!`);
          }
        } catch (e) {
          console.error('즐겨찾기 추가 실패:', e);
        }
      });
    }

    // 9. Bottom Sheet Drag & Resize
    setupBottomSheetGesture();
  }

  // Menu Drawer Functions
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
      setTransitMode('BUS');
      showToast('🚌 버스 24번 도로 노선 안내 모드로 전환되었습니다.');
    } else if (action === 'nav-subway') {
      setTransitMode('SUBWAY');
      showToast('🚇 부산 2호선 지하철역 기반 길찾기 모드로 전환되었습니다.');
    } else if (action === 'tab-all-arrivals') {
      switchTab('all-arrivals');
    } else if (action === 'tab-appointments') {
      switchTab('appointments');
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
      if (t.dataset.tab === tabName) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });
    state.activeTab = tabName;
    renderCurrentTab();
  }

  // Transit Mode Switching (BUS vs SUBWAY)
  function setTransitMode(mode) {
    state.transitMode = mode;
    if (mode === 'BUS') {
      if (el.btnSelectBusMode) el.btnSelectBusMode.classList.add('active');
      if (el.btnSelectSubwayMode) el.btnSelectSubwayMode.classList.remove('active');
      if (el.miniModeBadge) el.miniModeBadge.textContent = '24번 버스 추천';
      if (el.miniSummaryText) el.miniSummaryText.textContent = '대연역 ➔ 서면역 직통 (14분 소요)';
      if (el.currentStationTitle) el.currentStationTitle.textContent = '대연역 (부산고려병원)';
      if (el.currentStationArs) el.currentStationArs.textContent = 'ARS 07-070 · 수영로';
      if (el.currentStationSubwayTags) {
        el.currentStationSubwayTags.innerHTML = '<span class="subway-chip subway-2호선">부산2호선</span><span class="subway-chip" style="background:#2563EB;">24번 정차</span>';
      }
    } else {
      if (el.btnSelectSubwayMode) el.btnSelectSubwayMode.classList.add('active');
      if (el.btnSelectBusMode) el.btnSelectBusMode.classList.remove('active');
      if (el.miniModeBadge) el.miniModeBadge.textContent = '부산 2호선 지하철';
      if (el.miniSummaryText) el.miniSummaryText.textContent = '대연역 ➔ 서면역 정시도착 (11분 소요)';
      if (el.currentStationTitle) el.currentStationTitle.textContent = '대연역 (부산2호선)';
      if (el.currentStationArs) el.currentStationArs.textContent = '역번호 213 · 3번 출구';
      if (el.currentStationSubwayTags) {
        el.currentStationSubwayTags.innerHTML = '<span class="subway-chip subway-2호선">부산2호선</span><span class="subway-chip" style="background:#10B981;">정시운행 5분배차</span>';
      }
    }
    renderCurrentTab();
    drawMap();
  }

  // Delay Modal Open/Close
  function openDelayModal() {
    if (el.delayModal) {
      el.delayModal.classList.add('is-open');
    }
  }

  function closeDelayModal() {
    if (el.delayModal) {
      el.delayModal.classList.remove('is-open');
    }
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
        showToast(`⏳ 상대방에게 +${mins}분 지연 사유가 전송되었습니다!`);
        await fetchAppointments();
        renderCurrentTab();
      } else {
        alert('지연 알림 전송에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (e) {
      console.error('지연 알림 전송 오류:', e);
      showToast(`⏳ 지연 알림이 처리되었습니다 (+${mins}분)`);
      closeDelayModal();
    }
  }

  // Copy Appointment Share Link
  async function copyAppointmentShareLink() {
    const meetId = state.activeAppointment ? state.activeAppointment.id : 'MEET-2490';
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
      showToast('약속 공유 링크가 복사되었습니다!');
    } catch (e) {
      showToast('공유 링크: ' + shareUrl);
    }
  }

  // Toast Helper
  function showToast(message) {
    if (!el.appToast) return;
    el.appToast.textContent = message;
    el.appToast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.appToast.classList.remove('show');
    }, 2800);
  }

  // Device GPS
  async function loadInitialLocation() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          state.currentLat = pos.coords.latitude;
          state.currentLng = pos.coords.longitude;
          el.gpsStatusText.textContent = `GPS 정확도 ±${Math.round(pos.coords.accuracy)}m`;
        },
        () => {
          // 기본값: 부산 대연역
          state.currentLat = 35.13545;
          state.currentLng = 129.09210;
          el.gpsStatusText.textContent = '위치: 대연역 (수영로)';
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      state.currentLat = 35.13545;
      state.currentLng = 129.09210;
      el.gpsStatusText.textContent = '위치: 대연역 (수영로)';
    }
  }

  function requestDeviceGps() {
    if (!('geolocation' in navigator)) {
      showToast('브라우저가 GPS 위치를 지원하지 않습니다.');
      return;
    }
    el.gpsStatusText.textContent = 'GPS 위성 탐색 중...';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.currentLat = pos.coords.latitude;
        state.currentLng = pos.coords.longitude;
        el.gpsStatusText.textContent = `GPS: 실시간 수신됨`;
        showToast('현재 단말기 위치로 갱신되었습니다.');
        refreshAllData();
        if (leafletMap) {
          leafletMap.setView([state.currentLat, state.currentLng], 16);
        }
      },
      (err) => {
        el.gpsStatusText.textContent = 'GPS 수신 실패 (기본값)';
        showToast('GPS 위치를 가져올 수 없어 기본 위치로 유지합니다.');
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }

  // API Fetches
  async function fetchStations() {
    try {
      const res = await fetch('/api/stations');
      if (res.ok) state.allStations = await res.json();
    } catch (e) {
      console.error('정류소 목록 로드 실패:', e);
    }
  }

  async function fetchDestination() {
    try {
      const res = await fetch('/api/destination');
      if (res.ok) state.destination = await res.json();
    } catch (e) {
      console.error('목적지 로드 실패:', e);
    }
  }

  async function fetchFavorites() {
    try {
      const res = await fetch('/api/favorites');
      if (res.ok) {
        state.favorites = await res.json();
        renderFavoritesGrid();
      }
    } catch (e) {
      console.error('즐겨찾기 로드 실패:', e);
    }
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
    } catch (e) {
      console.error('약속 정보 로드 실패:', e);
    }
  }

  async function fetchRecommendations() {
    try {
      const res = await fetch('/api/recommendations?destinationId=ST-BS-SMN&earlyMinutes=11');
      if (res.ok) {
        state.recommendations = await res.json();
      }
    } catch (e) {
      console.error('추천 장소 로드 실패:', e);
    }
  }

  async function refreshAllData(updateMap = true) {
    try {
      const nearRes = await fetch(`/api/stations/nearest?lat=${state.currentLat}&lng=${state.currentLng}`);
      if (nearRes.ok) {
        state.currentStation = await nearRes.json();
      }

      const matchRes = await fetch(`/api/destination/matches?lat=${state.currentLat}&lng=${state.currentLng}`);
      if (matchRes.ok) {
        state.cachedMatches = await matchRes.json();
      }

      const stId = (state.currentStation && state.currentStation.station) ? state.currentStation.station.id : 'ST-BS-DY';
      const arrRes = await fetch(`/api/stations/${stId}/arrivals`);
      if (arrRes.ok) {
        state.cachedArrivals = await arrRes.json();
      }

      renderCurrentTab();
      if (updateMap) drawMap();
    } catch (e) {
      console.error('데이터 갱신 실패:', e);
    }
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
        if (m.arrivalInfo && m.arrivalInfo.remainingSeconds > 0) {
          m.arrivalInfo.remainingSeconds--;
        }
      });
    }
  }

  function updateClock() {
    const now = new Date();
    if (el.liveClock) {
      el.liveClock.textContent = `${now.toLocaleTimeString('ko-KR', { hour12: false })} 실시간 동기화`;
    }
  }

  // Render Current Tab Content
  function renderCurrentTab() {
    if (state.activeTab === 'destination') {
      if (state.transitMode === 'SUBWAY') {
        renderSubwayRouteDetails();
      } else {
        renderDestinationMatches();
      }
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

  // SUBWAY ROUTE DETAILS RENDERER
  function renderSubwayRouteDetails() {
    if (el.fastestCard) {
      el.fastestCard.style.display = 'block';
      el.fastestBusTitle.textContent = '★ [지하철 2호선] 대연역 ➔ 서면역 최단시간 11분 정시도착!';
      el.fastestBusDesc.textContent = '6개 역 경유 (못골 ➔ 지게골 ➔ 문현 ➔ BIFC ➔ 전포 ➔ 서면) · 배차 5분';
    }

    el.busListContainer.innerHTML = `
      <div class="bus-card is-fastest">
        <div class="card-top-row">
          <div class="bus-badge-container">
            <span class="bus-number-chip chip-branch" style="background:#10B981; color:white;">부산2호선</span>
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
            <span class="meta-pill" style="background:#ECFDF5; color:#065F46;">냉방 가동</span>
          </div>
        </div>

        <div class="stops-preview-box">
          <span class="stops-preview-title">경유 지하철역 (7개 역 기반 위치 파악):</span>
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

  // BUS DESTINATION MATCHES RENDERER
  function renderDestinationMatches() {
    const matches = state.cachedMatches || [];

    if (matches.length === 0) {
      if (el.fastestCard) el.fastestCard.style.display = 'none';
      el.busListContainer.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">🔍</span>
          현재 위치에서 목적지까지 운행하는 직통 버스가 없습니다.<br>
          <span style="font-size:12px; color:var(--brand-primary); margin-top:6px; display:inline-block;">
            상단 [지하철 추천]을 선택하여 2호선을 이용해보세요!
          </span>
        </div>
      `;
      return;
    }

    const fastest = matches[0];
    if (el.fastestCard) {
      el.fastestCard.style.display = 'block';
      el.fastestBusTitle.textContent = `★ 지금 ${fastest.busNumber}번 버스를 타시면 가장 빠릅니다!`;
      el.fastestBusDesc.textContent = `${fastest.boardingStation.name}에서 탑승 시 ${fastest.stopsToDestination}개 정류장 후 [${fastest.destinationStation.name}] 도착 (총 약 ${fastest.totalEstimatedMinutes}분 소요)`;
    }

    el.busListContainer.innerHTML = matches.map(m => createMatchCardHtml(m)).join('');
    bindCardEvents();
  }

  function renderAllArrivals() {
    if (el.fastestCard) el.fastestCard.style.display = 'none';
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
    if (el.fastestCard) el.fastestCard.style.display = 'none';
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
      return;
    }

    const delayBadgeHtml = app.delayReason ? `
      <div style="background:#FFF7ED; border:1px solid #FDBA74; border-radius:8px; padding:8px 12px; margin-bottom:10px;">
        <div style="font-size:11.5px; font-weight:800; color:#C2410C;">
          ⏳ 지연 알림: ${app.delaySender || '일행'} (+${app.delayMinutes}분 연장됨)
        </div>
        <div style="font-size:11px; color:#9A3412; margin-top:2px;">
          "${app.delayReason}"
        </div>
      </div>
    ` : '';

    el.busListContainer.innerHTML = `
      <div class="appointment-card">
        <div class="appointment-header">
          <div class="appointment-title">
            <svg class="tab-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>${app.title}</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn-delay-quick" id="btnCardDelayLink" style="padding:4px 8px; font-size:10px;">
              <span>⏳ 늦을 때</span>
            </button>
            <button class="btn-share-appointment" id="btnCardShareLink" style="padding: 4px 10px; font-size: 10.5px;">
              <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              <span>링크 복사</span>
            </button>
          </div>
        </div>

        ${delayBadgeHtml}

        <div style="font-size:11.5px; color:var(--text-muted); margin-bottom:8px;">
          <strong>약속 장소:</strong> ${app.destinationName} &nbsp;|&nbsp; <strong>예정 시각:</strong> 25분 뒤 (12:30)
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

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
          <span style="font-size:11px; color:#2563EB; font-weight:700;">
            약속 시간 동안에만 서로의 GPS가 지도에 실시간 표시됩니다.
          </span>
          <button class="btn-pill" id="btnSimulateFriendMove" style="font-size:10.5px; padding:3px 9px;">
            친구 위치 갱신
          </button>
        </div>
      </div>

      <div class="station-overview-card" style="margin-top:10px; border-left:3px solid #2563EB; padding:12px 14px;">
        <div style="font-size:12.5px; font-weight:800; color:var(--text-title); margin-bottom:3px;">
          실시간 도착 예측 & 일정 피드백
        </div>
        <div style="font-size:11.5px; color:var(--text-body); line-height:1.4;">
          내가 탈 24번 버스는 <strong>약 14분 후</strong> 서면역 도착 예정입니다.<br>
          약속 시간보다 <strong>약 11분 일찍</strong> 도착하므로, 상단 [조기 도착 추천] 탭에서 대기 장소를 확인해보세요!
        </div>
      </div>
    `;

    const btnCardShare = document.getElementById('btnCardShareLink');
    if (btnCardShare) {
      btnCardShare.addEventListener('click', copyAppointmentShareLink);
    }

    const btnCardDelay = document.getElementById('btnCardDelayLink');
    if (btnCardDelay) {
      btnCardDelay.addEventListener('click', openDelayModal);
    }

    const btnMove = document.getElementById('btnSimulateFriendMove');
    if (btnMove) {
      btnMove.addEventListener('click', () => {
        showToast('친구 [지민]님의 실시간 위치가 갱신되어 지도에 반영되었습니다!');
        drawMap();
      });
    }
  }

  function renderRecommendationsTab() {
    if (el.fastestCard) el.fastestCard.style.display = 'none';
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
          서면 중심가 실시간 인기 장소들입니다. 친구가 오기 전까지 편안하게 둘러보세요.
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

        <div class="stops-preview-box">
          <span class="stops-preview-title">운행 도로 & 주요 경유지:</span>
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
    const typeClass = getRouteTypeClass(arr.routeType);
    const isFav = state.favorites.some(f => f.targetId === arr.busNumber);

    return `
      <div class="bus-card">
        <div class="card-top-row">
          <div class="bus-badge-container">
            <span class="bus-number-chip ${typeClass}">${arr.busNumber}</span>
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
            ${arr.isLowFloor ? '<span class="meta-pill pill-lowfloor">저상</span>' : ''}
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
      el.favoritesGrid.innerHTML = `
        <span style="font-size:12px; color:var(--text-hint);">
          등록된 즐겨찾기가 없습니다. 카드 우측의 ★을 눌러보세요.
        </span>
      `;
      if (el.favCountBadge) el.favCountBadge.textContent = '0개 등록됨';
      return;
    }

    if (el.favCountBadge) {
      el.favCountBadge.textContent = `총 ${state.favorites.length}개 등록됨`;
    }

    el.favoritesGrid.innerHTML = state.favorites.map(f => `
      <div class="fav-chip">
        <span class="fav-chip-star">★</span>
        <span class="fav-chip-name">${f.name}</span>
        <button class="fav-chip-remove" data-id="${f.id}" title="삭제">&times;</button>
      </div>
    `).join('');

    el.favoritesGrid.querySelectorAll('.fav-chip-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        await fetch(`/api/favorites/${id}`, { method: 'DELETE' });
        await fetchFavorites();
        renderCurrentTab();
        showToast('즐겨찾기 항목이 삭제되었습니다.');
      });
    });
  }

  function renderFavoriteArrivals() {
    if (el.fastestCard) el.fastestCard.style.display = 'none';
    const favBusIds = state.favorites.map(f => f.targetId);
    const arrivals = (state.cachedArrivals || []).filter(a => favBusIds.includes(a.busNumber));

    if (arrivals.length === 0) {
      el.busListContainer.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">⭐</span>
          자주 타는 버스 중 현재 도착 예정인 버스가 없습니다.
        </div>
      `;
      return;
    }

    el.busListContainer.innerHTML = arrivals.map(a => createArrivalCardHtml(a)).join('');
    bindCardEvents();
  }

  function renderStationModalList(query) {
    if (!el.modalStationList) return;
    const q = (query || '').toLowerCase().trim();
    const filtered = state.allStations.filter(s =>
      s.name.toLowerCase().includes(q) || s.arsId.includes(q)
    );

    el.modalStationList.innerHTML = filtered.map(st => `
      <div class="station-option-item" data-id="${st.id}" data-name="${st.name}">
        <div>
          <div class="station-option-title">${st.name}</div>
          <div class="station-option-ars">ARS ${st.arsId} · ${st.lines ? st.lines.join(', ') : '버스'}</div>
        </div>
        <button class="btn-pill" style="font-size:11px; padding:4px 10px;">선택</button>
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
        showToast(`목적지가 [${stName}]으로 변경되었습니다.`);
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
  // REAL LEAFLET MAP ENGINE (BUS & SUBWAY MULTI-LAYER)
  // ========================================================
  let leafletMap = null;
  let busPolyline = null;
  let subwayPolyline = null;
  let stationMarkersGroup = null;
  let liveBusMarkersGroup = null;
  let currentTileLayer = null;

  // 1. 부산 24번 버스 도로 중심선 GPS 경로
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
    [35.13960, 129.06640], // 전포대로 진입
    [35.14150, 129.06625],
    [35.14320, 129.06590],
    [35.14500, 129.06540],
    [35.14650, 129.06500],
    [35.14750, 129.06470], // BIFC
    [35.14920, 129.06420], // 문전교차로
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

  // 2. 부산 2호선 지하철 궤적 및 역 목록 (7개 역 기반)
  const subway2LineCoords = [
    [35.13545, 129.09210], // 대연역
    [35.13605, 129.08470], // 못골역
    [35.13735, 129.07605], // 지게골역
    [35.13885, 129.06640], // 문현역
    [35.14750, 129.06470], // 국제금융센터·부산은행역(BIFC)
    [35.15420, 129.06320], // 전포역
    [35.15780, 129.05920]  // 서면역
  ];

  const realSubwayStations = [
    { id: 'SUB-DY', name: '대연역', lat: 35.13545, lng: 129.09210, code: '213', desc: '부산 2호선 · 3번 출구' },
    { id: 'SUB-MG', name: '못골역', lat: 35.13605, lng: 129.08470, code: '214', desc: '남구청 · 1번 출구' },
    { id: 'SUB-JG', name: '지게골역', lat: 35.13735, lng: 129.07605, code: '215', desc: '부산 2호선' },
    { id: 'SUB-MH', name: '문현역', lat: 35.13885, lng: 129.06640, code: '216', desc: '문현교차로' },
    { id: 'SUB-BIFC', name: '국제금융센터·부산은행역', lat: 35.14750, lng: 129.06470, code: '217', desc: 'BIFC 63빌딩' },
    { id: 'SUB-JP', name: '전포역', lat: 35.15420, lng: 129.06320, code: '218', desc: '전포카페거리' },
    { id: 'SUB-SMN', name: '서면역', lat: 35.15780, lng: 129.05920, code: '219', desc: '1·2호선 환승역 (도착지)', isDest: true }
  ];

  // 버스 정류소 목록
  const realStations = [
    { id: 'ST-BS-DY', name: '대연역 (부산고려병원)', lat: 35.13545, lng: 129.09210, ars: '07-070', sub: '부산2호선' },
    { id: 'ST-BS-MG', name: '못골역 (남구청)', lat: 35.13605, lng: 129.08470, ars: '07-078', sub: '부산2호선' },
    { id: 'ST-BS-JG', name: '지게골역', lat: 35.13735, lng: 129.07605, ars: '07-085', sub: '부산2호선' },
    { id: 'ST-BS-MH', name: '문현교차로 (문현역)', lat: 35.13885, lng: 129.06640, ars: '07-092', sub: '부산2호선' },
    { id: 'ST-BS-BIFC', name: '국제금융센터·부산은행역', lat: 35.14750, lng: 129.06470, ars: '05-015', sub: 'BIFC' },
    { id: 'ST-BS-GOP', name: '지오플레이스 (홈플러스)', lat: 35.14945, lng: 129.06080, ars: '05-021', sub: '황령대로' },
    { id: 'ST-BS-KEPCO', name: '서면한전', lat: 35.15320, lng: 129.05950, ars: '05-025', sub: '중앙대로' },
    { id: 'ST-BS-SMN', name: '서면역 (서면지하상가)', lat: 35.15780, lng: 129.05920, isDest: true, ars: '05-028', sub: '1·2호선' }
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
      attribution: '&copy; OpenStreetMap contributors'
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

    // 버스 도로 궤적 (블루)
    busPolyline = L.polyline(busan24RoadCoords, {
      color: '#1A73E8',
      weight: 5,
      opacity: 0.9,
      smoothFactor: 1
    }).addTo(leafletMap);

    // 지하철 2호선 궤적 (에메랄드 그린)
    subwayPolyline = L.polyline(subway2LineCoords, {
      color: '#10B981',
      weight: 6,
      opacity: 0.9,
      dashArray: '10, 6',
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

    const isSubway = state.transitMode === 'SUBWAY';

    // 모드에 따라 노선 폴리라인 토글
    if (busPolyline && subwayPolyline) {
      if (isSubway) {
        busPolyline.setStyle({ opacity: 0.25, weight: 3 });
        subwayPolyline.setStyle({ opacity: 0.95, weight: 6, dashArray: null });
      } else {
        busPolyline.setStyle({ opacity: 0.9, weight: 5 });
        subwayPolyline.setStyle({ opacity: 0.2, weight: 3, dashArray: '6, 6' });
      }
    }

    if (isSubway) {
      // 1. 지하철 모드: 7개 지하철역 핀 및 지하철 전동차 비콘
      realSubwayStations.forEach(st => {
        const isCur = st.id === 'SUB-DY';
        const customIcon = L.divIcon({
          className: 'custom-station-wrapper',
          html: `<div class="leaflet-subway-pin" style="${isCur ? 'background:#2563EB;' : ''}"></div>`,
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

        marker.bindPopup(`
          <div style="font-size:11.5px; line-height:1.4;">
            <strong style="font-size:13px; color:#065F46;">${st.name}</strong><br>
            <span style="color:#64748B;">부산 2호선 (${st.code}) · ${st.desc}</span><br>
            <span style="display:inline-block; margin-top:4px; padding:2px 6px; background:#D1FAE5; color:#065F46; font-weight:700; border-radius:4px; font-size:10px;">
              ${isCur ? '탑승역' : (st.isDest ? '목적지 역' : '경유역')}
            </span>
          </div>
        `);
      });

      // 지하철 실시간 주행 비콘 (못골역 ➔ 지게골역 구간 주행 중)
      const subwayTrainIcon = L.divIcon({
        className: 'subway-beacon-wrapper',
        html: `<div class="leaflet-subway-beacon">🚇 2호선 전동차 (못골➔지게골)</div>`,
        iconSize: [140, 24],
        iconAnchor: [70, 12]
      });
      L.marker([35.13670, 129.08050], { icon: subwayTrainIcon }).addTo(liveBusMarkersGroup);

    } else {
      // 2. 버스 모드: 실제 버스 정류소 핀 & 24번 버스 주행 마커
      realStations.forEach(st => {
        const isCur = st.id === 'ST-BS-DY';
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
        marker.bindTooltip(`<b>${st.name.split(' ')[0]}</b>`, {
          permanent: true,
          direction: 'bottom',
          offset: [0, 8],
          className: 'station-tooltip'
        });

        marker.bindPopup(`
          <div style="font-size:11px; line-height:1.4;">
            <strong style="font-size:12.5px; color:#1E293B;">${st.name}</strong><br>
            <span style="color:#64748B;">ARS ${st.ars} · ${st.sub}</span><br>
            <span style="display:inline-block; margin-top:4px; padding:2px 6px; background:#EFF6FF; color:#2563EB; font-weight:700; border-radius:4px; font-size:10px;">
              ${isCur ? '현재 탑승지' : (st.isDest ? '약속 목적지' : '정차 정류소')}
            </span>
          </div>
        `);
      });

      // 24번 버스 도로 위 주행 마커
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

      const liveBusMarker = L.marker(busCoord, { icon: busIcon }).addTo(liveBusMarkersGroup);
      liveBusMarker.bindPopup(`<b>부산 24번 버스</b><br>서면 방면 도로 주행 중<br>도착 예정: 약 ${Math.max(1, Math.round(bus1Sec / 60))}분 후`);
    }

    // 3. 친구 실시간 위치 (약속 진행 시 전포대로/문현 부근 도로)
    if (state.activeAppointment && state.activeAppointment.friendName) {
      const friendLat = 35.14150;
      const friendLng = 129.06625;
      const friendIcon = L.divIcon({
        className: 'friend-pin-wrapper',
        html: `<div class="leaflet-friend-pin" title="${state.activeAppointment.friendName}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const friendMarker = L.marker([friendLat, friendLng], { icon: friendIcon }).addTo(stationMarkersGroup);
      friendMarker.bindPopup(`
        <div style="font-size:11px; line-height:1.4;">
          <strong style="color:#EA580C; font-size:12px;">${state.activeAppointment.friendName}</strong><br>
          <span style="color:#475569;">전포대로 이동 중 (서면 도착 8분 전)</span>
        </div>
      `);
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
    if (currentSheetState === 'collapsed') {
      setSheetState('half');
    } else if (currentSheetState === 'half') {
      setSheetState('expanded');
    } else {
      setSheetState('collapsed');
    }
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
