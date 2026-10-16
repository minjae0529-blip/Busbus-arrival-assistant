// SMART TRANSIT BUS & SUBWAY ASSISTANT CLIENT APPLICATION (v2.5)
document.addEventListener('DOMContentLoaded', () => {

  // Global App State
  const state = {
    currentLat: 35.13545, // 대연역 (수영로)
    currentLng: 129.09210,
    currentStation: null,
    originStation: null, // 동적 탑승역
    destStation: null,   // 동적 도착역
    destination: null,
    activeBusCoords: [],
    activeSubwayCoords: [],
    activeTransitStops: [],
    busDriveDistanceMeters: null, // OSRM 실측 주행 거리 (meters)
    busDriveDurationSecs: null,   // OSRM 실측 주행 시간 (seconds)
    activeTab: 'destination', // 'destination' | 'all-arrivals' | 'appointments' | 'recommendations' | 'favorites'
    transitMode: 'BUS', // 'BUS' | 'SUBWAY'
    selectedSubwayRouteIndex: 0, // 선택된 지하철 경로 인덱스 (0: 직통/최단, 1: 환승대안 1, 2: 환승대안 2)
    showIntermediateStops: false, // 사용자가 노선을 누를 때만 경유 정류소 표시!
    selectedPlaceForNav: null, // 도보 길안내 선택된 장소
    selectedPlaceFilter: 'ALL', // 'ALL' | 'FRIEND' | 'SOLO' | 'PLAY' | 'CAFE' | 'FOOD'
    selectedRegion: 'ALL', // 부산 권역: 'ALL', 'SEOMYEON', 'HAEUNDAE', 'GWANGAN', etc.
    allStations: [],
    favorites: [],
    cachedArrivals: [],
    cachedMatches: [],
    appointments: [],
    activeAppointment: null,
    recommendations: [],
    timerInterval: null,
    selectedDelayMinutes: 10,
    selectedDelayReason: '버스를 눈앞에서 놓쳐서 다음 버스 탑승 중이에요!',
    midpointResult: null,
    selectedMyOriginLat: 35.13550,
    selectedMyOriginLng: 129.09200,
    selectedFriendOriginLat: 35.15780,
    selectedFriendOriginLng: 129.05920
  };

  // DOM Elements
  const el = {
    // Region Selector
    regionChipsContainer: document.getElementById('regionChipsContainer'),
    selectedRegionLabel: document.getElementById('selectedRegionLabel'),

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

    // Transit Route Tab Selectors (대중교통 원클릭 버튼 선택기)
    btnTabBusRoute: document.getElementById('btnTabBusRoute'),
    btnTabSubwayRoute: document.getElementById('btnTabSubwayRoute'),

    // T-Map Navigation
    inputNavOrigin: document.getElementById('inputNavOrigin'),
    originDropdown: document.getElementById('originDropdown'),
    inputNavDest: document.getElementById('inputNavDest'),
    destDropdown: document.getElementById('destDropdown'),
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

    // Midpoint Modal
    midpointModal: document.getElementById('midpointModal'),
    btnCloseMidpointModal: document.getElementById('btnCloseMidpointModal'),
    btnCancelMidpoint: document.getElementById('btnCancelMidpoint'),
    myOriginChips: document.getElementById('myOriginChips'),
    friendOriginChips: document.getElementById('friendOriginChips'),
    btnCalculateMidpoint: document.getElementById('btnCalculateMidpoint'),
    midpointResultCard: document.getElementById('midpointResultCard'),
    midpointStationName: document.getElementById('midpointStationName'),
    midpointMyTime: document.getElementById('midpointMyTime'),
    midpointFriendTime: document.getElementById('midpointFriendTime'),
    midpointDiffTime: document.getElementById('midpointDiffTime'),
    midpointReasonText: document.getElementById('midpointReasonText'),
    midpointPlacesList: document.getElementById('midpointPlacesList'),
    btnApplyMidpointToAppointment: document.getElementById('btnApplyMidpointToAppointment'),

    // Place Navigation Banner
    placeNavigationBanner: document.getElementById('placeNavigationBanner'),
    placeNavTitle: document.getElementById('placeNavTitle'),
    placeNavDistance: document.getElementById('placeNavDistance'),
    placeNavWalkTime: document.getElementById('placeNavWalkTime'),
    placeNavAddress: document.getElementById('placeNavAddress'),
    btnOpenNaverMap: document.getElementById('btnOpenNaverMap'),
    btnOpenKakaoMap: document.getElementById('btnOpenKakaoMap'),
    btnClosePlaceNav: document.getElementById('btnClosePlaceNav'),

    // Naver Place Detail Modal
    naverPlaceDetailModal: document.getElementById('naverPlaceDetailModal'),
    btnCloseNPlaceModal: document.getElementById('btnCloseNPlaceModal'),
    btnShareNPlace: document.getElementById('btnShareNPlace'),
    nplaceModalTitle: document.getElementById('nplaceModalTitle'),
    nplaceModalCategory: document.getElementById('nplaceModalCategory'),
    nplaceModalWalkMinutes: document.getElementById('nplaceModalWalkMinutes'),
    nplaceModalBrandLogo: document.getElementById('nplaceModalBrandLogo'),
    nplaceModalRating: document.getElementById('nplaceModalRating'),
    nplaceModalReviews: document.getElementById('nplaceModalReviews'),
    nplaceModalBadge: document.getElementById('nplaceModalBadge'),
    nplaceModalDesc: document.getElementById('nplaceModalDesc'),
    btnNPlaceCall: document.getElementById('btnNPlaceCall'),
    btnNPlaceNav: document.getElementById('btnNPlaceNav'),
    btnNPlaceAddCourse: document.getElementById('btnNPlaceAddCourse'),
    btnNPlaceFav: document.getElementById('btnNPlaceFav'),
    nplaceModalHeroImg: document.getElementById('nplaceModalHeroImg'),
    nplaceHeroPhotoCount: document.getElementById('nplaceHeroPhotoCount'),
    nplaceSignatureBox: document.getElementById('nplaceSignatureBox'),
    nplaceSignatureName: document.getElementById('nplaceSignatureName'),
    nplaceSignaturePrice: document.getElementById('nplaceSignaturePrice'),
    nplaceSignatureImg: document.getElementById('nplaceSignatureImg'),
    nplaceMenuListContainer: document.getElementById('nplaceMenuListContainer'),
    nplacePhotoGridContainer: document.getElementById('nplacePhotoGridContainer'),
    nplaceAddressText: document.getElementById('nplaceAddressText'),
    btnCopyAddress: document.getElementById('btnCopyAddress'),
    nplaceHoursText: document.getElementById('nplaceHoursText'),
    nplacePhoneText: document.getElementById('nplacePhoneText'),
    nplacePriceRangeText: document.getElementById('nplacePriceRangeText'),
    nplaceWalkText: document.getElementById('nplaceWalkText'),
    nplaceMoodContainer: document.getElementById('nplaceMoodContainer'),
    nplaceNavTabs: document.querySelectorAll('.nplace-tab-btn'),

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
    await fetchStations();
    await fetchDestination();

    // 기본 경로 설정 (대연역 ➔ 서면역)
    state.originStation = ALL_STATIONS_MASTER.find(s => s.id === 'ST-BS-DY') || ALL_STATIONS_MASTER[6];
    state.destStation = ALL_STATIONS_MASTER.find(s => s.id === 'ST-BS-SMN') || ALL_STATIONS_MASTER[12];
    await applyRouteByStations(state.originStation, state.destStation, false);

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
    // 2-A. 길찾기 상단 원클릭 대중교통 탭 버튼 (원하는 대중교통 경로 즉시 선택)
    if (el.btnTabBusRoute) {
      el.btnTabBusRoute.addEventListener('click', () => {
        setTransitMode('BUS');
      });
    }
    if (el.btnTabSubwayRoute) {
      el.btnTabSubwayRoute.addEventListener('click', () => {
        setTransitMode('SUBWAY');
      });
    }

    // 2-D. 기존 옵션 카드 클릭 핸들러
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

    // Origin ⇄ Destination Autocomplete & Swap
    setupStationAutocomplete(el.inputNavOrigin, el.originDropdown, 'origin');
    setupStationAutocomplete(el.inputNavDest, el.destDropdown, 'dest');

    if (el.btnSwapNavPoints) {
      el.btnSwapNavPoints.addEventListener('click', () => {
        if (state.originStation && state.destStation) {
          applyRouteByStations(state.destStation, state.originStation, true);
        } else {
          const temp = el.inputNavOrigin.value;
          el.inputNavOrigin.value = el.inputNavDest.value;
          el.inputNavDest.value = temp;
          showToast('출발지와 도착지가 맞바뀌었습니다.');
        }
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

    // 7-2. Midpoint Modal
    if (el.btnCloseMidpointModal) el.btnCloseMidpointModal.addEventListener('click', closeMidpointModal);
    if (el.btnCancelMidpoint) el.btnCancelMidpoint.addEventListener('click', closeMidpointModal);
    if (el.midpointModal) {
      el.midpointModal.addEventListener('click', (e) => {
        if (e.target === el.midpointModal) closeMidpointModal();
      });
    }
    if (el.myOriginChips) {
      const chips = el.myOriginChips.querySelectorAll('.chip-station');
      chips.forEach(chip => {
        chip.addEventListener('click', () => {
          chips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          state.selectedMyOriginLat = parseFloat(chip.dataset.lat);
          state.selectedMyOriginLng = parseFloat(chip.dataset.lng);
        });
      });
    }
    if (el.friendOriginChips) {
      const chips = el.friendOriginChips.querySelectorAll('.chip-station');
      chips.forEach(chip => {
        chip.addEventListener('click', () => {
          chips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          state.selectedFriendOriginLat = parseFloat(chip.dataset.lat);
          state.selectedFriendOriginLng = parseFloat(chip.dataset.lng);
        });
      });
    }
    if (el.btnCalculateMidpoint) {
      el.btnCalculateMidpoint.addEventListener('click', calculateMidpoint);
    }
    if (el.btnApplyMidpointToAppointment) {
      el.btnApplyMidpointToAppointment.addEventListener('click', applyMidpointToAppointment);
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

    // 10. Region Selector Setup
    setupRegionSelector();

    // 11. Naver Place Detail Modal Event Listeners
    if (el.btnCloseNPlaceModal) {
      el.btnCloseNPlaceModal.addEventListener('click', closeNaverPlaceDetailModal);
    }
    if (el.naverPlaceDetailModal) {
      el.naverPlaceDetailModal.addEventListener('click', (e) => {
        if (e.target === el.naverPlaceDetailModal) closeNaverPlaceDetailModal();
      });
    }
    if (el.btnCopyAddress) {
      el.btnCopyAddress.addEventListener('click', () => {
        if (activeDetailPlace && activeDetailPlace.address) {
          navigator.clipboard.writeText(activeDetailPlace.address);
          showToast(`📋 주소가 복사되었습니다: ${activeDetailPlace.address}`);
        }
      });
    }
    if (el.nplaceNavTabs) {
      el.nplaceNavTabs.forEach(btn => {
        btn.addEventListener('click', () => {
          switchNPlaceTab(btn.dataset.tab);
        });
      });
    }
    if (el.btnNPlaceCall) {
      el.btnNPlaceCall.addEventListener('click', () => {
        if (activeDetailPlace && activeDetailPlace.phone) {
          showToast(`📞 매장 전화: ${activeDetailPlace.phone}`);
        }
      });
    }
    if (el.btnNPlaceNav) {
      el.btnNPlaceNav.addEventListener('click', () => {
        if (activeDetailPlace) {
          closeNaverPlaceDetailModal();
          selectPlaceForNavigation(activeDetailPlace);
        }
      });
    }
    if (el.btnNPlaceAddCourse) {
      el.btnNPlaceAddCourse.addEventListener('click', () => {
        if (activeDetailPlace) {
          addPlaceToCourse(activeDetailPlace);
        }
      });
    }
    if (el.btnNPlaceFav) {
      el.btnNPlaceFav.addEventListener('click', () => {
        if (activeDetailPlace) {
          showToast(`⭐ [${activeDetailPlace.name}] 매장이 즐겨찾기에 저장되었습니다.`);
        }
      });
    }
  }

  /**
   * 부산 12대 권역 선택 바 핸들러
   */
  function setupRegionSelector() {
    if (!el.regionChipsContainer) return;
    const chips = el.regionChipsContainer.querySelectorAll('.region-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const region = chip.dataset.region || 'ALL';
        state.selectedRegion = region;

        if (el.selectedRegionLabel) {
          el.selectedRegionLabel.textContent = chip.textContent.replace(/^[^\w가-힣]+/, '').trim();
        }

        if (region === 'ALL') {
          if (leafletMap) leafletMap.flyTo([35.1550, 129.0750], 12);
          showToast('부산 전역 노선망으로 지도를 이동했습니다.');
          return;
        }

        // 해당 권역의 중심역 찾기
        const centerName = chip.dataset.center;
        const targetSt = ALL_STATIONS_MASTER.find(s => s.name === centerName || s.name.startsWith(centerName))
          || ALL_STATIONS_MASTER.find(s => s.region === region);

        if (targetSt && leafletMap) {
          leafletMap.flyTo([targetSt.lat, targetSt.lng], 15);
          showToast(`📍 [${chip.textContent.trim()}] 권역으로 이동했습니다. (${targetSt.name})`);
          
          // 사용자가 출발지와 다른 곳을 선택한 경우 목적지로 즉시 추천 설정 가능하도록 편의 제공
          if (state.originStation && state.originStation.id !== targetSt.id) {
            applyRouteByStations(state.originStation, targetSt, true);
          }
        }
      });
    });
  }

  /**
   * 사용자가 역을 입력하거나 선택했을 때 전체 대중교통 경로, 지도 폴라인, 마커, 소요시간, 추천 카드를 동적으로 갱신
   */
  async function applyRouteByStations(originSt, destSt, notify = true) {
    if (!originSt || !destSt) return;
    if (originSt.id === destSt.id) {
      showToast('출발지와 도착지가 동일합니다.');
      return;
    }

    state.originStation = originSt;
    state.destStation = destSt;
    state.selectedSubwayRouteIndex = 0;
    state.currentLat = originSt.lat;
    state.currentLng = originSt.lng;

    // 입력창 텍스트 갱신
    if (el.inputNavOrigin) el.inputNavOrigin.value = `${originSt.name} (${originSt.subName || ''})`.trim();
    if (el.inputNavDest) el.inputNavDest.value = `${destSt.name} (${destSt.subName || ''})`.trim();
    if (el.gpsStatusText) el.gpsStatusText.textContent = `${originSt.name} (선택)`;

    // 1. 지하철 궤적 및 경유역 데이터 추출
    const subData = buildDynamicSubwayPath(originSt, destSt);
    state.activeSubwayCoords = subData.coords;
    state.activeTransitStops = extractTransitStopsBetween(originSt, destSt);

    // 2. OSRM 실제 도로 내비게이션 라우팅 (실시간 도로망 굴곡 100% 반영)
    const osrmResult = await fetchOsrmRoute(originSt, destSt);
    if (osrmResult && osrmResult.coords && osrmResult.coords.length > 0) {
      state.activeBusCoords = osrmResult.coords;
      state.busDriveDistanceMeters = osrmResult.distance;
      state.busDriveDurationSecs = osrmResult.duration;
    } else {
      // OSRM 오프라인/지연 시 안전한 간선 직결 폴백 엔진 적용
      state.activeBusCoords = buildDynamicRoadPath(originSt, destSt);
      state.busDriveDistanceMeters = null;
      state.busDriveDurationSecs = null;
    }

    // 폴라인 실시간 좌표 갱신
    if (busPolyline && state.activeBusCoords.length > 0) {
      busPolyline.setLatLngs(state.activeBusCoords);
    }
    if (subwayPolyline && state.activeSubwayCoords.length > 0) {
      subwayPolyline.setLatLngs(state.activeSubwayCoords);
    }

    // 지도 요소(마커, 정류소 핀) 다시 렌더링
    renderRealMapElements();

    // 지도를 경로 전체가 한눈에 보이도록 맞춤 (fitBounds)
    const currentModeCoords = (state.transitMode === 'SUBWAY' && state.activeSubwayCoords.length > 0)
      ? state.activeSubwayCoords
      : state.activeBusCoords;
    if (leafletMap && currentModeCoords && currentModeCoords.length > 0) {
      try {
        leafletMap.fitBounds(currentModeCoords, { padding: [60, 60], maxZoom: 16 });
      } catch (err) { console.warn(err); }
    }

    // 소요 시간 & 추천 버스 계산
    const stopsCount = Math.max(2, Math.abs((destSt.roadIndex || 11) - (originSt.roadIndex || 5)));
    const subwayTime = subData.timeMins;
    const busTime = (state.busDriveDurationSecs != null)
      ? Math.max(5, Math.round((state.busDriveDurationSecs / 60) * 1.35 + 3))
      : Math.max(5, Math.round(stopsCount * 2.5 + 4));

    const busDistanceStr = (state.busDriveDistanceMeters != null)
      ? ` · ${(state.busDriveDistanceMeters / 1000).toFixed(1)}km`
      : '';

    // 추천 버스 번호 결정 (권역별 버스 지능 매칭)
    const recommendedBus = determineRecommendedBus(originSt, destSt);

    // 네비게이션 옵션 카드 갱신
    if (el.btnSelectBusMode) {
      const timeSpan = el.btnSelectBusMode.querySelector('.mode-time');
      const nameStrong = el.btnSelectBusMode.querySelector('.mode-route-name strong');
      if (timeSpan) timeSpan.textContent = `약 ${busTime}분${busDistanceStr}`;
      if (nameStrong) nameStrong.textContent = `${recommendedBus}`;
    }
    if (el.btnSelectSubwayMode) {
      const timeSpan = el.btnSelectSubwayMode.querySelector('.mode-time');
      const nameStrong = el.btnSelectSubwayMode.querySelector('.mode-route-name strong');
      if (timeSpan) timeSpan.textContent = `약 ${subwayTime}분`;
      if (nameStrong) {
        nameStrong.textContent = subData.isTransfer
          ? `환승 1회 (${subData.lineFromName} ➔ ${subData.lineToName})`
          : `직통 (${subData.lineFromName})`;
      }
    }

    // 하단 미니 요약 갱신
    if (el.miniSummaryText) {
      el.miniSummaryText.textContent = `${originSt.name} ➔ ${destSt.name} (${state.transitMode === 'BUS' ? busTime : subwayTime}분 소요${state.transitMode === 'BUS' ? busDistanceStr : ''})`;
    }
    if (el.busStopsToggleText) {
      el.busStopsToggleText.textContent = `환승 0회 · 실제 도로 주행선${busDistanceStr} · 클릭 시 정류소 ${state.activeTransitStops.length}개 노선도 표시`;
    }
    if (el.subwayStopsToggleText) {
      el.subwayStopsToggleText.textContent = subData.isTransfer
        ? `환승 1회 (${subData.transferStation.name} 환승) · 클릭 시 ${subData.stations.length}개 역 표시`
        : `직통 (환승 0회) · 클릭 시 ${subData.stations.length}개 역 표시`;
    }

    // 백엔드 목적지 동기화 & 실시간 BIMS 도착 정보 및 상권 추천 갱신
    try {
      await fetch('/api/destination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId: destSt.id, memo: destSt.name })
      });
      await fetchRecommendations(destSt.id);
      await refreshAllData(false);
    } catch (e) { console.error(e); }

    if (notify) {
      const distInfo = (state.busDriveDistanceMeters != null) ? ` (${(state.busDriveDistanceMeters / 1000).toFixed(1)}km)` : '';
      showToast(`🧭 [${originSt.name}] ➔ [${destSt.name}] 실제 도로 경로${distInfo}가 설정되었습니다.`);
    }
  }

  /**
   * 탑승지 및 목적지 입력창 자동완성 드롭다운 & 키보드 탐색 핸들러
   */
  function setupStationAutocomplete(inputEl, dropdownEl, role) {
    if (!inputEl || !dropdownEl) return;

    function renderDropdown(keyword) {
      const q = (keyword || '').toLowerCase().trim();
      let matched = ALL_STATIONS_MASTER;

      // 권역 필터가 ALL이 아니면 해당 권역 역을 상위에 우선 배치
      if (state.selectedRegion && state.selectedRegion !== 'ALL') {
        const inRegion = ALL_STATIONS_MASTER.filter(s => s.region === state.selectedRegion);
        const outRegion = ALL_STATIONS_MASTER.filter(s => s.region !== state.selectedRegion);
        matched = [...inRegion, ...outRegion];
      }

      if (q) {
        matched = matched.filter(st => {
          if (st.name.toLowerCase().includes(q)) return true;
          if (st.subName && st.subName.toLowerCase().includes(q)) return true;
          if (st.keywords && st.keywords.some(k => k.toLowerCase().includes(q))) return true;
          return false;
        });
      }

      if (matched.length === 0) {
        dropdownEl.innerHTML = `<div style="padding:10px 14px; font-size:12px; color:var(--text-muted);">일치하는 역 또는 정류소가 없습니다.</div>`;
        dropdownEl.style.display = 'block';
        return;
      }

      dropdownEl.innerHTML = matched.slice(0, 8).map(st => {
        let badgeClass = 'badge-line-2';
        let lineBadgeText = '2호선';
        if (st.lines && st.lines.includes('1')) {
          badgeClass = 'badge-line-1';
          lineBadgeText = st.lines.includes('2') ? '1·2호선' : '1호선';
        } else if (st.lines && st.lines.includes('3')) {
          badgeClass = 'badge-line-3';
          lineBadgeText = '3호선';
        } else if (st.lines && st.lines.includes('DONGHAE')) {
          badgeClass = 'badge-line-donghae';
          lineBadgeText = '동해선';
        } else if (st.type === 'BUS') {
          badgeClass = 'subway';
          lineBadgeText = '시내버스';
        }

        return `
          <div class="nav-dropdown-item" data-id="${st.id}">
            <div>
              <div class="item-title">
                <span>${st.name}</span>
                <span class="badge-type ${badgeClass}">${lineBadgeText}</span>
              </div>
              <div class="item-meta">${st.subName || st.lineLabel || ''}</div>
            </div>
            <span style="font-size:11px; color:#2563EB; font-weight:700;">선택</span>
          </div>
        `;
      }).join('');
      dropdownEl.style.display = 'block';

      dropdownEl.querySelectorAll('.nav-dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const sid = item.dataset.id;
          const chosen = ALL_STATIONS_MASTER.find(s => s.id === sid);
          if (chosen) {
            dropdownEl.style.display = 'none';
            if (role === 'origin') {
              applyRouteByStations(chosen, state.destStation);
            } else {
              applyRouteByStations(state.originStation, chosen);
            }
          }
        });
      });
    }

    inputEl.addEventListener('focus', () => {
      renderDropdown(inputEl.value);
    });

    inputEl.addEventListener('input', (e) => {
      renderDropdown(e.target.value);
    });

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = inputEl.value.toLowerCase().trim();
        const found = ALL_STATIONS_MASTER.find(st =>
          st.name.toLowerCase().includes(q) ||
          (st.keywords && st.keywords.some(k => k.toLowerCase().includes(q)))
        );
        dropdownEl.style.display = 'none';
        if (found) {
          if (role === 'origin') applyRouteByStations(found, state.destStation);
          else applyRouteByStations(state.originStation, found);
        } else {
          showToast(`'${inputEl.value}' 역을 찾을 수 없습니다. 목록에서 선택해주세요.`);
        }
      } else if (e.key === 'Escape') {
        dropdownEl.style.display = 'none';
      }
    });

    document.addEventListener('click', (e) => {
      if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
        dropdownEl.style.display = 'none';
      }
    });
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
    } else if (action === 'open-midpoint-modal') {
      openMidpointModal();
    } else if (action === 'tab-appointments-course') {
      switchTab('appointments');
      showToast('🗺️ 오늘의 약속 코스 타임라인입니다.');
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
    drawMap();
  }

  function setTransitMode(mode) {
    state.transitMode = mode;
    const originName = state.originStation ? state.originStation.name : '대연역';
    const destName = state.destStation ? state.destStation.name : '서면역';
    const subData = buildDynamicSubwayPath(state.originStation, state.destStation);
    const subwayTime = Math.max(3, Math.round(subData.stations.length * 2.2));
    const stopsCount = Math.max(1, Math.abs(((state.destStation && state.destStation.roadIndex) || 11) - ((state.originStation && state.originStation.roadIndex) || 5)));
    const busTime = (state.busDriveDurationSecs != null)
      ? Math.max(5, Math.round((state.busDriveDurationSecs / 60) * 1.35 + 3))
      : Math.max(4, Math.round(stopsCount * 2.5 + 3));
    const busDistStr = (state.busDriveDistanceMeters != null)
      ? ` · ${(state.busDriveDistanceMeters / 1000).toFixed(1)}km`
      : '';

    const recommendedBus = determineRecommendedBus(state.originStation, state.destStation);

    if (mode === 'BUS') {
      // 1. 버스 모드 활성화 (지하철 비활성화)
      if (el.btnSelectBusMode) el.btnSelectBusMode.classList.add('active');
      if (el.btnSelectSubwayMode) el.btnSelectSubwayMode.classList.remove('active');
      if (el.btnTabBusRoute) el.btnTabBusRoute.classList.add('active');
      if (el.btnTabSubwayRoute) el.btnTabSubwayRoute.classList.remove('active');

      if (el.miniModeBadge) el.miniModeBadge.textContent = `🚌 ${recommendedBus} 도로 노선`;
      if (el.miniSummaryText) el.miniSummaryText.textContent = `${originName} ➔ ${destName} 버스 (${busTime}분 소요${busDistStr})`;
      showToast(`🚌 OSRM 실제 도로 버스 경로(${recommendedBus})가 지도에 표시됩니다.`);
    } else {
      // 2. 지하철 모드 활성화 (버스 비활성화)
      if (el.btnSelectSubwayMode) el.btnSelectSubwayMode.classList.add('active');
      if (el.btnSelectBusMode) el.btnSelectBusMode.classList.remove('active');
      if (el.btnTabSubwayRoute) el.btnTabSubwayRoute.classList.add('active');
      if (el.btnTabBusRoute) el.btnTabBusRoute.classList.remove('active');

      const subLabel = subData.isTransfer
        ? `🚇 ${subData.lineFromName}➔${subData.lineToName} 환승`
        : `🚇 부산 ${subData.lineFromName}`;
      if (el.miniModeBadge) el.miniModeBadge.textContent = subLabel;
      if (el.miniSummaryText) el.miniSummaryText.textContent = `${originName} ➔ ${destName} 지하철 (${subwayTime}분 소요)`;
      showToast(`${subLabel} 선로 경로가 지도에 표시됩니다.`);
    }
    renderCurrentTab();
    drawMap();

    // 모드 전환 시 해당 대중교통 궤적에 맞춰 지도를 최적 뷰로 자동 맞춤
    if (leafletMap) {
      const coords = (mode === 'SUBWAY' && state.activeSubwayCoords.length > 0)
        ? state.activeSubwayCoords
        : state.activeBusCoords;
      if (coords && coords.length > 0) {
        try { leafletMap.fitBounds(coords, { padding: [60, 60], maxZoom: 16 }); } catch (e) {}
      }
    }
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

  async function fetchRecommendations(destId) {
    try {
      const targetDest = destId || (state.destination && state.destination.stationId) || 'ST-BS-SMN';
      const res = await fetch(`/api/recommendations?destinationId=${encodeURIComponent(targetDest)}&earlyMinutes=15`);
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
      el.liveClock.textContent = `🟢 BIMS 실시간 (${now.toLocaleTimeString('ko-KR', { hour12: false })})`;
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

  // 1. SUBWAY VIEW (직통노선 최우선 상단 추천 + 환승 대안 하단 배치)
  function renderSubwayRouteDetails() {
    const originName = state.originStation ? state.originStation.name : '대연역';
    const destName = state.destStation ? state.destStation.name : '서면역';
    const allRoutes = buildAllSubwayRoutes(state.originStation, state.destStation);
    const selectedIdx = Math.min(state.selectedSubwayRouteIndex || 0, allRoutes.length - 1);
    const currentRoute = allRoutes[selectedIdx] || allRoutes[0];

    // 직통 경로가 존재하는지 확인
    const directRoute = allRoutes.find(r => !r.isTransfer);
    const hasDirect = !!directRoute;

    // 직통이 있으면 직통이 primaryRoute, 없으면 0번(최단환승)이 primaryRoute
    const primaryRoute = hasDirect ? directRoute : allRoutes[0];
    const altRoutes = allRoutes.filter(r => r.routeId !== primaryRoute.routeId);

    // 상단 빠른 요약 카드 갱신
    if (el.fastestCard) {
      el.fastestCard.style.display = 'block';
      const badgeText = currentRoute.isTransfer ? `[환승 ${currentRoute.transfers}회]` : `[⭐ 최우선 직통]`;
      el.fastestBusTitle.textContent = `★ ${badgeText} ${originName} ➔ ${destName} ${currentRoute.timeMins}분 정시도착!`;
      el.fastestBusDesc.textContent = `${currentRoute.title} · ${currentRoute.stations.length - 1}개 역 경유 · 배차 4~6분`;
    }

    // A. 타임라인 생성 헬퍼 함수
    function buildTimelineHtml(route) {
      if (!route.sections || route.sections.length === 0) return '';
      return `
        <div class="subway-transfer-timeline">
          <div style="font-size:11.5px; font-weight:800; color:#1E293B; margin-bottom:8px;">
            🚦 구간별 상세 탑승 & 환승 안내
          </div>
          ${route.sections.map((sec, sIdx) => {
            if (sec.type === 'SUBWAY') {
              let lineBg = '#10B981'; // 2호선
              if (sec.line === '1') lineBg = '#F97316';
              else if (sec.line === '3') lineBg = '#D97706';
              else if (sec.line === 'DONGHAE') lineBg = '#0284C7';

              return `
                <div class="subway-step-row">
                  <div class="subway-step-line-col">
                    <div class="subway-step-node" style="box-shadow: 0 0 0 1.5px ${lineBg}; background:${lineBg};"></div>
                    <div class="subway-step-track" style="background:${lineBg};"></div>
                  </div>
                  <div class="subway-step-content">
                    <div class="subway-step-head">
                      <span class="subway-line-pill" style="background:${lineBg};">${sec.lineName}</span>
                      <span class="subway-step-station-name">${sec.from} 승차</span>
                      <span style="font-size:11px; color:#2563EB; font-weight:700;">약 ${sec.timeMins}분</span>
                    </div>
                    <div class="subway-step-desc">
                      ${sec.to} 방면 이동 (${sec.stations.length - 1}개 역 경유)
                    </div>
                  </div>
                </div>
              `;
            } else if (sec.type === 'TRANSFER') {
              return `
                <div class="subway-transfer-box">
                  <span style="font-size:13px;">🔄</span>
                  <div>
                    <strong>${sec.stationName} 환승 (도보 약 ${sec.walkMins}분)</strong><br>
                    <span style="font-size:10.5px; color:#78350F;">${sec.fromLine} ➔ ${sec.toLine} 환승통로 이용 (빠른 환승 3-2번 칸)</span>
                  </div>
                </div>
              `;
            }
            return '';
          }).join('')}
          <div class="subway-step-row" style="padding-bottom:0;">
            <div class="subway-step-line-col">
              <div class="subway-step-node" style="box-shadow: 0 0 0 1.5px #EF4444; background:#EF4444;"></div>
            </div>
            <div class="subway-step-content">
              <div class="subway-step-head">
                <span class="subway-step-station-name" style="color:#DC2626;">🏁 ${destName} 하차 (목적지 도착)</span>
              </div>
              <div class="subway-step-desc">출구 연결 통로를 통해 도보 이동</div>
            </div>
          </div>
        </div>
      `;
    }

    // B. 경유역 칩 목록 생성
    function buildChipsHtml(stations, transferStation) {
      return stations.map((st, idx) => {
        let cls = 'stop-chip';
        let tag = '';
        const isTransfer = transferStation && (st.id === transferStation.id || st.name === transferStation.name);
        if (idx === 0) { cls += ' current'; tag = '(승차)'; }
        else if (idx === stations.length - 1) { cls += ' is-dest'; tag = '(하차)'; }
        else if (isTransfer) { cls += ' is-transfer'; tag = '(환승)'; }
        const arrow = (idx < stations.length - 1) ? '<span class="stop-arrow">→</span>' : '';
        return `<span class="${cls}">${st.name}${tag}</span>${arrow}`;
      }).join('');
    }

    // C. 1) [최상단 배치] 직통 노선 최우선 추천 카드 (Rank 1)
    const isPrimaryActive = (currentRoute.routeId === primaryRoute.routeId);
    const primaryBadgeColor = primaryRoute.isTransfer ? '#6366F1' : '#10B981';
    const primaryBadgeText = primaryRoute.isTransfer ? '⭐ 최단시간 추천 환승' : '⭐ 최우선 추천 직통';

    const primaryCardHtml = `
      <div class="subway-primary-route-card ${primaryRoute.isTransfer ? 'is-transfer' : ''}" style="${isPrimaryActive ? `border-color:${primaryBadgeColor};` : 'opacity:0.88;'}">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="subway-route-badge ${primaryRoute.isTransfer ? 'transfer' : 'direct'}" style="font-size:11px; padding:3px 8px;">${primaryBadgeText}</span>
            <span style="font-size:11px; color:#15803D; font-weight:800;">환승 ${primaryRoute.transfers}회 · 정시도착 100%</span>
          </div>
          <button class="btn-select-subway-route" data-route-id="${primaryRoute.routeId}" style="background:${isPrimaryActive ? primaryBadgeColor : '#E2E8F0'}; color:${isPrimaryActive ? '#FFF' : '#334155'}; border:none; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:800; cursor:pointer;">
            ${isPrimaryActive ? '✓ 추천 직통 선택됨' : '직통 선택'}
          </button>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
          <div>
            <h3 style="font-size:16.5px; font-weight:800; color:#0F172A; margin:0 0 3px;">${primaryRoute.title}</h3>
            <div style="font-size:12px; color:#64748B;">
              ${originName} ➔ ${destName} 방면 (${primaryRoute.stations.length - 1}개 역 경유)
            </div>
          </div>
          <div style="text-align:right;">
            <span style="font-size:18px; font-weight:900; color:${primaryBadgeColor};">약 ${primaryRoute.timeMins}분</span>
            <div style="font-size:10.5px; color:#64748B;">배차간격 4~6분</div>
          </div>
        </div>

        ${isPrimaryActive ? buildTimelineHtml(primaryRoute) : ''}

        <div class="stops-preview-box" style="margin-top:10px;">
          <span class="stops-preview-title">경유 정차역 (${primaryRoute.stations.length}개 역):</span>
          <div class="stops-chips-row">
            ${buildChipsHtml(primaryRoute.stations, primaryRoute.transferStation)}
          </div>
        </div>
      </div>
    `;

    // D. 2) [하단 배치] 환승해서 가는 대체 경로들 (우선순위를 낮게 잡아서 직통노선 밑으로 배치!)
    let altSectionHtml = '';
    if (altRoutes.length > 0) {
      altSectionHtml = `
        <div class="subway-alt-routes-section">
          <div class="subway-alt-header">
            <span class="subway-alt-title">
              <span>🔄 다른 방법으로 가기 (환승 대안)</span>
              <span class="subway-alt-tag">우선순위 낮음 · 총 ${altRoutes.length}개 대안</span>
            </span>
            <span style="font-size:10.5px; color:#64748B;">클릭하여 지도 및 상세 확인</span>
          </div>

          <div class="subway-alt-cards-list">
            ${altRoutes.map(alt => {
              const isAltSelected = (currentRoute.routeId === alt.routeId);
              return `
                <div class="subway-alt-card ${isAltSelected ? 'selected' : ''}" data-route-id="${alt.routeId}">
                  <div style="flex:1;">
                    <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                      <span class="subway-route-badge ${alt.badgeType || 'transfer'}" style="font-size:9.5px; padding:1.5px 5px;">${alt.badgeText}</span>
                      <strong style="font-size:13px; color:#1E293B;">${alt.title}</strong>
                    </div>
                    <div style="font-size:11px; color:#64748B;">
                      ${alt.transferStation ? `${alt.transferStation.name} 환승 (도보 3분)` : '우회 이동'} · ${alt.stations.length - 1}개 역 경유
                    </div>
                  </div>
                  <div style="text-align:right; margin-left:10px;">
                    <span style="font-size:14px; font-weight:800; color:${isAltSelected ? '#6366F1' : '#475569'};">약 ${alt.timeMins}분</span>
                    <div>
                      <button class="btn-select-subway-route" data-route-id="${alt.routeId}" style="background:${isAltSelected ? '#6366F1' : '#F1F5F9'}; color:${isAltSelected ? '#FFF' : '#475569'}; border:1px solid ${isAltSelected ? '#6366F1' : '#CBD5E1'}; border-radius:5px; padding:2px 8px; font-size:10.5px; font-weight:700; margin-top:2px; cursor:pointer;">
                        ${isAltSelected ? '선택됨' : '이 경로 보기'}
                      </button>
                    </div>
                  </div>
                </div>

                ${isAltSelected ? `
                  <div style="background:#FFFFFF; border:1px solid #C7D2FE; border-radius:10px; padding:10px; margin-top:-4px; margin-bottom:6px;">
                    ${buildTimelineHtml(alt)}
                    <div class="stops-preview-box" style="margin-top:8px;">
                      <span class="stops-preview-title">경유 정차역:</span>
                      <div class="stops-chips-row">
                        ${buildChipsHtml(alt.stations, alt.transferStation)}
                      </div>
                    </div>
                  </div>
                ` : ''}
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    el.busListContainer.innerHTML = `
      <div style="margin-bottom:8px; font-size:12px; font-weight:800; color:#334155; display:flex; justify-content:space-between; align-items:center;">
        <span>🚇 지하철 경로 안내</span>
        <span style="font-size:11px; color:#10B981; font-weight:700;">★ 직통 노선 최우선 추천</span>
      </div>

      ${primaryCardHtml}
      ${altSectionHtml}
    `;

    // E. 경로 선택 이벤트 바인딩
    const selectButtons = el.busListContainer.querySelectorAll('.btn-select-subway-route, .subway-alt-card');
    selectButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rId = parseInt(btn.dataset.routeId, 10);
        if (!isNaN(rId)) {
          const targetIdx = allRoutes.findIndex(r => r.routeId === rId);
          if (targetIdx !== -1) {
            state.selectedSubwayRouteIndex = targetIdx;
            renderSubwayRouteDetails();
            drawMap();
          }
        }
      });
    });
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
      el.fastestBusTitle.textContent = `★ [실시간 BIMS] 지금 ${fastest.busNumber}번 버스를 타시면 가장 빠릅니다!`;
      el.fastestBusDesc.textContent = `${fastest.boardingStation.name}(ARS ${fastest.boardingStation.arsId}) 탑승 시 ${fastest.stopsToDestination}개 정류장 후 [${fastest.destinationStation.name}] 도착 (총 약 ${fastest.totalEstimatedMinutes}분 소요)`;
    }

    el.busListContainer.innerHTML = matches.map(m => createMatchCardHtml(m)).join('');
    bindCardEvents();
  }

  function renderAllArrivals() {
    if (el.fastestCard) el.fastestCard.style.display = 'none';
    const arrivals = state.cachedArrivals || [];
    const stObj = (state.currentStation && state.currentStation.station) ? state.currentStation.station : null;
    const stTitle = stObj ? `${stObj.name} (ARS ${stObj.arsId})` : '대연역 (ARS 07016)';

    if (arrivals.length === 0) {
      el.busListContainer.innerHTML = `<div class="empty-state">도착 예정인 버스 정보가 없습니다.</div>`;
      return;
    }

    const headerBanner = `
      <div style="background:#ECFDF5; border:1px solid #A7F3D0; border-radius:12px; padding:10px 14px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size:12.5px; font-weight:800; color:#065F46;">🟢 부산광역시 BIMS 실시간 버스 도착 연동 중</div>
          <div style="font-size:11px; color:#047857; margin-top:2px;">조회 정류소: <strong>${stTitle}</strong> · 실시간 운행 노선 ${arrivals.length}개</div>
        </div>
        <span style="background:#10B981; color:#fff; font-size:10.5px; font-weight:800; padding:3px 8px; border-radius:999px;">LIVE</span>
      </div>
    `;

    el.busListContainer.innerHTML = headerBanner + arrivals.map(a => createArrivalCardHtml(a)).join('');
    bindCardEvents();
  }

  // 3. APPOINTMENTS TAB (LOCATION SHARING & COURSE PLANNER)
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
      const btnCreate = document.getElementById('btnCreateSampleMeetup');
      if (btnCreate) {
        btnCreate.addEventListener('click', async () => {
          await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: '서면 카페 & 점심 약속',
              destinationId: 'ST-BS-SMN',
              destinationName: '서면역(서면지하상가)',
              inMinutes: 30,
              creatorName: '민재(나)',
              lat: 35.13750,
              lng: 129.10050
            })
          });
          await fetchAppointments();
          renderAppointmentsTab();
          drawMap();
        });
      }
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

    const courses = app.coursePlaces || [];

    const courseTimelineHtml = `
      <div class="course-planner-section" id="coursePlannerSection">
        <div class="course-header-row">
          <span class="course-header-title">
            🗺️ 오늘의 약속 놀거리 코스 (${courses.length}곳)
          </span>
          <div style="display:flex; gap:6px;">
            ${courses.length > 0 ? '<button class="btn-cancel" id="btnClearCourseBtn" style="font-size:10.5px; padding:3px 7px;">비우기</button>' : ''}
            <button class="btn-course-template" id="btnQuickPresetCourse" style="padding:3px 8px; font-size:10.5px;">✨ 추천 풀코스</button>
          </div>
        </div>

        ${courses.length === 0 ? `
          <div style="background:white; border:1px dashed #CBD5E1; border-radius:8px; padding:14px; text-align:center; font-size:12px; color:#64748B;">
            아직 담긴 약속 코스가 없습니다.<br>
            <span style="font-size:11px; color:#7C3AED; font-weight:700;">조기 도착 핫플 탭에서 [+ 코스 담기]를 누르거나 상단 [✨ 추천 풀코스]를 눌러보세요!</span>
          </div>
        ` : `
          <div class="course-timeline-list">
            ${courses.map((p, idx) => {
              const connectorHtml = idx < courses.length - 1 ? `
                <div class="course-between-connector">
                  <span>↓</span>
                  <span>도보 이동 (약 2~4분 소요)</span>
                </div>
              ` : '';

              return `
                <div class="course-step-card" data-name="${p.name}" style="cursor:pointer;" title="클릭 시 지도에서 위치 확인">
                  <span class="course-order-badge">${idx + 1}차</span>
                  <img src="${p.imageUrl}" alt="${p.name}" class="course-step-thumb" onerror="this.src='https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=700&q=80'">
                  <div class="course-step-info">
                    <div class="course-step-name">${p.name}</div>
                    <div class="course-step-meta">
                      <span style="color:#7C3AED; font-weight:700;">${p.category}</span>
                      <span>★ ${p.googleRating}</span>
                      <span>${p.walkMinutes}</span>
                    </div>
                    ${p.signatureMenu ? `<div class="course-step-menu-line">🔥 대표: ${p.signatureMenu}</div>` : ''}
                    ${p.moodTags ? `<div style="font-size:10px; color:#64748B; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.moodTags}</div>` : ''}
                  </div>
                  <button class="btn-remove-course-item" data-name="${p.name}" title="코스에서 제외">&times;</button>
                </div>
                ${connectorHtml}
              `;
            }).join('')}
          </div>
        `}

        <div class="course-actions-bar">
          <button class="btn-course-template" id="btnAddMoreToCourse">+ 핫플 둘러보고 더 담기</button>
          <button class="btn-course-template" id="btnOpenMidpointFromApp" style="background:#FEF3C7; border-color:#FDE68A; color:#92400E;">🧭 나와 친구 중간역 찾기</button>
        </div>
      </div>
    `;

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
          <strong>만남 장소:</strong> <span style="color:#2563EB; font-weight:800;">${app.destinationName}</span> &nbsp;|&nbsp; <strong>예정 시각:</strong> 25분 뒤 (12:30)
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

        ${courseTimelineHtml}

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
          <span style="font-size:11px; color:#2563EB; font-weight:700;">
            약속 시간 동안에만 서로의 GPS와 코스 경로가 지도에 실시간 표시됩니다.
          </span>
        </div>
      </div>
    `;

    const btnCardShare = document.getElementById('btnCardShareLink');
    if (btnCardShare) btnCardShare.addEventListener('click', copyAppointmentShareLink);

    const btnCardDelay = document.getElementById('btnCardDelayLink');
    if (btnCardDelay) btnCardDelay.addEventListener('click', openDelayModal);

    const btnAddMore = document.getElementById('btnAddMoreToCourse');
    if (btnAddMore) btnAddMore.addEventListener('click', () => switchTab('recommendations'));

    const btnOpenMid = document.getElementById('btnOpenMidpointFromApp');
    if (btnOpenMid) btnOpenMid.addEventListener('click', openMidpointModal);

    const btnPreset = document.getElementById('btnQuickPresetCourse');
    if (btnPreset) btnPreset.addEventListener('click', applyPresetCourse);

    const btnClearCourse = document.getElementById('btnClearCourseBtn');
    if (btnClearCourse) btnClearCourse.addEventListener('click', clearCoursePlaces);

    const removeButtons = el.busListContainer.querySelectorAll('.btn-remove-course-item');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const placeName = btn.dataset.name;
        removePlaceFromCourse(placeName);
      });
    });

    const stepCards = el.busListContainer.querySelectorAll('.course-step-card');
    stepCards.forEach(card => {
      card.addEventListener('click', () => {
        const placeName = card.dataset.name;
        const targetPlace = courses.find(p => p.name === placeName);
        if (targetPlace) selectPlaceForNavigation(targetPlace);
      });
    });
  }

  // 4. RECOMMENDATIONS TAB (RICH PHOTOS & COURSE BUILDER & NAVIGATION)
  function renderRecommendationsTab() {
    if (el.fastestCard) el.fastestCard.style.display = 'none';
    const allList = state.recommendations || [];

    if (allList.length === 0) {
      el.busListContainer.innerHTML = `<div class="empty-state">실존 매장 및 상권 API 데이터를 불러오는 중입니다...</div>`;
      return;
    }

    const currentFilter = state.selectedPlaceFilter;
    const filteredList = allList.filter(item => {
      if (currentFilter === 'ALL') return true;
      if (currentFilter === 'OSM') return (item.badge && item.badge.includes('OSM')) || (item.category && item.category.includes('OSM'));
      if (currentFilter === 'FRIEND') return item.theme === 'FRIEND' || item.theme === 'ALL' || (item.moodTags && item.moodTags.includes('데이트'));
      if (currentFilter === 'SOLO') return item.theme === 'SOLO' || item.theme === 'ALL' || (item.moodTags && item.moodTags.includes('혼밥'));
      if (currentFilter === 'PLAY') return item.category.includes('놀거리') || item.category.includes('소품') || item.theme === 'PLAY';
      if (currentFilter === 'CAFE') return item.category.includes('카페') || item.category.includes('디저트') || item.category.includes('베이커리') || item.theme === 'CAFE';
      if (currentFilter === 'JAPANESE') return item.category.includes('일식') || item.category.includes('라멘') || item.category.includes('돈카츠') || item.category.includes('소바');
      if (currentFilter === 'MEAT') return item.category.includes('고기') || item.category.includes('삼겹살') || item.category.includes('갈비') || item.category.includes('불고기') || item.category.includes('곱창');
      if (currentFilter === 'WESTERN') return item.category.includes('피자') || item.category.includes('파스타') || item.category.includes('버거') || item.category.includes('양식');
      if (currentFilter === 'KOREAN') return item.category.includes('한식') || item.category.includes('국밥') || item.category.includes('밀면') || item.category.includes('낙곱새') || item.category.includes('만두') || item.category.includes('떡볶이');
      if (currentFilter === 'FOOD') return item.category.includes('음식점') || item.theme === 'FOOD';
      return true;
    });

    const currentCourseNames = (state.activeAppointment?.coursePlaces || []).map(c => c.name);
    const osmCount = allList.filter(item => (item.badge && item.badge.includes('OSM')) || (item.category && item.category.includes('OSM'))).length;

    el.busListContainer.innerHTML = `
      <div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:12px; padding:12px 14px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:800; font-size:13.5px; color:#1E40AF; margin-bottom:2px;">
              🟢 네이버 실시간 플레이스 인기 맛집 & 상세 메뉴판 (${filteredList.length}곳)
            </div>
            <div style="font-size:11.5px; color:#1E3A8A;">
              실제 상호, 대표 메뉴판 & 가격, 분위기 태그, 영업시간 정보를 실시간 제공합니다.
            </div>
          </div>
        </div>
        <div style="margin-top:8px;">
          <button class="btn-course-template" id="btnPresetFromRec" style="width:100%; font-size:11.5px; padding:6px 12px;">
            ✨ 인기 1~3차 놀거리 풀코스 바로 담기 (맛집 ➔ 카페 ➔ 보드게임)
          </button>
        </div>
      </div>

      <!-- THEME FILTER CHIPS ROW -->
      <div class="place-filter-chips-row" style="display:flex; flex-wrap:nowrap; overflow-x:auto; gap:6px; padding-bottom:6px; margin-bottom:10px;">
        <button class="btn-filter-tag ${currentFilter === 'ALL' ? 'active' : ''}" data-filter="ALL">🌟 전체 (${allList.length})</button>
        <button class="btn-filter-tag ${currentFilter === 'JAPANESE' ? 'active' : ''}" data-filter="JAPANESE">🍜 일식/라멘</button>
        <button class="btn-filter-tag ${currentFilter === 'MEAT' ? 'active' : ''}" data-filter="MEAT">🥩 고기구이</button>
        <button class="btn-filter-tag ${currentFilter === 'WESTERN' ? 'active' : ''}" data-filter="WESTERN">🍕 양식/피자</button>
        <button class="btn-filter-tag ${currentFilter === 'KOREAN' ? 'active' : ''}" data-filter="KOREAN">🍚 한식/국밥</button>
        <button class="btn-filter-tag ${currentFilter === 'CAFE' ? 'active' : ''}" data-filter="CAFE">☕ 카페/디저트</button>
        <button class="btn-filter-tag ${currentFilter === 'PLAY' ? 'active' : ''}" data-filter="PLAY">🎲 놀거리/체험</button>
        <button class="btn-filter-tag ${currentFilter === 'SOLO' ? 'active' : ''}" data-filter="SOLO">🧘 혼밥/혼자</button>
        <button class="btn-filter-tag ${currentFilter === 'FRIEND' ? 'active' : ''}" data-filter="FRIEND">👥 친구/데이트</button>
        <button class="btn-filter-tag ${currentFilter === 'OSM' ? 'active' : ''}" data-filter="OSM">🟢 실시간 OSM (${osmCount})</button>
      </div>

      <!-- PLACES GRID (네이버 지도 스타일 검색결과 카드) -->
      <div class="places-grid-container">
        ${filteredList.map((item, idx) => {
          const distKm = (item.latitude && item.longitude)
            ? calculateDistanceKm(state.currentLat, state.currentLng, item.latitude, item.longitude)
            : 0.5;
          const distText = distKm >= 1 ? `${distKm.toFixed(1)}km` : `${Math.round(distKm * 1000)}m`;
          const walkMins = Math.max(1, Math.round((distKm * 1000) / 67));
          const isAdded = currentCourseNames.includes(item.name);
          const shortBrand = (item.name || '').replace(/[\s\(\)\[\]점본점]/g, '').slice(0, 2) || '맛집';

          const menuHtml = (item.menuList && item.menuList.length > 0) ? `
            <div class="place-menu-board">
              <div style="font-size:11px; font-weight:800; color:#334155; margin-bottom:5px; display:flex; justify-content:space-between; align-items:center;">
                <span style="display:flex; align-items:center; gap:4px;">
                  <span style="color:#03C75A; font-weight:900;">N</span> 대표 메뉴판 & 실시간 가격
                </span>
                <span style="color:#2563EB; font-weight:700;">1인 ${item.priceRange || '1~2만원대'}</span>
              </div>
              <div class="place-menu-items">
                ${item.menuList.slice(0, 3).map(m => `<span class="place-menu-item-pill">${m}</span>`).join('')}
              </div>
            </div>
          ` : '';

          const moodHtml = item.moodTags ? `
            <div class="place-mood-row">
              ${item.moodTags.split(' ').slice(0, 4).map(tag => `<span class="place-mood-chip">${tag}</span>`).join('')}
            </div>
          ` : '';

          return `
            <div class="place-card-v2" data-name="${item.name}" style="cursor:pointer; padding:14px 16px; border:1px solid #E2E8F0; border-radius:14px; background:#FFFFFF; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
              <div class="place-card-header-flex">
                <div class="place-card-main-info">
                  <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    <div class="nplace-brand-logo-plate" style="width:32px; height:32px; font-size:12px; border-radius:8px; flex-shrink:0;">${shortBrand}</div>
                    <h3 style="font-size:15.5px; font-weight:800; color:#0F172A; margin:0;">${idx + 1}. ${item.name}</h3>
                    <span class="nplace-auth-pill" style="font-size:9.5px; padding:1px 5px;">N PLACE</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
                    <span style="font-size:11.5px; color:#64748B; font-weight:600;">${item.category}</span>
                    <span style="font-size:11px; color:#CBD5E1;">·</span>
                    <span style="font-size:11.5px; color:#2563EB; font-weight:700;">📍 ${distText} (도보 ${walkMins}분)</span>
                  </div>
                  <div style="margin-top:5px;">
                    <span class="place-badge-tag" style="white-space:nowrap; font-size:10px;">${item.badge}</span>
                  </div>
                </div>
                <div class="place-card-thumb-wrap">
                  <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200'}" alt="${item.name}" class="place-card-thumb-img" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200'" />
                  <span class="place-card-thumb-badge">★ ${item.googleRating}</span>
                </div>
              </div>

              ${item.signatureMenu ? `
                <div style="margin-top:8px;">
                  <span class="place-signature-badge" style="font-size:11px; padding:3px 8px;">🔥 시그니처: ${item.signatureMenu}</span>
                </div>
              ` : ''}

              <p style="font-size:12px; color:#475569; margin:6px 0 8px; line-height:1.4;">${item.description}</p>

              ${menuHtml}
              ${moodHtml}

              <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #F1F5F9; padding-top:10px; margin-top:8px;">
                <div style="font-size:12px;">
                  <span style="color:#D97706; font-weight:800;">★ ${item.googleRating}</span>
                  <span style="color:#64748B; margin-left:4px;">리뷰 ${(item.reviewCount || 1000).toLocaleString()}건</span>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                  <button class="btn-open-nplace-modal" data-name="${item.name}" style="background:#03C75A; color:#FFFFFF; border:none; padding:6px 11px; font-size:11.5px; font-weight:800; border-radius:6px; cursor:pointer;">
                    📋 메뉴·가격 보기
                  </button>
                  <button class="btn-add-course ${isAdded ? 'added' : ''}" data-name="${item.name}" style="padding:6px 10px; font-size:11.5px;">
                    ${isAdded ? '✓ 코스 담김' : '+ 코스 담기'}
                  </button>
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

    const btnPresetTop = document.getElementById('btnPresetFromRec');
    if (btnPresetTop) {
      btnPresetTop.addEventListener('click', applyPresetCourse);
    }

    // Place Cards & Open Detail Modal Event (네이버 지도 상세 뷰 팝업)
    const placeCards = el.busListContainer.querySelectorAll('.place-card-v2');
    placeCards.forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-add-course')) return; // ignore click on course button
        const placeName = card.dataset.name;
        const targetPlace = allList.find(p => p.name === placeName);
        if (targetPlace) {
          openNaverPlaceDetailModal(targetPlace);
        }
      });
    });

    const openModalBtns = el.busListContainer.querySelectorAll('.btn-open-nplace-modal');
    openModalBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const placeName = btn.dataset.name;
        const targetPlace = allList.find(p => p.name === placeName);
        if (targetPlace) {
          openNaverPlaceDetailModal(targetPlace);
        }
      });
    });

    // Add Course Buttons
    const addCourseBtns = el.busListContainer.querySelectorAll('.btn-add-course');
    addCourseBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const placeName = btn.dataset.name;
        const targetPlace = allList.find(p => p.name === placeName);
        if (targetPlace) addPlaceToCourse(targetPlace);
      });
    });
  }

  // ========================================================
  // NAVER PLACE PHOTO & MENU THUMBNAIL ENGINE
  // ========================================================
  const FOOD_PHOTO_LIBRARY = {
    // 면 요리 / 라멘 / 소바
    ramen: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=80',
    mazesoba: 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=400&auto=format&fit=crop&q=80',
    gyoza: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&auto=format&fit=crop&q=80',
    noodle: 'https://images.unsplash.com/photo-1618841557871-b4664fbf0cb3?w=400&auto=format&fit=crop&q=80',
    milmyeon: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=400&auto=format&fit=crop&q=80',

    // 피자 / 파스타 / 양식
    pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80',
    pasta: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281729?w=400&auto=format&fit=crop&q=80',
    steak: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80',
    salad: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&auto=format&fit=crop&q=80',

    // 고기구이 / 바베큐 / 갈비
    bbq: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80',
    porkbelly: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&auto=format&fit=crop&q=80',
    beef: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&auto=format&fit=crop&q=80',
    stew: 'https://images.unsplash.com/photo-1547928576-a4a33237cbc3?w=400&auto=format&fit=crop&q=80',

    // 돈카츠 / 카레 / 일식튀김
    tonkatsu: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&auto=format&fit=crop&q=80',
    curry: 'https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=400&auto=format&fit=crop&q=80',
    tempura: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=400&auto=format&fit=crop&q=80',

    // 스시 / 초밥 / 회
    sushi: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&auto=format&fit=crop&q=80',
    sashimi: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=400&auto=format&fit=crop&q=80',
    salmon: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&auto=format&fit=crop&q=80',

    // 국밥 / 한식 / 찌개
    gukbap: 'https://images.unsplash.com/photo-1547928576-a4a33237cbc3?w=400&auto=format&fit=crop&q=80',
    rice: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400&auto=format&fit=crop&q=80',

    // 카페 / 베이커리 / 디저트
    coffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&auto=format&fit=crop&q=80',
    latte: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&auto=format&fit=crop&q=80',
    cake: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&auto=format&fit=crop&q=80',
    croissant: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80',
    tea: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&auto=format&fit=crop&q=80',
    ade: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&auto=format&fit=crop&q=80',

    // 버거 / 치킨 / 펍
    burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80',
    chicken: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&auto=format&fit=crop&q=80',
    beer: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&auto=format&fit=crop&q=80',
    fries: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&auto=format&fit=crop&q=80'
  };

  function getMenuPhotoUrl(menuName, place) {
    if (!menuName) return (place && place.imageUrl) || FOOD_PHOTO_LIBRARY.ramen;
    const n = menuName.toLowerCase();

    // 1. 피자류
    if (n.includes('피자') || n.includes('크러스트')) return FOOD_PHOTO_LIBRARY.pizza;
    if (n.includes('스파게티') || n.includes('파스타')) return FOOD_PHOTO_LIBRARY.pasta;

    // 2. 라멘 / 소바 / 면류
    if (n.includes('마제') || n.includes('아부라')) return FOOD_PHOTO_LIBRARY.mazesoba;
    if (n.includes('라멘') || n.includes('이에케') || n.includes('돈코츠')) return FOOD_PHOTO_LIBRARY.ramen;
    if (n.includes('만두') || n.includes('교자')) return FOOD_PHOTO_LIBRARY.gyoza;
    if (n.includes('밀면') || n.includes('냉면')) return FOOD_PHOTO_LIBRARY.milmyeon;
    if (n.includes('우동') || n.includes('소바') || n.includes('국수')) return FOOD_PHOTO_LIBRARY.noodle;

    // 3. 고기 / 삼겹 / 소고기
    if (n.includes('삼겹') || n.includes('목살') || n.includes('소금구이') || n.includes('항정')) return FOOD_PHOTO_LIBRARY.porkbelly;
    if (n.includes('한우') || n.includes('갈비') || n.includes('스테이크') || n.includes('등심')) return FOOD_PHOTO_LIBRARY.beef;
    if (n.includes('찌개') || n.includes('탕') || n.includes('전골')) return FOOD_PHOTO_LIBRARY.stew;

    // 4. 돈카츠 / 카레 / 텐동
    if (n.includes('카츠') || n.includes('돈까스') || n.includes('로스') || n.includes('히레')) return FOOD_PHOTO_LIBRARY.tonkatsu;
    if (n.includes('카레')) return FOOD_PHOTO_LIBRARY.curry;
    if (n.includes('텐동') || n.includes('튀김') || n.includes('에비')) return FOOD_PHOTO_LIBRARY.tempura;

    // 5. 스시 / 초밥 / 회
    if (n.includes('스시') || n.includes('초밥') || n.includes('오마카세')) return FOOD_PHOTO_LIBRARY.sushi;
    if (n.includes('사시미') || n.includes('회') || n.includes('숙성회')) return FOOD_PHOTO_LIBRARY.sashimi;
    if (n.includes('연어') || n.includes('사케동')) return FOOD_PHOTO_LIBRARY.salmon;

    // 6. 국밥 / 한식 / 밥
    if (n.includes('국밥') || n.includes('수육') || n.includes('순대')) return FOOD_PHOTO_LIBRARY.gukbap;
    if (n.includes('볶음밥') || n.includes('덮밥') || n.includes('비빔밥')) return FOOD_PHOTO_LIBRARY.rice;

    // 7. 카페 / 베이커리 / 음료
    if (n.includes('커피') || n.includes('아메리카노') || n.includes('에스프레소') || n.includes('드립') || n.includes('콜드브루')) return FOOD_PHOTO_LIBRARY.coffee;
    if (n.includes('라떼') || n.includes('카푸치노') || n.includes('플랫화이트')) return FOOD_PHOTO_LIBRARY.latte;
    if (n.includes('케이크') || n.includes('타르트') || n.includes('티라미수') || n.includes('판나코타')) return FOOD_PHOTO_LIBRARY.cake;
    if (n.includes('크루아상') || n.includes('베이글') || n.includes('소금빵') || n.includes('페이스트리') || n.includes('빵')) return FOOD_PHOTO_LIBRARY.croissant;
    if (n.includes('에이드') || n.includes('주스') || n.includes('스무디') || n.includes('탄산')) return FOOD_PHOTO_LIBRARY.ade;
    if (n.includes('티') || n.includes('차') || n.includes('밀크티')) return FOOD_PHOTO_LIBRARY.tea;

    // 8. 펍 / 버거 / 패스트푸드
    if (n.includes('버거')) return FOOD_PHOTO_LIBRARY.burger;
    if (n.includes('치킨') || n.includes('가라아게') || n.includes('윙')) return FOOD_PHOTO_LIBRARY.chicken;
    if (n.includes('맥주') || n.includes('하이볼') || n.includes('칵테일') || n.includes('와인')) return FOOD_PHOTO_LIBRARY.beer;
    if (n.includes('감자') || n.includes('프라이')) return FOOD_PHOTO_LIBRARY.fries;

    // 9. 매장 대표 이미지 또는 기본값
    if (place && place.imageUrl) return place.imageUrl;
    return FOOD_PHOTO_LIBRARY.ramen;
  }

  function getPlacePhotoGallery(place) {
    const photos = [];
    const mainImg = place.imageUrl || FOOD_PHOTO_LIBRARY.ramen;
    photos.push({ url: mainImg, label: '대표 시그니처 컷' });

    // 각 메뉴별 사진 추가
    if (place.menuList && place.menuList.length > 0) {
      place.menuList.forEach(m => {
        const match = m.match(/^(.*?)\s*\((.*?)\)$/);
        const mName = match ? match[1].trim() : m;
        const photoUrl = getMenuPhotoUrl(mName, place);
        if (!photos.some(p => p.url === photoUrl)) {
          photos.push({ url: photoUrl, label: mName });
        }
      });
    }

    // 추가 분위기/매장 인테리어 사진 보충 (최소 6~9장 구성)
    const backupPhotos = [
      { url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=80', label: '매장 실내 분위기' },
      { url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop&q=80', label: '테이블 & 좌석 뷰' },
      { url: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=500&auto=format&fit=crop&q=80', label: '주방 & 오픈 조리' },
      { url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80', label: '정갈한 한 상 차림' }
    ];

    backupPhotos.forEach(bp => {
      if (photos.length < 9 && !photos.some(p => p.url === bp.url)) {
        photos.push(bp);
      }
    });

    return photos;
  }

  // ========================================================
  // NAVER PLACE DETAIL MODAL CONTROLLER
  // ========================================================
  let activeDetailPlace = null;

  function openNaverPlaceDetailModal(place) {
    if (!place || !el.naverPlaceDetailModal) return;
    activeDetailPlace = place;

    // 0. 매장 대표 사진 히어로 배너 (와이드 포토 뷰)
    const heroImg = place.imageUrl || FOOD_PHOTO_LIBRARY.ramen;
    if (el.nplaceModalHeroImg) {
      el.nplaceModalHeroImg.src = heroImg;
    }

    // 1. 상표 로고 플레이트
    const shortBrand = (place.name || '').replace(/[\s\(\)\[\]점본점]/g, '').slice(0, 2) || '맛집';
    if (el.nplaceModalBrandLogo) {
      el.nplaceModalBrandLogo.textContent = shortBrand;
    }

    if (el.nplaceModalTitle) el.nplaceModalTitle.textContent = place.name;
    if (el.nplaceModalCategory) el.nplaceModalCategory.textContent = place.category || '음식점';
    if (el.nplaceModalWalkMinutes) el.nplaceModalWalkMinutes.textContent = `목적지 ${place.walkMinutes || '도보 3분'}`;
    if (el.nplaceModalRating) el.nplaceModalRating.textContent = place.googleRating || '4.8';
    if (el.nplaceModalReviews) el.nplaceModalReviews.textContent = (place.reviewCount || 1200).toLocaleString();
    if (el.nplaceModalBadge) el.nplaceModalBadge.textContent = place.badge || 'N PLACE 공식등록';
    if (el.nplaceModalDesc) el.nplaceModalDesc.textContent = place.description || '네이버 플레이스 등록 매장';

    // 2. 시그니처 메뉴 및 사진
    if (place.signatureMenu) {
      if (el.nplaceSignatureBox) el.nplaceSignatureBox.style.display = 'flex';
      if (el.nplaceSignatureName) el.nplaceSignatureName.textContent = place.signatureMenu;
      if (el.nplaceSignaturePrice) el.nplaceSignaturePrice.textContent = place.priceRange || '시그니처 대표 메뉴';
      if (el.nplaceSignatureImg) {
        el.nplaceSignatureImg.src = getMenuPhotoUrl(place.signatureMenu, place);
      }
    } else {
      if (el.nplaceSignatureBox) el.nplaceSignatureBox.style.display = 'none';
    }

    // 3. 메뉴 목록 렌더링 (각 메뉴별 실물 음식 사진 썸네일 탑재)
    const menus = place.menuList || [];
    if (el.nplaceMenuListContainer) {
      if (menus.length > 0) {
        el.nplaceMenuListContainer.innerHTML = menus.map(m => {
          const match = m.match(/^(.*?)\s*\((.*?)\)$/);
          const mName = match ? match[1].trim() : m;
          const mPrice = match ? match[2].trim() : (place.priceRange || '10,000원~');
          const isSig = place.signatureMenu && place.signatureMenu.includes(mName);
          const menuPhotoUrl = getMenuPhotoUrl(mName, place);

          return `
            <div class="nplace-menu-item-row">
              <div class="nplace-menu-left">
                <div class="nplace-menu-name-row">
                  <span class="nplace-menu-name">${mName}</span>
                  ${isSig ? '<span class="nplace-menu-sig-badge">대표</span>' : ''}
                </div>
                <div class="nplace-menu-desc">${place.name} 인기 추천 메뉴</div>
                <div class="nplace-menu-price">${mPrice}</div>
              </div>
              <div class="nplace-menu-thumb-wrap">
                <img src="${menuPhotoUrl}" alt="${mName}" class="nplace-menu-thumb-img" onerror="this.onerror=null;this.src='${heroImg}'" />
              </div>
            </div>
          `;
        }).join('');
      } else {
        el.nplaceMenuListContainer.innerHTML = `
          <div style="padding:16px; text-align:center; color:#64748B; font-size:12px;">
            대표 1인 예산: ${place.priceRange || '1~2만원대'}<br>
            상세 메뉴 및 가격은 매장 방문 시 확인 가능합니다.
          </div>
        `;
      }
    }

    // 4. 사진 탭 갤러리 렌더링
    const galleryPhotos = getPlacePhotoGallery(place);
    if (el.nplaceHeroPhotoCount) {
      el.nplaceHeroPhotoCount.textContent = `사진 ${galleryPhotos.length}장+`;
    }
    if (el.nplacePhotoGridContainer) {
      el.nplacePhotoGridContainer.innerHTML = galleryPhotos.map((p, idx) => `
        <div class="nplace-photo-card" data-idx="${idx}" title="${p.label}">
          <img src="${p.url}" alt="${p.label}" loading="lazy" onerror="this.onerror=null;this.src='${heroImg}'" />
          <div class="nplace-photo-card-label">${p.label}</div>
        </div>
      `).join('');
    }

    // 5. 정보 탭
    if (el.nplaceAddressText) el.nplaceAddressText.textContent = place.address || '부산시내';
    if (el.nplaceHoursText) el.nplaceHoursText.textContent = place.businessHours || '11:00 ~ 21:30';
    if (el.nplacePhoneText) el.nplacePhoneText.textContent = place.phone || '051-808-1662 (매장 문의)';
    if (el.nplacePriceRangeText) el.nplacePriceRangeText.textContent = place.priceRange || '1~2만원대 (1인 기준)';
    if (el.nplaceWalkText) el.nplaceWalkText.textContent = `목적지 역 기준 ${place.walkMinutes || '도보 3분'}`;

    // 6. 분위기 태그
    if (el.nplaceMoodContainer) {
      const tags = (place.moodTags || '#맛집 #추천').split(' ').filter(Boolean);
      el.nplaceMoodContainer.innerHTML = tags.map(t => `<span class="nplace-mood-pill">${t}</span>`).join('');
    }

    // 코스 담기 버튼 상태 동기화
    if (el.btnNPlaceAddCourse) {
      const currentCourseNames = (state.activeAppointment?.coursePlaces || []).map(c => c.name);
      const isAdded = currentCourseNames.includes(place.name);
      el.btnNPlaceAddCourse.textContent = isAdded ? '✓ 코스 담김' : '+ 코스 담기';
    }

    // 기본 탭을 'menu'로 전환
    switchNPlaceTab('menu');

    el.naverPlaceDetailModal.classList.add('is-open');
  }

  function closeNaverPlaceDetailModal() {
    if (el.naverPlaceDetailModal) {
      el.naverPlaceDetailModal.classList.remove('is-open');
    }
  }

  function switchNPlaceTab(tabName) {
    if (el.nplaceNavTabs) {
      el.nplaceNavTabs.forEach(btn => {
        if (btn.dataset.tab === tabName) btn.classList.add('active');
        else btn.classList.remove('active');
      });
    }
    const tabMenu = document.getElementById('nplaceTabMenu');
    const tabPhoto = document.getElementById('nplaceTabPhoto');
    const tabInfo = document.getElementById('nplaceTabInfo');
    const tabMood = document.getElementById('nplaceTabMood');
    if (tabMenu) tabMenu.style.display = (tabName === 'menu') ? 'block' : 'none';
    if (tabPhoto) tabPhoto.style.display = (tabName === 'photo') ? 'block' : 'none';
    if (tabInfo) tabInfo.style.display = (tabName === 'info') ? 'block' : 'none';
    if (tabMood) tabMood.style.display = (tabName === 'mood') ? 'block' : 'none';
  }

  // COURSE & MIDPOINT HELPER FUNCTIONS
  async function addPlaceToCourse(place) {
    if (!state.activeAppointment) {
      showToast('활성화된 약속이 없습니다.');
      return;
    }
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addCourse',
          id: state.activeAppointment.id,
          place: place
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🎉 "${place.name}"이(가) 약속 코스에 추가되었습니다!`);
        await fetchAppointments();
        renderCurrentTab();
        drawMap();
      } else {
        showToast('이미 코스에 등록된 장소입니다.');
      }
    } catch (e) {
      console.error(e);
      showToast('코스 추가 중 오류가 발생했습니다.');
    }
  }

  async function removePlaceFromCourse(placeName) {
    if (!state.activeAppointment) return;
    try {
      await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'removeCourse',
          id: state.activeAppointment.id,
          placeName: placeName
        })
      });
      showToast(`코스에서 삭제되었습니다.`);
      await fetchAppointments();
      renderCurrentTab();
      drawMap();
    } catch (e) {
      console.error(e);
    }
  }

  async function clearCoursePlaces() {
    if (!state.activeAppointment) return;
    try {
      await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clearCourse',
          id: state.activeAppointment.id
        })
      });
      showToast('약속 코스가 초기화되었습니다.');
      await fetchAppointments();
      renderCurrentTab();
      drawMap();
    } catch (e) {
      console.error(e);
    }
  }

  async function applyPresetCourse() {
    if (!state.activeAppointment) return;
    const all = state.recommendations || [];
    const p1 = all.find(p => p.name.includes('칸다소바')) || all[0];
    const p2 = all.find(p => p.name.includes('블랙업')) || all[1];
    const p3 = all.find(p => p.name.includes('레드버튼')) || all[2];

    const toAdd = [p1, p2, p3].filter(Boolean);
    for (const p of toAdd) {
      await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addCourse',
          id: state.activeAppointment.id,
          place: p
        })
      });
    }
    await fetchAppointments();
    renderCurrentTab();
    drawMap();
    showToast('✨ 1차 맛집 ➔ 2차 카페 ➔ 3차 보드게임 풀코스가 담겼습니다!');
  }

  function openMidpointModal() {
    if (el.midpointModal) {
      el.midpointModal.classList.add('is-open');
    }
  }

  function closeMidpointModal() {
    if (el.midpointModal) {
      el.midpointModal.classList.remove('is-open');
    }
  }

  async function calculateMidpoint() {
    try {
      const url = `/api/meetup/midpoint?myLat=${state.selectedMyOriginLat}&myLng=${state.selectedMyOriginLng}&friendLat=${state.selectedFriendOriginLat}&friendLng=${state.selectedFriendOriginLng}`;
      const res = await fetch(url);
      const data = await res.json();
      state.midpointResult = data;

      if (el.midpointStationName) el.midpointStationName.textContent = data.stationName;
      if (el.midpointMyTime) {
        el.midpointMyTime.textContent = `약 ${data.myEstimatedMinutes}분 (${data.myDistanceMeters >= 1000 ? (data.myDistanceMeters / 1000).toFixed(1) + 'km' : Math.round(data.myDistanceMeters) + 'm'})`;
      }
      if (el.midpointFriendTime) {
        el.midpointFriendTime.textContent = `약 ${data.friendEstimatedMinutes}분 (${data.friendDistanceMeters >= 1000 ? (data.friendDistanceMeters / 1000).toFixed(1) + 'km' : Math.round(data.friendDistanceMeters) + 'm'})`;
      }
      if (el.midpointDiffTime) {
        el.midpointDiffTime.textContent = `단 ${data.timeDifferenceMinutes}분 차이 (공평)`;
      }
      if (el.midpointReasonText) el.midpointReasonText.textContent = data.recommendationReason;

      if (el.midpointPlacesList) {
        if (data.nearbyHotplaces && data.nearbyHotplaces.length > 0) {
          el.midpointPlacesList.innerHTML = data.nearbyHotplaces.slice(0, 3).map(p => `
            <div class="midpoint-place-mini-item">
              <img src="${p.imageUrl}" alt="${p.name}" class="midpoint-mini-thumb" onerror="this.src='https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=700&q=80'">
              <div style="flex:1; min-width:0;">
                <div style="font-size:12px; font-weight:700; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.name}</div>
                <div style="font-size:10.5px; color:#64748B;">${p.category} · ★ ${p.googleRating} · ${p.walkMinutes}</div>
              </div>
            </div>
          `).join('');
        } else {
          el.midpointPlacesList.innerHTML = '<div style="font-size:11px; color:#94A3B8;">주변 추천 장소를 준비 중입니다.</div>';
        }
      }

      if (el.midpointResultCard) el.midpointResultCard.style.display = 'block';

      if (leafletMap) {
        leafletMap.flyTo([data.latitude, data.longitude], 15, { duration: 1.2 });
      }
      drawMap();
      showToast(`🧭 최적 중간 만남역 [${data.stationName}]이 산출되었습니다!`);
    } catch (err) {
      console.error(err);
      showToast('중간 지점 계산 중 오류가 발생했습니다.');
    }
  }

  async function applyMidpointToAppointment() {
    if (!state.midpointResult || !state.activeAppointment) return;
    const data = state.midpointResult;
    try {
      await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setMidpointAsDestination',
          id: state.activeAppointment.id,
          destinationId: data.stationId,
          destinationName: data.stationName
        })
      });
      await fetchAppointments();
      closeMidpointModal();
      switchTab('appointments');
      drawMap();
      showToast(`✓ 약속 장소가 [${data.stationName}]으로 확정되었습니다!`);
    } catch (err) {
      console.error(err);
      showToast('약속 장소 변경 중 오류가 발생했습니다.');
    }
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
        const chosen = ALL_STATIONS_MASTER.find(s => s.id === stId) || { id: stId, name: item.dataset.name, lat: 35.15517, lng: 129.05925 };
        el.destModal.classList.remove('is-open');
        await applyRouteByStations(state.originStation, chosen, true);
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

  // ========================================================
  // DYNAMIC TRANSIT ROUTING ENGINE (ALL BUSAN 1·2·3·DONGHAE LINES)
  // ========================================================
  const ALL_STATIONS_MASTER = [
    // [SEOMYEON: 서면/진구]
    { id: 'ST-BS-SMN', name: '서면역', subName: '1·2호선 환승역 (서면지하상가)', lat: 35.15780, lng: 129.05920, arsId: '05710', type: 'SUBWAY_BUS', lines: ['1', '2'], lineLabel: '1호선·2호선', region: 'SEOMYEON', roadIndex: 11, keywords: ['서면', '서면역', 'ㅅㅁ'] },
    { id: 'ST-BS-JP', name: '전포역', subName: '전포카페거리 (2호선)', lat: 35.15420, lng: 129.06320, arsId: '05705', type: 'SUBWAY_BUS', lines: ['2'], lineLabel: '부산 2호선', region: 'SEOMYEON', roadIndex: 10, keywords: ['전포', '전포역', '전포카페', 'ㅈㅍ'] },
    { id: 'ST-BS-BA', name: '부암역', subName: '온종합병원 (2호선)', lat: 35.15980, lng: 129.05050, arsId: '05722', type: 'SUBWAY_BUS', lines: ['2'], lineLabel: '부산 2호선', region: 'SEOMYEON', roadIndex: 12, keywords: ['부암', '부암역', 'ㅂㅇ'] },
    { id: 'ST-BS-BNG', name: '범내골역', subName: '중앙대로 상권 (1호선)', lat: 35.14810, lng: 129.05970, arsId: '05701', type: 'SUBWAY_BUS', lines: ['1'], lineLabel: '부산 1호선', region: 'SEOMYEON', roadIndex: 10.5, keywords: ['범내골', 'ㅂㄴㄱ'] },
    { id: 'ST-BS-BJ', name: '부전역', subName: '부전시장·동해선 환승 (1호선)', lat: 35.16450, lng: 129.06380, arsId: '05715', type: 'SUBWAY_BUS', lines: ['1'], lineLabel: '부산 1호선', region: 'SEOMYEON', roadIndex: 11.8, keywords: ['부전', '부전역', '부전시장', 'ㅂㅈ'] },
    { id: 'ST-BS-YJ', name: '양정역', subName: '송상현광장 인근 (1호선)', lat: 35.17300, lng: 129.07130, arsId: '05730', type: 'SUBWAY_BUS', lines: ['1'], lineLabel: '부산 1호선', region: 'DONGNAE', roadIndex: 13, keywords: ['양정', '양정역', 'ㅇㅈ'] },

    // [HAEUNDAE: 해운대/센텀]
    { id: 'ST-BS-HUD', name: '해운대역', subName: '해운대해수욕장·구남로 (2호선)', lat: 35.16310, lng: 129.15850, arsId: '09012', type: 'SUBWAY_BUS', lines: ['2'], lineLabel: '부산 2호선', region: 'HAEUNDAE', roadIndex: 25, keywords: ['해운대', '해운대역', '구남로', 'ㅎㅇㄷ'] },
    { id: 'ST-BS-CT', name: '센텀시티역', subName: '신세계백화점·벡스코 (2호선)', lat: 35.16890, lng: 129.13170, arsId: '09001', type: 'SUBWAY_BUS', lines: ['2'], lineLabel: '부산 2호선', region: 'HAEUNDAE', roadIndex: 22, keywords: ['센텀', '센텀시티', '신세계', 'ㅅㅌ'] },
    { id: 'ST-BS-BX', name: '벡스코역', subName: '2호선·동해선 환승역', lat: 35.16890, lng: 129.13890, arsId: '09005', type: 'SUBWAY_BUS', lines: ['2', 'DONGHAE'], lineLabel: '2호선·동해선', region: 'HAEUNDAE', roadIndex: 23, keywords: ['벡스코', '벡스코역', '시립미술관', 'ㅂㅅㅋ'] },
    { id: 'ST-BS-JS', name: '장산역', subName: '해운대 신시가지 종점 (2호선)', lat: 35.16990, lng: 129.17690, arsId: '09025', type: 'SUBWAY_BUS', lines: ['2'], lineLabel: '부산 2호선', region: 'HAEUNDAE', roadIndex: 27, keywords: ['장산', '장산역', 'ㅈㅅ'] },
    { id: 'ST-BS-DB', name: '동백역', subName: '마린시티·동백섬 (2호선)', lat: 35.16010, lng: 129.14380, arsId: '09008', type: 'SUBWAY_BUS', lines: ['2'], lineLabel: '부산 2호선', region: 'HAEUNDAE', roadIndex: 24, keywords: ['동백', '동백역', '마린시티', 'ㄷㅂ'] },

    // [GWANGAN: 광안/수영]
    { id: 'ST-BS-GA', name: '광안역', subName: '광안리 해수욕장 입구 (2호선)', lat: 35.15250, lng: 129.11550, arsId: '14062', type: 'SUBWAY_BUS', lines: ['2'], lineLabel: '부산 2호선', region: 'GWANGAN', roadIndex: 1, keywords: ['광안', '광안역', '광안리', 'ㄱㅇ'] },
    { id: 'ST-BS-SY', name: '수영역', subName: '2·3호선 환승역 (수영교차로)', lat: 35.16100, lng: 129.11650, arsId: '14089', type: 'SUBWAY_BUS', lines: ['2', '3'], lineLabel: '2호선·3호선', region: 'GWANGAN', roadIndex: 0, keywords: ['수영', '수영역', '수영교차로', 'ㅅㅇ'] },
    { id: 'ST-BS-GRS', name: '금련산역', subName: '광안리 남측 카페거리 (2호선)', lat: 35.14650, lng: 129.11280, arsId: '14055', type: 'SUBWAY_BUS', lines: ['2'], lineLabel: '부산 2호선', region: 'GWANGAN', roadIndex: 2, keywords: ['금련산', '금련산역', 'ㄱㄹㅅ'] },
    { id: 'ST-BS-NC', name: '남천역', subName: '남천 빵천동·대남교차로 (2호선)', lat: 35.14150, lng: 129.10850, arsId: '07167', type: 'SUBWAY_BUS', lines: ['2'], lineLabel: '부산 2호선', region: 'GWANGAN', roadIndex: 3, keywords: ['남천', '남천역', '대남교차로', '빵천동', 'ㄴㅊ'] },
    { id: 'ST-BS-MM', name: '망미역', subName: '수영구 복합문화거리 (3호선)', lat: 35.17180, lng: 129.10820, arsId: '14040', type: 'SUBWAY_BUS', lines: ['3'], lineLabel: '부산 3호선', region: 'GWANGAN', roadIndex: 0.8, keywords: ['망미', '망미역', 'ㅁㅁ'] },

    // [BUSAN_STATION: 부산역/남포]
    { id: 'ST-BS-BSST', name: '부산역', subName: 'KTX 고속철도 환승 (1호선)', lat: 35.11520, lng: 129.04220, arsId: '03010', type: 'SUBWAY_BUS', lines: ['1'], lineLabel: '부산 1호선', region: 'BUSAN_STATION', roadIndex: 7, keywords: ['부산역', 'KTX', '초량', 'ㅂㅅㅇ'] },
    { id: 'ST-BS-NPST', name: '남포역', subName: '용두산공원·광복로 패션거리 (1호선)', lat: 35.09790, lng: 129.03480, arsId: '01015', type: 'SUBWAY_BUS', lines: ['1'], lineLabel: '부산 1호선', region: 'BUSAN_STATION', roadIndex: 5, keywords: ['남포', '남포역', '광복로', 'ㄴㅍ'] },
    { id: 'ST-BS-JGC', name: '자갈치역', subName: '자갈치시장·비프광장 (1호선)', lat: 35.09750, lng: 129.02670, arsId: '01018', type: 'SUBWAY_BUS', lines: ['1'], lineLabel: '부산 1호선', region: 'BUSAN_STATION', roadIndex: 4.8, keywords: ['자갈치', '자갈치역', '비프광장', 'ㅈㄱㅊ'] },
    { id: 'ST-BS-CR', name: '초량역', subName: '초량 불백거리 (1호선)', lat: 35.12050, lng: 129.04400, arsId: '03005', type: 'SUBWAY_BUS', lines: ['1'], lineLabel: '부산 1호선', region: 'BUSAN_STATION', roadIndex: 7.5, keywords: ['초량', '초량역', 'ㅊㄹ'] },

    // [DAEYEON: 대연/남구]
    { id: 'ST-BS-DY', name: '대연역', subName: '부산고려병원·유엔평화공원 (2호선)', lat: 35.13545, lng: 129.09210, arsId: '07016', type: 'SUBWAY_BUS', lines: ['2'], lineLabel: '부산 2호선', region: 'DAEYEON', roadIndex: 5, keywords: ['대연', '대연역', '고려병원', 'ㄷㅇ'] },
    { id: 'ST-BS-KSU', name: '경성대·부경대역', subName: '경성대학교/대학로 (2호선)', lat: 35.13654, lng: 129.09794, arsId: '07013', type: 'SUBWAY_BUS', lines: ['2'], lineLabel: '부산 2호선', region: 'DAEYEON', roadIndex: 4, keywords: ['경성대', '부경대', '경대', 'ㄱㅅㄷ'] },
    { id: 'ST-BS-MG', name: '못골역', subName: '남구청·못골시장 (2호선)', lat: 35.13605, lng: 129.08470, arsId: '07165', type: 'SUBWAY_BUS', lines: ['2'], lineLabel: '부산 2호선', region: 'DAEYEON', roadIndex: 6, keywords: ['못골', '못골역', '남구청', 'ㅁㄱ'] },
    { id: 'ST-BS-BIFC', name: '국제금융센터·부산은행역', subName: '문현금융단지 BIFC (2호선)', lat: 35.14750, lng: 129.06470, arsId: '07067', type: 'SUBWAY_BUS', lines: ['2'], lineLabel: '부산 2호선', region: 'DAEYEON', roadIndex: 9, keywords: ['BIFC', '부산은행역', '금융센터', 'ㅂㅇㅎ'] },
    { id: 'ST-BS-PKNU', name: '부경대대연캠퍼스', subName: '부경대학교 정문 (버스)', lat: 35.13288, lng: 129.10128, arsId: '07011', type: 'BUS', lines: ['BUS'], lineLabel: '시내버스 24, 138번', region: 'DAEYEON', roadIndex: 4.1, keywords: ['부경대캠퍼스', 'ㅂㄱㄷ'] },
    { id: 'ST-BS-ORYK', name: '오륙도스카이워크', subName: '오륙도 해맞이공원 (버스)', lat: 35.10127, lng: 129.12192, arsId: '07182', type: 'BUS', lines: ['BUS'], lineLabel: '시내버스 24번', region: 'DAEYEON', roadIndex: 4.3, keywords: ['오륙도', '스카이워크', 'ㅇㄹㄷ'] },

    // [DONGNAE: 동래/연제]
    { id: 'ST-BS-YS', name: '연산역', subName: '1·3호선 환승 허브 (연산교차로)', lat: 35.18610, lng: 129.08150, arsId: '13010', type: 'SUBWAY_BUS', lines: ['1', '3'], lineLabel: '1호선·3호선', region: 'DONGNAE', roadIndex: 15, keywords: ['연산', '연산역', 'ㅇㅅ'] },
    { id: 'ST-BS-CD', name: '교대역', subName: '1호선·동해선 환승역', lat: 35.19630, lng: 129.08000, arsId: '13020', type: 'SUBWAY_BUS', lines: ['1', 'DONGHAE'], lineLabel: '1호선·동해선', region: 'DONGNAE', roadIndex: 16, keywords: ['교대', '교대역', '부산교대', 'ㄱㄷ'] },
    { id: 'ST-BS-DNR', name: '동래역', subName: '동래 메가마트·상권 (1·4호선)', lat: 35.20570, lng: 129.07830, arsId: '06010', type: 'SUBWAY_BUS', lines: ['1'], lineLabel: '부산 1호선', region: 'DONGNAE', roadIndex: 17, keywords: ['동래', '동래역', 'ㄷㄹ'] },
    { id: 'ST-BS-SJ', name: '사직역', subName: '사직야구장·아시아드 (3호선)', lat: 35.19880, lng: 129.06490, arsId: '13035', type: 'SUBWAY_BUS', lines: ['3'], lineLabel: '부산 3호선', region: 'DONGNAE', roadIndex: 16.5, keywords: ['사직', '사직역', '야구장', 'ㅅㅈ'] },

    // [PNU: 부산대/금정]
    { id: 'ST-BS-PNU', name: '부산대역', subName: '부산대학교 젊음의거리 (1호선)', lat: 35.22970, lng: 129.08940, arsId: '11005', type: 'SUBWAY_BUS', lines: ['1'], lineLabel: '부산 1호선', region: 'PNU', roadIndex: 19, keywords: ['부산대', '부산대역', 'ㅂㅅㄷ'] },
    { id: 'ST-BS-ONC', name: '온천장역', subName: '허심청·온천장 (1호선)', lat: 35.22050, lng: 129.08630, arsId: '06025', type: 'SUBWAY_BUS', lines: ['1'], lineLabel: '부산 1호선', region: 'PNU', roadIndex: 18, keywords: ['온천장', '허심청', 'ㅇㅊㅈ'] },
    { id: 'ST-BS-NP', name: '노포역', subName: '부산종합버스터미널 종점 (1호선)', lat: 35.28460, lng: 129.09490, arsId: '11030', type: 'SUBWAY_BUS', lines: ['1'], lineLabel: '부산 1호선', region: 'PNU', roadIndex: 21, keywords: ['노포', '노포역', '버스터미널', 'ㄴㅍ'] },

    // [SASANG: 사상/서부산]
    { id: 'ST-BS-SS', name: '사상역', subName: '서부시외버스터미널 (2호선·경전철)', lat: 35.16230, lng: 128.98470, arsId: '15010', type: 'SUBWAY_BUS', lines: ['2'], lineLabel: '2호선·경전철', region: 'SASANG', roadIndex: 100, keywords: ['사상', '사상역', '서부터미널', 'ㅅㅅ'] },
    { id: 'ST-BS-JR', name: '주례역', subName: '동서대학교·경남정보대 (2호선)', lat: 35.15060, lng: 129.01350, arsId: '15005', type: 'SUBWAY_BUS', lines: ['2'], lineLabel: '부산 2호선', region: 'SASANG', roadIndex: 101, keywords: ['주례', '주례역', 'ㅈㄹ'] },

    // [DEOKCHEON: 덕천/북구]
    { id: 'ST-BS-DC', name: '덕천역', subName: '2·3호선 환승역 (덕천젊음의거리)', lat: 35.21040, lng: 128.99900, arsId: '08010', type: 'SUBWAY_BUS', lines: ['2', '3'], lineLabel: '2호선·3호선', region: 'DEOKCHEON', roadIndex: 105, keywords: ['덕천', '덕천역', 'ㄷㅊ'] },
    { id: 'ST-BS-HM', name: '화명역', subName: '화명생태공원·롯데마트 (2호선)', lat: 35.23600, lng: 129.01370, arsId: '08020', type: 'SUBWAY_BUS', lines: ['2'], lineLabel: '부산 2호선', region: 'DEOKCHEON', roadIndex: 106, keywords: ['화명', '화명역', 'ㅎㅁ'] },
    { id: 'ST-BS-GP', name: '구포역', subName: '경부선 KTX 구포역 환승 (3호선)', lat: 35.20650, lng: 128.99580, arsId: '08005', type: 'SUBWAY_BUS', lines: ['3'], lineLabel: '부산 3호선', region: 'DEOKCHEON', roadIndex: 104, keywords: ['구포', '구포역', 'ㄱㅍ'] },

    // [HADAN: 하단/다대포]
    { id: 'ST-BS-HAD', name: '하단역', subName: '동아대학교·을숙도 입구 (1호선)', lat: 35.10610, lng: 128.96680, arsId: '10010', type: 'SUBWAY_BUS', lines: ['1'], lineLabel: '부산 1호선', region: 'HADAN', roadIndex: 200, keywords: ['하단', '하단역', '동아대', 'ㅎㄷ'] },
    { id: 'ST-BS-DDP', name: '다대포해수욕장역', subName: '꿈의낙조분수·몰운대 (1호선)', lat: 35.04830, lng: 128.96520, arsId: '10030', type: 'SUBWAY_BUS', lines: ['1'], lineLabel: '부산 1호선', region: 'HADAN', roadIndex: 205, keywords: ['다대포', '몰운대', '낙조분수', 'ㄷㄷㅍ'] },

    // [GIJANG: 기장/오시리아]
    { id: 'ST-BS-OSR', name: '오시리아역', subName: '롯데월드·이케아·동부산아울렛 (동해선)', lat: 35.19320, lng: 129.21200, arsId: '16010', type: 'SUBWAY_BUS', lines: ['DONGHAE'], lineLabel: '동해선 전철', region: 'GIJANG', roadIndex: 300, keywords: ['오시리아', '롯데월드', '이케아', 'ㅇㅅㄹㅇ'] },
    { id: 'ST-BS-GIJ', name: '기장역', subName: '기장시장 대게골목 (동해선)', lat: 35.24430, lng: 129.21730, arsId: '16020', type: 'SUBWAY_BUS', lines: ['DONGHAE'], lineLabel: '동해선 전철', region: 'GIJANG', roadIndex: 305, keywords: ['기장', '기장역', 'ㄱㅈ'] },
    { id: 'ST-BS-ILG', name: '일광역', subName: '일광해수욕장·카페거리 (동해선)', lat: 35.26570, lng: 129.23320, arsId: '16030', type: 'SUBWAY_BUS', lines: ['DONGHAE'], lineLabel: '동해선 전철', region: 'GIJANG', roadIndex: 310, keywords: ['일광', '일광역', 'ㅇㄱ'] }
  ];

  // 노선별 정거장 순서 리스트
  const SUBWAY_LINE_1 = [
    { id: 'ST-BS-DDP', name: '다대포해수욕장', lat: 35.0483, lng: 128.9652 },
    { id: 'ST-BS-HAD', name: '하단역', lat: 35.1061, lng: 128.9668 },
    { id: 'ST-BS-JGC', name: '자갈치역', lat: 35.0975, lng: 129.0267 },
    { id: 'ST-BS-NPST', name: '남포역', lat: 35.0979, lng: 129.0348 },
    { id: 'ST-BS-BSST', name: '부산역', lat: 35.1152, lng: 129.0422 },
    { id: 'ST-BS-CR', name: '초량역', lat: 35.1205, lng: 129.0440 },
    { id: 'ST-BS-BJIN', name: '부산진역', lat: 35.1278, lng: 129.0505 },
    { id: 'ST-BS-BI', name: '범일역', lat: 35.1410, lng: 129.0590 },
    { id: 'ST-BS-BNG', name: '범내골역', lat: 35.1481, lng: 129.0597 },
    { id: 'ST-BS-SMN', name: '서면역', lat: 35.1578, lng: 129.0592 },
    { id: 'ST-BS-BJ', name: '부전역', lat: 35.1645, lng: 129.0638 },
    { id: 'ST-BS-YJ', name: '양정역', lat: 35.1730, lng: 129.0713 },
    { id: 'ST-BS-YS', name: '연산역', lat: 35.1861, lng: 129.0815 },
    { id: 'ST-BS-CD', name: '교대역', lat: 35.1963, lng: 129.0800 },
    { id: 'ST-BS-DNR', name: '동래역', lat: 35.2057, lng: 129.0783 },
    { id: 'ST-BS-ONC', name: '온천장역', lat: 35.2205, lng: 129.0863 },
    { id: 'ST-BS-PNU', name: '부산대역', lat: 35.2297, lng: 129.0894 },
    { id: 'ST-BS-NP', name: '노포역', lat: 35.2846, lng: 129.0949 }
  ];

  const SUBWAY_LINE_2 = [
    { id: 'ST-BS-JS', name: '장산역', lat: 35.1699, lng: 129.1769 },
    { id: 'ST-BS-HUD', name: '해운대역', lat: 35.1631, lng: 129.1585 },
    { id: 'ST-BS-DB', name: '동백역', lat: 35.1601, lng: 129.1438 },
    { id: 'ST-BS-BX', name: '벡스코역', lat: 35.1689, lng: 129.1389 },
    { id: 'ST-BS-CT', name: '센텀시티역', lat: 35.1689, lng: 129.1317 },
    { id: 'ST-BS-SY', name: '수영역', lat: 35.1610, lng: 129.1165 },
    { id: 'ST-BS-GA', name: '광안역', lat: 35.1525, lng: 129.1155 },
    { id: 'ST-BS-GRS', name: '금련산역', lat: 35.1465, lng: 129.1128 },
    { id: 'ST-BS-NC', name: '남천역', lat: 35.1415, lng: 129.1085 },
    { id: 'ST-BS-KSU', name: '경성대·부경대역', lat: 35.13654, lng: 129.09794 },
    { id: 'ST-BS-DY', name: '대연역', lat: 35.13545, lng: 129.09210 },
    { id: 'ST-BS-MG', name: '못골역', lat: 35.13605, lng: 129.08470 },
    { id: 'ST-BS-JGG', name: '지게골역', lat: 35.13735, lng: 129.07605 },
    { id: 'ST-BS-MH', name: '문현역', lat: 35.13885, lng: 129.06640 },
    { id: 'ST-BS-BIFC', name: '국제금융센터역', lat: 35.1475, lng: 129.0647 },
    { id: 'ST-BS-JP', name: '전포역', lat: 35.1542, lng: 129.0632 },
    { id: 'ST-BS-SMN', name: '서면역', lat: 35.1578, lng: 129.0592 },
    { id: 'ST-BS-BA', name: '부암역', lat: 35.1598, lng: 129.0505 },
    { id: 'ST-BS-JR', name: '주례역', lat: 35.1506, lng: 129.0135 },
    { id: 'ST-BS-SS', name: '사상역', lat: 35.1623, lng: 128.9847 },
    { id: 'ST-BS-DC', name: '덕천역', lat: 35.2104, lng: 128.9990 },
    { id: 'ST-BS-HM', name: '화명역', lat: 35.2360, lng: 129.0137 }
  ];

  const SUBWAY_LINE_3 = [
    { id: 'ST-BS-SY', name: '수영역', lat: 35.1610, lng: 129.1165 },
    { id: 'ST-BS-MM', name: '망미역', lat: 35.1718, lng: 129.1082 },
    { id: 'ST-BS-YS', name: '연산역', lat: 35.1861, lng: 129.0815 },
    { id: 'ST-BS-SJ', name: '사직역', lat: 35.1988, lng: 129.0649 },
    { id: 'ST-BS-DC', name: '덕천역', lat: 35.2104, lng: 128.9990 },
    { id: 'ST-BS-GP', name: '구포역', lat: 35.2065, lng: 128.9958 }
  ];

  const SUBWAY_LINE_DONGHAE = [
    { id: 'ST-BS-CD', name: '교대역', lat: 35.1963, lng: 129.0800 },
    { id: 'ST-BS-BX', name: '벡스코역', lat: 35.1689, lng: 129.1389 },
    { id: 'ST-BS-OSR', name: '오시리아역', lat: 35.1932, lng: 129.2120 },
    { id: 'ST-BS-GIJ', name: '기장역', lat: 35.2443, lng: 129.2173 },
    { id: 'ST-BS-ILG', name: '일광역', lat: 35.2657, lng: 129.2332 }
  ];

  function getLineList(lineKey) {
    if (lineKey === '1') return SUBWAY_LINE_1;
    if (lineKey === '2') return SUBWAY_LINE_2;
    if (lineKey === '3') return SUBWAY_LINE_3;
    if (lineKey === 'DONGHAE') return SUBWAY_LINE_DONGHAE;
    return SUBWAY_LINE_2;
  }

  function getLineName(lineKey) {
    if (lineKey === '1') return '1호선';
    if (lineKey === '2') return '2호선';
    if (lineKey === '3') return '3호선';
    if (lineKey === 'DONGHAE') return '동해선';
    return '지하철';
  }

  function sliceLineStations(lineArr, stA, stB) {
    function findIdx(st) {
      let idx = lineArr.findIndex(s => s.id === st.id || s.name === st.name);
      if (idx !== -1) return idx;
      let minD = Infinity, best = 0;
      for (let i = 0; i < lineArr.length; i++) {
        const d = Math.hypot(lineArr[i].lat - st.lat, lineArr[i].lng - st.lng);
        if (d < minD) { minD = d; best = i; }
      }
      return best;
    }

    const idxA = findIdx(stA);
    const idxB = findIdx(stB);

    let sliced = [];
    if (idxA <= idxB) {
      sliced = lineArr.slice(idxA, idxB + 1);
    } else {
      sliced = lineArr.slice(idxB, idxA + 1).reverse();
    }

    // 마커 좌표와 선로 시작/끝점이 100% 밀착(Snap)되도록 보정
    const res = sliced.map(s => ({ ...s }));
    if (res.length === 0) {
      res.push({ ...stA }, { ...stB });
    } else {
      res[0] = { ...stA };
      res[res.length - 1] = { ...stB };
    }
    return res;
  }

  // ========================================================
  // REAL BUSAN TRANSIT CORRIDOR ROAD GRAPH ROUTER
  // ========================================================
  const CORRIDORS = {
    // 1. 중앙대로 본선축 (다대포 - 하단 - 자갈치 - 남포 - 부산역 - 초량 - 범내골 - 서면)
    JUNGANG_SOUTH: [
      { id: 'ST-BS-DDP', lat: 35.0483, lng: 128.9652, name: '다대포해수욕장' },
      { id: 'ROAD-DDP-HD', lat: 35.0750, lng: 128.9660 },
      { id: 'ST-BS-HAD', lat: 35.1061, lng: 128.9668, name: '하단역' },
      { id: 'ROAD-HD-JGC1', lat: 35.1050, lng: 128.9900 },
      { id: 'ROAD-HD-JGC2', lat: 35.1000, lng: 129.0100 },
      { id: 'ST-BS-JGC', lat: 35.0975, lng: 129.0267, name: '자갈치역' },
      { id: 'ST-BS-NPST', lat: 35.0979, lng: 129.0348, name: '남포역' },
      { id: 'ROAD-NP-BS', lat: 35.1100, lng: 129.0390 },
      { id: 'ST-BS-BSST', lat: 35.1152, lng: 129.0422, name: '부산역' },
      { id: 'ST-BS-CR', lat: 35.1205, lng: 129.0440, name: '초량역' },
      { id: 'ROAD-CR-BJIN', lat: 35.1278, lng: 129.0505 },
      { id: 'ROAD-BJIN-BNG', lat: 35.1410, lng: 129.0590 },
      { id: 'ST-BS-BNG', lat: 35.1481, lng: 129.0597, name: '범내골역' },
      { id: 'ST-BS-SMN', lat: 35.1578, lng: 129.0592, name: '서면역' }
    ],

    // 2. 대연 ↔ 부산역 황금 직통 간선 (문현교차로 - 자성대 - 부산진역 - 초량 - 부산역)
    // * 서면으로 우회하지 않고 27번, 40번, 41번 버스처럼 최단 도로 직행!
    DAEYEON_TO_BUSAN_STATION: [
      { id: 'ST-BS-SY', lat: 35.1610, lng: 129.1165, name: '수영역' },
      { id: 'ST-BS-GA', lat: 35.1525, lng: 129.1155, name: '광안역' },
      { id: 'ST-BS-GRS', lat: 35.1465, lng: 129.1128, name: '금련산역' },
      { id: 'ST-BS-NC', lat: 35.1415, lng: 129.1085, name: '남천역' },
      { id: 'ST-BS-KSU', lat: 35.1365, lng: 129.0979, name: '경성대·부경대역' },
      { id: 'ST-BS-DY', lat: 35.1354, lng: 129.0921, name: '대연역' },
      { id: 'ST-BS-MG', lat: 35.1360, lng: 129.0847, name: '못골역' },
      { id: 'ROAD-MG-JGG', lat: 35.1370, lng: 129.0760 },
      { id: 'ROAD-JGG-MH', lat: 35.1388, lng: 129.0664 }, // 문현교차로
      { id: 'ROAD-MH-JSD', lat: 35.1345, lng: 129.0600 }, // 자성대 / 범일교 직결로
      { id: 'ROAD-JSD-BJIN', lat: 35.1278, lng: 129.0505 }, // 부산진역
      { id: 'ST-BS-CR', lat: 35.1205, lng: 129.0440, name: '초량역' },
      { id: 'ST-BS-BSST', lat: 35.1152, lng: 129.0422, name: '부산역' },
      { id: 'ST-BS-NPST', lat: 35.0979, lng: 129.0348, name: '남포역' },
      { id: 'ST-BS-JGC', lat: 35.0975, lng: 129.0267, name: '자갈치역' }
    ],

    // 3. 연산/양정/동래 ↔ 센텀/해운대 황금 직통 간선 (충렬대로 - 원동교 - 수영강변대로 - 센텀시티 - 해운대로)
    // * 서면으로 우회하지 않고 부산 시내버스 141번, 5-1번처럼 최단 도로 직행! (약 8.5km)
    YEONSAN_TO_HAEUNDAE: [
      { id: 'ST-BS-SMN', lat: 35.1578, lng: 129.0592, name: '서면역' },
      { id: 'ROAD-SMN-BJ', lat: 35.1645, lng: 129.0638 },
      { id: 'ST-BS-YJ', lat: 35.1730, lng: 129.0713, name: '양정역' },
      { id: 'ROAD-YJ-YS', lat: 35.1800, lng: 129.0760 },
      { id: 'ST-BS-YS', lat: 35.1861, lng: 129.0815, name: '연산역' },
      { id: 'ROAD-YS-AL', lat: 35.1950, lng: 129.0980 }, // 안락교차로 / 충렬사
      { id: 'ROAD-AL-WD', lat: 35.1920, lng: 129.1150 }, // 원동교 / 수영강변
      { id: 'ROAD-WD-CT', lat: 35.1780, lng: 129.1250 }, // 수영강변대로 -> 센텀시티
      { id: 'ST-BS-CT', lat: 35.1689, lng: 129.1317, name: '센텀시티역' },
      { id: 'ST-BS-BX', lat: 35.1689, lng: 129.1389, name: '벡스코역' },
      { id: 'ST-BS-DB', lat: 35.1601, lng: 129.1438, name: '동백역' },
      { id: 'ROAD-DB-HUD', lat: 35.1615, lng: 129.1510 },
      { id: 'ST-BS-HUD', lat: 35.1631, lng: 129.1585, name: '해운대역' },
      { id: 'ST-BS-JS', lat: 35.1699, lng: 129.1769, name: '장산역' },
      { id: 'ROAD-JS-SJ', lat: 35.1800, lng: 129.1900 },
      { id: 'ST-BS-OSR', lat: 35.1932, lng: 129.2120, name: '오시리아역' },
      { id: 'ST-BS-GIJ', lat: 35.2443, lng: 129.2173, name: '기장역' }
    ],

    // 4. 중앙대로 북부축 (서면 - 양정 - 연산 - 교대 - 동래 - 온천장 - 부산대 - 노포)
    JUNGANG_NORTH: [
      { id: 'ST-BS-SMN', lat: 35.1578, lng: 129.0592, name: '서면역' },
      { id: 'ROAD-SMN-BJ', lat: 35.1645, lng: 129.0638 },
      { id: 'ST-BS-YJ', lat: 35.1730, lng: 129.0713, name: '양정역' },
      { id: 'ST-BS-YS', lat: 35.1861, lng: 129.0815, name: '연산역' },
      { id: 'ST-BS-CD', lat: 35.1963, lng: 129.0800, name: '교대역' },
      { id: 'ST-BS-DNR', lat: 35.2057, lng: 129.0783, name: '동래역' },
      { id: 'ST-BS-ONC', lat: 35.2205, lng: 129.0863, name: '온천장역' },
      { id: 'ST-BS-PNU', lat: 35.2297, lng: 129.0894, name: '부산대역' },
      { id: 'ROAD-PNU-NP', lat: 35.2550, lng: 129.0920 },
      { id: 'ST-BS-NP', lat: 35.2846, lng: 129.0949, name: '노포역' }
    ],

    // 5. 수영로 동부축 (서면 - 전포 - BIFC - 문현 - 못골 - 대연 - 경성대 - 남천 - 광안 - 수영)
    SUYEONG_EAST: [
      { id: 'ST-BS-SMN', lat: 35.1578, lng: 129.0592, name: '서면역' },
      { id: 'ROAD-SMN-JP', lat: 35.1558, lng: 129.0620 },
      { id: 'ST-BS-JP', lat: 35.1542, lng: 129.0632, name: '전포역' },
      { id: 'ROAD-JP-BIFC', lat: 35.1500, lng: 129.0640 },
      { id: 'ST-BS-BIFC', lat: 35.1475, lng: 129.0647, name: '국제금융센터역' },
      { id: 'ROAD-BIFC-MH', lat: 35.1415, lng: 129.0662 },
      { id: 'ST-BS-MH', lat: 35.1388, lng: 129.0664, name: '문현역' },
      { id: 'ROAD-MH-MG', lat: 35.1370, lng: 129.0750 },
      { id: 'ST-BS-MG', lat: 35.1360, lng: 129.0847, name: '못골역' },
      { id: 'ST-BS-DY', lat: 35.1354, lng: 129.0921, name: '대연역' },
      { id: 'ST-BS-KSU', lat: 35.1365, lng: 129.0979, name: '경성대·부경대역' },
      { id: 'ROAD-KSU-NC', lat: 35.1390, lng: 129.1040 },
      { id: 'ST-BS-NC', lat: 35.1415, lng: 129.1085, name: '남천역' },
      { id: 'ST-BS-GRS', lat: 35.1465, lng: 129.1128, name: '금련산역' },
      { id: 'ST-BS-GA', lat: 35.1525, lng: 129.1155, name: '광안역' },
      { id: 'ST-BS-SY', lat: 35.1610, lng: 129.1165, name: '수영역' }
    ],

    // 6. 해운대로 & 기장대로축 (수영 - 센텀시티 - 벡스코 - 해운대 - 장산 - 오시리아 - 기장)
    HAEUNDAE_EAST: [
      { id: 'ST-BS-SY', lat: 35.1610, lng: 129.1165, name: '수영역' },
      { id: 'ROAD-SY-CT', lat: 35.1645, lng: 129.1240 },
      { id: 'ST-BS-CT', lat: 35.1689, lng: 129.1317, name: '센텀시티역' },
      { id: 'ST-BS-BX', lat: 35.1689, lng: 129.1389, name: '벡스코역' },
      { id: 'ST-BS-DB', lat: 35.1601, lng: 129.1438, name: '동백역' },
      { id: 'ROAD-DB-HUD', lat: 35.1615, lng: 129.1510 },
      { id: 'ST-BS-HUD', lat: 35.1631, lng: 129.1585, name: '해운대역' },
      { id: 'ST-BS-JS', lat: 35.1699, lng: 129.1769, name: '장산역' },
      { id: 'ROAD-JS-SJ', lat: 35.1800, lng: 129.1900 },
      { id: 'ST-BS-OSR', lat: 35.1932, lng: 129.2120, name: '오시리아역' },
      { id: 'ST-BS-GIJ', lat: 35.2443, lng: 129.2173, name: '기장역' },
      { id: 'ST-BS-ILG', lat: 35.2657, lng: 129.2332, name: '일광역' }
    ],

    // 7. 가야대로 & 백양대로축 (서면 - 부암 - 주례 - 사상 - 덕천 - 화명)
    SASANG_WEST: [
      { id: 'ST-BS-SMN', lat: 35.1578, lng: 129.0592, name: '서면역' },
      { id: 'ST-BS-BA', lat: 35.1598, lng: 129.0505, name: '부암역' },
      { id: 'ROAD-BA-JR', lat: 35.1540, lng: 129.0320 },
      { id: 'ST-BS-JR', lat: 35.1506, lng: 129.0135, name: '주례역' },
      { id: 'ROAD-JR-SS', lat: 35.1560, lng: 128.9990 },
      { id: 'ST-BS-SS', lat: 35.1623, lng: 128.9847, name: '사상역' },
      { id: 'ROAD-SS-GP', lat: 35.1850, lng: 128.9900 },
      { id: 'ST-BS-GP', lat: 35.2065, lng: 128.9958, name: '구포역' },
      { id: 'ST-BS-DC', lat: 35.2104, lng: 128.9990, name: '덕천역' },
      { id: 'ST-BS-HM', lat: 35.2360, lng: 129.0137, name: '화명역' }
    ]
  };

  /**
   * 해당 역이 어느 간선 도로축(Corridor)에 속하는지 판별
   */
  function getStationCorridor(st) {
    if (!st) return 'SUYEONG_EAST';
    if (st.id === 'ST-BS-SMN') return 'HUB'; // 서면역 본체만 허브
    if (st.id === 'ST-BS-YJ' || (st.name && st.name.includes('양정'))) return 'JUNGANG_NORTH';
    const reg = st.region;
    if (reg === 'HADAN' || reg === 'BUSAN_STATION') return 'JUNGANG_SOUTH';
    if (reg === 'DONGNAE' || reg === 'PNU') return 'JUNGANG_NORTH';
    if (reg === 'DAEYEON' || reg === 'GWANGAN') return 'SUYEONG_EAST';
    if (reg === 'HAEUNDAE' || reg === 'GIJANG') return 'HAEUNDAE_EAST';
    if (reg === 'SASANG' || reg === 'DEOKCHEON') return 'SASANG_WEST';
    if (reg === 'SEOMYEON') return 'HUB';
    return 'SUYEONG_EAST';
  }

  function sliceCorridorPts(pts, stA, stB) {
    function findNearIdx(st) {
      let minD = Infinity, minIdx = 0;
      for (let i = 0; i < pts.length; i++) {
        const d = Math.hypot(pts[i].lat - st.lat, pts[i].lng - st.lng);
        if (d < minD) { minD = d; minIdx = i; }
      }
      return minIdx;
    }
    const idxA = findNearIdx(stA);
    const idxB = findNearIdx(stB);

    let sliced = [];
    if (idxA <= idxB) {
      sliced = pts.slice(idxA, idxB + 1);
    } else {
      sliced = pts.slice(idxB, idxA + 1).reverse();
    }
    return sliced.map(p => [p.lat, p.lng]);
  }

  // OSRM 실제 도로 내비게이션 라우팅 캐시 (동일 출발-도착 재요청 0ms 즉시 응답)
  const osrmRouteCache = new Map();

  /**
   * OSRM (Open Source Routing Machine) 실제 도로 내비게이션 라우팅 엔진
   * 부산 도로망의 실제 곡선, 골목, 교차로 턴바이턴 위경도 궤적을 100% 반환
   */
  async function fetchOsrmRoute(originSt, destSt) {
    if (!originSt || !destSt) return null;
    const cacheKey = `${originSt.lat.toFixed(5)},${originSt.lng.toFixed(5)}_${destSt.lat.toFixed(5)},${destSt.lng.toFixed(5)}`;
    if (osrmRouteCache.has(cacheKey)) {
      return osrmRouteCache.get(cacheKey);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5초 타임아웃 보장

      const url = `https://router.project-osrm.org/route/v1/driving/${originSt.lng},${originSt.lat};${destSt.lng},${destSt.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn('OSRM HTTP error status:', res.status);
        return null;
      }

      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // OSRM GeoJSON [lng, lat] -> Leaflet Polyline [lat, lng] 변환
        const leafCoords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

        // 출발역 및 도착역 핀 위치에 첫/끝 좌표 정밀 밀착(Snap)
        if (leafCoords.length > 0) {
          leafCoords[0] = [originSt.lat, originSt.lng];
          leafCoords[leafCoords.length - 1] = [destSt.lat, destSt.lng];
        }

        const result = {
          coords: leafCoords,
          distance: route.distance, // meters
          duration: route.duration  // seconds
        };

        osrmRouteCache.set(cacheKey, result);
        return result;
      }
    } catch (err) {
      console.warn('OSRM routing failed (will fallback to corridor path):', err.name === 'AbortError' ? 'Timeout' : err.message);
    }
    return null;
  }

  /**
   * 출발역과 도착역 사이의 간선 직진 도로 버스 주행 궤적 생성 (우회 및 선 끊김 완전 제거)
   */
  function buildDynamicRoadPath(originSt, destSt) {
    if (!originSt || !destSt) return [];

    const seomyeonHub = { id: 'ST-BS-SMN', lat: 35.1578, lng: 129.0592, name: '서면역' };
    const suyeongHub = { id: 'ST-BS-SY', lat: 35.1610, lng: 129.1165, name: '수영역' };

    const cOrigin = getStationCorridor(originSt);
    const cDest = getStationCorridor(destSt);

    let rawPts = [];

    // [특급 최단 직통 1]: 대연/광안/남구 ↔ 부산역/남포 이동 시 (문현-자성대-부산역 직결로 적용! 서면 우회 0%)
    const isDaeyeonOrigin = (cOrigin === 'SUYEONG_EAST');
    const isBusanStationDest = (cDest === 'JUNGANG_SOUTH');
    const isBusanStationOrigin = (cOrigin === 'JUNGANG_SOUTH');
    const isDaeyeonDest = (cDest === 'SUYEONG_EAST');

    // [특급 최단 직통 2]: 양정/연산/동래/부산대(중앙북부축) ↔ 센텀/벡스코/해운대/기장(해운대동부축) 이동 시
    // (충렬대로-수영강변-센텀 직결로 적용! 서면 대우회 및 수영역 관통 텔레포트 0%)
    const isNorthOrigin = (cOrigin === 'JUNGANG_NORTH');
    const isHaeundaeDest = (cDest === 'HAEUNDAE_EAST');
    const isHaeundaeOrigin = (cOrigin === 'HAEUNDAE_EAST');
    const isNorthDest = (cDest === 'JUNGANG_NORTH');

    if ((isDaeyeonOrigin && isBusanStationDest) || (isBusanStationOrigin && isDaeyeonDest)) {
      rawPts = sliceCorridorPts(CORRIDORS.DAEYEON_TO_BUSAN_STATION, originSt, destSt);
    } else if ((isNorthOrigin && isHaeundaeDest) || (isHaeundaeOrigin && isNorthDest)) {
      rawPts = sliceCorridorPts(CORRIDORS.YEONSAN_TO_HAEUNDAE, originSt, destSt);
    } else if (cOrigin === cDest && cOrigin !== 'HUB') {
      // 1. 동일한 간선축 직행
      rawPts = sliceCorridorPts(CORRIDORS[cOrigin], originSt, destSt);
    } else if (cOrigin === 'HUB' && cDest !== 'HUB') {
      rawPts = sliceCorridorPts(CORRIDORS[cDest], originSt, destSt);
    } else if (cDest === 'HUB' && cOrigin !== 'HUB') {
      rawPts = sliceCorridorPts(CORRIDORS[cOrigin], originSt, destSt);
    } else if ((cOrigin === 'SUYEONG_EAST' && cDest === 'HAEUNDAE_EAST') ||
               (cOrigin === 'HAEUNDAE_EAST' && cDest === 'SUYEONG_EAST')) {
      // 2. 수영로축 ↔ 해운대축: 수영역에서 직결
      if (cOrigin === 'SUYEONG_EAST') {
        const leg1 = sliceCorridorPts(CORRIDORS.SUYEONG_EAST, originSt, suyeongHub);
        const leg2 = sliceCorridorPts(CORRIDORS.HAEUNDAE_EAST, suyeongHub, destSt);
        rawPts = [...leg1, [suyeongHub.lat, suyeongHub.lng], ...leg2];
      } else {
        const leg1 = sliceCorridorPts(CORRIDORS.HAEUNDAE_EAST, originSt, suyeongHub);
        const leg2 = sliceCorridorPts(CORRIDORS.SUYEONG_EAST, suyeongHub, destSt);
        rawPts = [...leg1, [suyeongHub.lat, suyeongHub.lng], ...leg2];
      }
    } else {
      // 3. 기타 서로 다른 간선축: 서면 허브 직결
      const pts1 = sliceCorridorPts(CORRIDORS[cOrigin] || CORRIDORS.SUYEONG_EAST, originSt, seomyeonHub);
      const pts2 = sliceCorridorPts(CORRIDORS[cDest] || CORRIDORS.JUNGANG_SOUTH, seomyeonHub, destSt);
      rawPts = [...pts1, [seomyeonHub.lat, seomyeonHub.lng], ...pts2];
    }

    // 마커 좌표에 100% 밀착(Snap) 보정
    let path = rawPts.slice();
    if (path.length === 0) {
      path = [[originSt.lat, originSt.lng], [destSt.lat, destSt.lng]];
    } else {
      path.unshift([originSt.lat, originSt.lng]);
      path.push([destSt.lat, destSt.lng]);
    }

    // 인접한 중복 좌표 정돈
    const cleanPath = [];
    for (let i = 0; i < path.length; i++) {
      if (i === 0 || Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]) > 0.00005) {
        cleanPath.push(path[i]);
      }
    }
    return cleanPath;
  }

  /**
   * 출발역과 도착역에 최적화된 추천 버스 노선 결정
   */
  function determineRecommendedBus(originSt, destSt) {
    if (!originSt || !destSt) return '시내 24번';
    const oName = originSt.name || '';
    const dName = destSt.name || '';
    const oReg = originSt.region || '';
    const dReg = destSt.region || '';

    const isNorth = (oReg === 'DONGNAE' || oReg === 'PNU' || oName.includes('양정') || oName.includes('연산') || oName.includes('동래') || oName.includes('부산대'));
    const isHaeundae = (oReg === 'HAEUNDAE' || oReg === 'GIJANG' || oName.includes('해운대') || oName.includes('센텀') || oName.includes('벡스코') || oName.includes('장산'));
    const isNorthDest = (dReg === 'DONGNAE' || dReg === 'PNU' || dName.includes('양정') || dName.includes('연산') || dName.includes('동래') || dName.includes('부산대'));
    const isHaeundaeDest = (dReg === 'HAEUNDAE' || dReg === 'GIJANG' || dName.includes('해운대') || dName.includes('센텀') || dName.includes('벡스코') || dName.includes('장산'));

    // 1. 양정/연산/동래 ↔ 센텀/해운대 직통: 부산 141번 (충렬대로-수영강변 직통 8.5km)
    if ((isNorth && isHaeundaeDest) || (isHaeundae && isNorthDest)) {
      return '시내 141번 (양정·연산 ↔ 센텀·해운대 직통)';
    }

    // 2. 대연/남구 ↔ 부산역/남포 직통: 부산 27번 (자성로-부산진역 직통 5.5km)
    const isDaeyeon = (oReg === 'DAEYEON' || oReg === 'GWANGAN' || oName.includes('대연') || oName.includes('경성대'));
    const isBusanStation = (oReg === 'BUSAN_STATION' || oReg === 'HADAN' || oName.includes('부산역') || oName.includes('남포'));
    const isDaeyeonDest = (dReg === 'DAEYEON' || dReg === 'GWANGAN' || dName.includes('대연') || dName.includes('경성대'));
    const isBusanStationDest = (dReg === 'BUSAN_STATION' || dReg === 'HADAN' || dName.includes('부산역') || dName.includes('남포'));
    if ((isDaeyeon && isBusanStationDest) || (isBusanStation && isDaeyeonDest)) {
      return '시내 27번 (대연 ↔ 자성대·부산역 직통)';
    }

    // 3. 기장/해운대 ↔ 서면: 급행 1001번
    if (oReg === 'GIJANG' || dReg === 'GIJANG' || isHaeundae || isHaeundaeDest) {
      return '급행 1001번 (해운대·기장 ↔ 서면)';
    }

    // 4. 하단/다대포: 급행 1000번
    if (oReg === 'HADAN' || dReg === 'HADAN') {
      return '급행 1000번 (다대포·하단 ↔ 부산역·서면)';
    }

    // 5. 동래/부산대 ↔ 서면: 시내 80번
    if (isNorth || isNorthDest) {
      return '시내 80번 (부산대·동래 ↔ 서면)';
    }

    // 6. 광안/수영 ↔ 서면: 시내 83번
    if (oName.includes('수영') || oName.includes('광안') || dName.includes('수영') || dName.includes('광안')) {
      return '시내 83번 (수영·광안 ↔ 서면)';
    }

    // 7. 기본 대연 ↔ 서면: 시내 24번
    return '시내 24번 (대연 ↔ 서면)';
  }

  /**
   * 부산 전역 지하철 환승 라우팅 엔진 (직통 및 1회 환승 자동 탐색)
   */
  /**
   * 부산 전역 지하철 다중 경로 탐색 엔진 (직통 및 다양한 환승 대안 제시)
   */
  function buildAllSubwayRoutes(originSt, destSt) {
    if (!originSt || !destSt) {
      return [{
        routeId: 0,
        title: '2호선 직통',
        badgeType: 'direct',
        badgeText: '추천 직통',
        timeMins: 15,
        transfers: 0,
        isTransfer: false,
        transferStation: null,
        lineFrom: '2',
        lineTo: '2',
        lineFromName: '2호선',
        lineToName: '2호선',
        stations: SUBWAY_LINE_2.slice(5, 12),
        coords: SUBWAY_LINE_2.slice(5, 12).map(s => [s.lat, s.lng]),
        sections: [
          { type: 'SUBWAY', line: '2', lineName: '2호선', from: '대연역', to: '서면역', stations: SUBWAY_LINE_2.slice(5, 12), timeMins: 15 }
        ]
      }];
    }

    const oLines = (originSt.lines || ['2']).filter(l => l !== 'BUS');
    const dLines = (destSt.lines || ['2']).filter(l => l !== 'BUS');
    const commonLines = oLines.filter(l => dLines.includes(l));

    const transferHubs = [
      { id: 'ST-BS-SMN', lines: ['1', '2'], name: '서면역', walkMins: 3 },
      { id: 'ST-BS-YS', lines: ['1', '3'], name: '연산역', walkMins: 2 },
      { id: 'ST-BS-SY', lines: ['2', '3'], name: '수영역', walkMins: 3 },
      { id: 'ST-BS-DC', lines: ['2', '3'], name: '덕천역', walkMins: 3 },
      { id: 'ST-BS-CD', lines: ['1', 'DONGHAE'], name: '교대역', walkMins: 4 },
      { id: 'ST-BS-BX', lines: ['2', 'DONGHAE'], name: '벡스코역', walkMins: 5 }
    ];

    const routes = [];

    // 1. 직통 가능한 경우 (동일 노선)
    if (commonLines.length > 0) {
      const lineKey = commonLines[0];
      const lineArr = getLineList(lineKey);
      const sliced = sliceLineStations(lineArr, originSt, destSt);
      const timeMins = Math.max(3, Math.round(sliced.length * 2.2));

      routes.push({
        routeId: 0,
        title: `${getLineName(lineKey)} 직통`,
        badgeType: 'direct',
        badgeText: '추천 직통',
        timeMins: timeMins,
        transfers: 0,
        isTransfer: false,
        transferStation: null,
        lineFrom: lineKey,
        lineTo: lineKey,
        lineFromName: getLineName(lineKey),
        lineToName: getLineName(lineKey),
        stations: sliced,
        coords: sliced.map(s => [s.lat, s.lng]),
        sections: [
          {
            type: 'SUBWAY',
            line: lineKey,
            lineName: getLineName(lineKey),
            from: originSt.name,
            to: destSt.name,
            stations: sliced,
            timeMins: timeMins
          }
        ]
      });

      // 직통 가능하더라도 사용자가 요구한 "환승해서 가는 대안" 제공!
      const altHubs = transferHubs.filter(h => h.id !== originSt.id && h.id !== destSt.id);
      altHubs.forEach(hub => {
        const hubSt = ALL_STATIONS_MASTER.find(s => s.id === hub.id);
        if (!hubSt) return;

        for (const ol of oLines) {
          if (!hub.lines.includes(ol)) continue;
          for (const hl of hub.lines) {
            if (hl === ol) continue;
            const leg1 = sliceLineStations(getLineList(ol), originSt, hubSt);
            const leg2 = sliceLineStations(getLineList(ol), hubSt, destSt);
            if (leg1.length > 1 && leg2.length > 1) {
              const merged = [...leg1, ...leg2.slice(1)];
              const tMins = Math.round(merged.length * 2.2 + hub.walkMins + 4);

              if (!routes.some(r => r.transferStation && r.transferStation.id === hub.id)) {
                routes.push({
                  routeId: routes.length,
                  title: `${hub.name} 환승 대안`,
                  badgeType: 'transfer',
                  badgeText: `${hub.name} 환승`,
                  timeMins: tMins,
                  transfers: 1,
                  isTransfer: true,
                  transferStation: hubSt,
                  lineFrom: ol,
                  lineTo: hl,
                  lineFromName: getLineName(ol),
                  lineToName: getLineName(hl),
                  stations: merged,
                  coords: merged.map(s => [s.lat, s.lng]),
                  sections: [
                    { type: 'SUBWAY', line: ol, lineName: getLineName(ol), from: originSt.name, to: hub.name, stations: leg1, timeMins: Math.round(leg1.length * 2.2) },
                    { type: 'TRANSFER', stationName: hub.name, walkMins: hub.walkMins, fromLine: getLineName(ol), toLine: getLineName(hl) },
                    { type: 'SUBWAY', line: ol, lineName: getLineName(ol), from: hub.name, to: destSt.name, stations: leg2, timeMins: Math.round(leg2.length * 2.2) }
                  ]
                });
              }
            }
          }
        }
      });
    }

    // 2. 환승 경로 탐색 (모든 가능한 1회 환승 허브 탐색)
    transferHubs.forEach(hub => {
      const hubSt = ALL_STATIONS_MASTER.find(s => s.id === hub.id);
      if (!hubSt) return;

      for (const ol of oLines) {
        if (!hub.lines.includes(ol)) continue;
        for (const dl of dLines) {
          if (!hub.lines.includes(dl)) continue;
          if (ol === dl) continue; // 직통 제외

          const leg1 = sliceLineStations(getLineList(ol), originSt, hubSt);
          const leg2 = sliceLineStations(getLineList(dl), hubSt, destSt);

          if (leg1.length >= 1 && leg2.length >= 1) {
            leg1[leg1.length - 1] = { ...hubSt };
            leg2[0] = { ...hubSt };
            const merged = [...leg1, ...leg2.slice(1)];
            merged[0] = { ...originSt };
            merged[merged.length - 1] = { ...destSt };

            const time1 = Math.round(leg1.length * 2.2);
            const time2 = Math.round(leg2.length * 2.2);
            const totalMins = Math.max(8, time1 + time2 + hub.walkMins);

            const alreadyExists = routes.some(r => r.transferStation && r.transferStation.id === hub.id);
            if (!alreadyExists) {
              routes.push({
                routeId: routes.length,
                title: `${hub.name} 환승 (${getLineName(ol)} ➔ ${getLineName(dl)})`,
                badgeType: routes.length === 0 ? 'direct' : 'transfer',
                badgeText: routes.length === 0 ? '추천 환승' : `${hub.name} 환승`,
                timeMins: totalMins,
                transfers: 1,
                isTransfer: true,
                transferStation: hubSt,
                lineFrom: ol,
                lineTo: dl,
                lineFromName: getLineName(ol),
                lineToName: getLineName(dl),
                stations: merged,
                coords: merged.map(s => [s.lat, s.lng]),
                sections: [
                  { type: 'SUBWAY', line: ol, lineName: getLineName(ol), from: originSt.name, to: hub.name, stations: leg1, timeMins: time1 },
                  { type: 'TRANSFER', stationName: hub.name, walkMins: hub.walkMins, fromLine: getLineName(ol), toLine: getLineName(dl) },
                  { type: 'SUBWAY', line: dl, lineName: getLineName(dl), from: hub.name, to: destSt.name, stations: leg2, timeMins: time2 }
                ]
              });
            }
          }
        }
      }
    });

    // 3. 만약 경로가 2개 미만이라면, 2회 환승 대안(수영역 3호선 ➔ 연산역 1호선 등) 추가
    if (routes.length < 2) {
      const suyeong = ALL_STATIONS_MASTER.find(s => s.id === 'ST-BS-SY') || { id: 'ST-BS-SY', name: '수영역', lat: 35.1610, lng: 129.1165 };
      const yeonsan = ALL_STATIONS_MASTER.find(s => s.id === 'ST-BS-YS') || { id: 'ST-BS-YS', name: '연산역', lat: 35.1861, lng: 129.0815 };

      const leg1 = sliceLineStations(SUBWAY_LINE_2, originSt, suyeong);
      const leg2 = sliceLineStations(SUBWAY_LINE_3, suyeong, yeonsan);
      const leg3 = sliceLineStations(SUBWAY_LINE_1, yeonsan, destSt);

      if (leg1.length > 0 && leg2.length > 0 && leg3.length > 0) {
        const merged = [...leg1, ...leg2.slice(1), ...leg3.slice(1)];
        const totalMins = Math.round(merged.length * 2.2 + 6);

        routes.push({
          routeId: routes.length,
          title: '수영·연산역 2회 환승 (쾌적 우회)',
          badgeType: 'alt',
          badgeText: '2회 환승 대안',
          timeMins: totalMins,
          transfers: 2,
          isTransfer: true,
          transferStation: suyeong,
          lineFrom: '2',
          lineTo: '1',
          lineFromName: '2호선',
          lineToName: '1호선',
          stations: merged,
          coords: merged.map(s => [s.lat, s.lng]),
          sections: [
            { type: 'SUBWAY', line: '2', lineName: '2호선', from: originSt.name, to: '수영역', stations: leg1, timeMins: Math.round(leg1.length * 2.2) },
            { type: 'TRANSFER', stationName: '수영역', walkMins: 3, fromLine: '2호선', toLine: '3호선' },
            { type: 'SUBWAY', line: '3', lineName: '3호선', from: '수영역', to: '연산역', stations: leg2, timeMins: Math.round(leg2.length * 2.2) },
            { type: 'TRANSFER', stationName: '연산역', walkMins: 3, fromLine: '3호선', toLine: '1호선' },
            { type: 'SUBWAY', line: '1', lineName: '1호선', from: '연산역', to: destSt.name, stations: leg3, timeMins: Math.round(leg3.length * 2.2) }
          ]
        });
      }
    }

    // 소요 시간순 정렬 (직통이 있으면 직통은 0번에 고정)
    if (routes.length > 1 && !routes[0].isTransfer) {
      const direct = routes[0];
      const rest = routes.slice(1).sort((a, b) => a.timeMins - b.timeMins);
      return [direct, ...rest];
    }

    return routes.sort((a, b) => a.timeMins - b.timeMins);
  }

  function buildDynamicSubwayPath(originSt, destSt) {
    const allRoutes = buildAllSubwayRoutes(originSt, destSt);
    const selectedIdx = state.selectedSubwayRouteIndex || 0;
    return allRoutes[selectedIdx] || allRoutes[0];
  }

  /**
   * 구간 내 경유 정류소 목록 추출
   */
  function extractTransitStopsBetween(originSt, destSt) {
    const list = [];
    const minLat = Math.min(originSt.lat, destSt.lat) - 0.003;
    const maxLat = Math.max(originSt.lat, destSt.lat) + 0.003;
    const minLng = Math.min(originSt.lng, destSt.lng) - 0.003;
    const maxLng = Math.max(originSt.lng, destSt.lng) + 0.003;

    ALL_STATIONS_MASTER.forEach(st => {
      if (st.lat >= minLat && st.lat <= maxLat && st.lng >= minLng && st.lng <= maxLng) {
        list.push({
          id: st.id,
          name: st.name,
          lat: st.lat,
          lng: st.lng,
          isOrigin: (st.id === originSt.id),
          isDest: (st.id === destSt.id)
        });
      }
    });

    // 출발역과 도착역 보장
    if (!list.some(s => s.isOrigin)) {
      list.unshift({ id: originSt.id, name: originSt.name, lat: originSt.lat, lng: originSt.lng, isOrigin: true });
    }
    if (!list.some(s => s.isDest)) {
      list.push({ id: destSt.id, name: destSt.name, lat: destSt.lat, lng: destSt.lng, isDest: true });
    }

    return list;
  }

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

    const initialBusCoords = (state.activeBusCoords && state.activeBusCoords.length > 0)
      ? state.activeBusCoords
      : CORRIDORS.SUYEONG_EAST.map(p => [p.lat, p.lng]);

    const initialSubwayCoords = (state.activeSubwayCoords && state.activeSubwayCoords.length > 0)
      ? state.activeSubwayCoords
      : SUBWAY_LINE_2.slice(5, 12).map(s => [s.lat, s.lng]);

    leafletMap = L.map(el.mapContainer, {
      center: [35.1465, 129.0740],
      zoom: 14,
      zoomSnap: 1,
      zoomDelta: 1,
      minZoom: 10,
      maxZoom: 19,
      zoomControl: false
    });
    L.control.zoom({ position: 'bottomright' }).addTo(leafletMap);

    currentTileLayer = tileLayers.google.addTo(leafletMap);

    stationMarkersGroup = L.layerGroup().addTo(leafletMap);
    liveBusMarkersGroup = L.layerGroup().addTo(leafletMap);
    hotplaceMarkerGroup = L.layerGroup().addTo(leafletMap);

    busPolyline = L.polyline(initialBusCoords, {
      color: '#2563EB',
      weight: 6,
      opacity: 0.95,
      smoothFactor: 1
    }).addTo(leafletMap);

    subwayPolyline = L.polyline(initialSubwayCoords, {
      color: '#10B981',
      weight: 6,
      opacity: 0.95,
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

    // Transit Lines Styling: 버스 이용 시 버스 노선 경로대로만 표시, 지하철 이용 시 지하철 노선 경로대로만 표시
    if (busPolyline && subwayPolyline) {
      if (isSubway) {
        // [지하철 모드]: 버스 도로선은 완전 숨김, 지하철 선로만 노선 고유색으로 표시
        busPolyline.setStyle({ opacity: 0, weight: 0 });

        const subData = buildDynamicSubwayPath(state.originStation, state.destStation);
        let subColor = '#10B981'; // 2호선 초록
        if (!subData.isTransfer) {
          if (subData.lineFrom === '1') subColor = '#F97316'; // 1호선 주황
          else if (subData.lineFrom === '3') subColor = '#D97706'; // 3호선 호박
          else if (subData.lineFrom === 'DONGHAE') subColor = '#0284C7'; // 동해선 블루
        } else {
          subColor = '#6366F1'; // 환승 구간 인디고
        }

        subwayPolyline.setLatLngs(subData.coords);
        subwayPolyline.setStyle({
          color: subColor,
          opacity: 0.95,
          weight: 6,
          dashArray: null
        });
      } else {
        // [버스 모드]: 지하철 선로는 완전 숨김, 버스 노선 도로 궤적만 선명하게 표시
        subwayPolyline.setStyle({ opacity: 0, weight: 0 });

        busPolyline.setStyle({
          color: '#2563EB',
          opacity: 0.95,
          weight: 6,
          dashArray: null
        });
      }
    }

    if (isSubway) {
      // 1. Subway Mode
      const subwayData = buildDynamicSubwayPath(state.originStation, state.destStation);
      const subStations = subwayData.stations;

      subStations.forEach((st, idx) => {
        const isStart = (idx === 0);
        const isEnd = (idx === subStations.length - 1);
        const isTransferStation = subwayData.isTransfer && subwayData.transferStation && (st.id === subwayData.transferStation.id || st.name === subwayData.transferStation.name);

        if (showAllStops || isStart || isEnd || isTransferStation) {
          let pinHtml = `<div class="leaflet-subway-pin"></div>`;
          if (isStart) pinHtml = `<div class="leaflet-current-pin" title="탑승역"></div>`;
          else if (isEnd) pinHtml = `<div class="leaflet-dest-pin" title="도착역"></div>`;
          else if (isTransferStation) pinHtml = `<div class="leaflet-station-pin" style="background:#F59E0B; border:2px solid #FFF;" title="환승역"></div>`;

          const isKeyPin = isStart || isEnd || isTransferStation;
          const customIcon = L.divIcon({
            className: 'custom-station-wrapper',
            html: pinHtml,
            iconSize: isKeyPin ? [18, 18] : [10, 10],
            iconAnchor: isKeyPin ? [9, 9] : [5, 5]
          });

          const marker = L.marker([st.lat, st.lng], { icon: customIcon }).addTo(stationMarkersGroup);
          if (isKeyPin || showAllStops) {
            const tooltipText = isTransferStation
              ? `<b>🔄 ${st.name} (환승)</b>`
              : `<b>${st.name}</b>`;
            marker.bindTooltip(tooltipText, {
              permanent: isKeyPin,
              direction: 'bottom',
              offset: [0, 8],
              className: isTransferStation ? 'subway-tooltip transfer-tooltip' : 'subway-tooltip'
            });
          }
        }
      });

      // Subway train beacon along the line
      if (subwayData.coords.length >= 2) {
        const midIdx = Math.floor(subwayData.coords.length / 2);
        const trainCoord = subwayData.coords[midIdx];
        const nextStName = subStations[midIdx] ? subStations[midIdx].name : '';
        const prevStName = subStations[Math.max(0, midIdx - 1)] ? subStations[Math.max(0, midIdx - 1)].name : '';
        const beaconText = subwayData.isTransfer
          ? `🚇 환승 연계 전동차 (${prevStName}➔${nextStName})`
          : `🚇 ${subwayData.lineFromName} 전동차 (${prevStName}➔${nextStName})`;

        const subwayTrainIcon = L.divIcon({
          className: 'subway-beacon-wrapper',
          html: `<div class="leaflet-subway-beacon">${beaconText}</div>`,
          iconSize: [160, 24],
          iconAnchor: [80, 12]
        });
        L.marker(trainCoord, { icon: subwayTrainIcon }).addTo(liveBusMarkersGroup);
      }

    } else {
      // 2. Bus Mode
      const stops = (state.activeTransitStops && state.activeTransitStops.length > 0)
        ? state.activeTransitStops
        : extractTransitStopsBetween(state.originStation, state.destStation);

      stops.forEach(st => {
        const isStartOrEnd = (st.isOrigin || st.isDest);
        if (showAllStops || isStartOrEnd) {
          let pinHtml = `<div class="leaflet-station-pin"></div>`;
          if (st.isOrigin) pinHtml = `<div class="leaflet-current-pin" title="탑승지"></div>`;
          else if (st.isDest) pinHtml = `<div class="leaflet-dest-pin" title="목적지"></div>`;

          const customIcon = L.divIcon({
            className: 'custom-station-wrapper',
            html: pinHtml,
            iconSize: isStartOrEnd ? [18, 18] : [10, 10],
            iconAnchor: isStartOrEnd ? [9, 9] : [5, 5]
          });

          const marker = L.marker([st.lat, st.lng], { icon: customIcon }).addTo(stationMarkersGroup);
          marker.bindTooltip(`<b>${st.name}</b>`, {
            permanent: isStartOrEnd,
            direction: 'bottom',
            offset: [0, 8],
            className: 'station-tooltip'
          });
        }
      });

      // Live vehicle position on the active road path
      let bus1Sec = 180;
      if (state.cachedMatches && state.cachedMatches.length > 0 && state.cachedMatches[0].arrivalInfo) {
        bus1Sec = state.cachedMatches[0].arrivalInfo.remainingSeconds;
      }
      const busNum = (state.cachedMatches && state.cachedMatches.length > 0) ? state.cachedMatches[0].busNumber : '24';

      const fallbackRoad = CORRIDORS.SUYEONG_EAST.map(p => [p.lat, p.lng]);
      const activeRoad = (state.activeBusCoords && state.activeBusCoords.length > 0) ? state.activeBusCoords : fallbackRoad;
      const busCoord = interpolateRoadPosition(activeRoad, bus1Sec);
      const busIcon = L.divIcon({
        className: 'bus-icon-wrapper',
        html: `<div class="leaflet-bus-icon"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="3" width="16" height="15" rx="2.5"/><path d="M4 11h16"/><circle cx="8" cy="15" r="1.5" fill="currentColor"/><circle cx="16" cy="15" r="1.5" fill="currentColor"/></svg><span>${busNum}번 (${Math.max(1, Math.round(bus1Sec / 60))}분 전)</span></div>`,
        iconSize: [100, 24],
        iconAnchor: [50, 12]
      });

      L.marker(busCoord, { icon: busIcon }).addTo(liveBusMarkersGroup);
    }

    // 3. Meetup Friend Location (오직 실시간 약속 탭을 보고 있을 때만 표출)
    if (state.activeTab === 'appointments' && state.activeAppointment && state.activeAppointment.friendName) {
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

    // 5. MIDPOINT RECOMMENDATION BEACON (골드 중간역 마커 - 실시간 약속 또는 중간역 확인 시 표출)
    if (state.activeTab === 'appointments' && state.midpointResult && hotplaceMarkerGroup) {
      const mid = state.midpointResult;
      const midIcon = L.divIcon({
        className: 'custom-station-wrapper',
        html: `<div class="leaflet-midpoint-pin" title="${mid.stationName}"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      const midMarker = L.marker([mid.latitude, mid.longitude], { icon: midIcon }).addTo(hotplaceMarkerGroup);
      midMarker.bindTooltip(`<b>⭐ 최적 중간 만남역: ${mid.stationName} (편차 ${mid.timeDifferenceMinutes}분)</b>`, {
        permanent: true,
        direction: 'top',
        offset: [0, -12],
        className: 'midpoint-tooltip'
      });
    }

    // 6. APPOINTMENT COURSE PLACES POLYLINE & STEP BADGES (오직 실시간 약속 탭을 누를 때만 1차, 2차 핀 표출!)
    if (state.activeTab === 'appointments' && state.activeAppointment && state.activeAppointment.coursePlaces && state.activeAppointment.coursePlaces.length > 0 && hotplaceMarkerGroup) {
      const courses = state.activeAppointment.coursePlaces;
      const courseCoords = [];
      courses.forEach((c, idx) => {
        if (c.latitude && c.longitude) {
          courseCoords.push([c.latitude, c.longitude]);
          const stepIcon = L.divIcon({
            className: 'custom-station-wrapper',
            html: `<div style="background:#7C3AED; color:white; font-size:10px; font-weight:800; border:2px solid white; border-radius:10px; padding:2px 6px; box-shadow:0 2px 6px rgba(0,0,0,0.3);">${idx + 1}차</div>`,
            iconSize: [36, 20],
            iconAnchor: [18, 10]
          });
          const m = L.marker([c.latitude, c.longitude], { icon: stepIcon }).addTo(hotplaceMarkerGroup);
          m.bindTooltip(`<b>[${idx + 1}차] ${c.name}</b>`, {
            permanent: false,
            direction: 'top',
            offset: [0, -10]
          });
        }
      });

      if (courseCoords.length > 1) {
        L.polyline(courseCoords, {
          color: '#7C3AED',
          weight: 4,
          opacity: 0.85,
          dashArray: '6, 6'
        }).addTo(hotplaceMarkerGroup);
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
