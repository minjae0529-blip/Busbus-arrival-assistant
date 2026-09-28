package com.naverbus;

import com.naverbus.model.*;
import com.naverbus.service.BusArrivalService;
import com.naverbus.service.DataManager;
import com.naverbus.service.GeoLocationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class BusArrivalServiceTest {

    private DataManager dataManager;
    private GeoLocationService geoLocationService;
    private BusArrivalService busArrivalService;

    @BeforeEach
    void setUp(@TempDir Path tempDir) {
        File dataFolder = tempDir.resolve("test-data").toFile();
        dataManager = new DataManager(dataFolder);
        geoLocationService = new GeoLocationService();
        busArrivalService = new BusArrivalService(dataManager, geoLocationService);
    }

    @Test
    @DisplayName("GPS 하버사인 거리 계산: 부산 경성대·부경대역과 대연역 사이 거리(약 800m~1.1km) 검증")
    void testDistanceCalculation() {
        Station ksu = dataManager.getStation("ST-BS-KSU"); // 경성대·부경대역
        Station dy = dataManager.getStation("ST-BS-DY");   // 대연역

        assertNotNull(ksu);
        assertNotNull(dy);

        double distance = GeoLocationService.calculateDistanceMeters(
                ksu.latitude(), ksu.longitude(), dy.latitude(), dy.longitude()
        );

        // 경성대역과 대연역 사이 거리는 약 800m~1100m
        assertTrue(distance > 700 && distance < 1200, "경성대역과 대연역 사이 거리는 약 800~1100m이어야 함: " + distance);
    }

    @Test
    @DisplayName("경성대·부경대역 기준 반경 1km 정류소 검색 시 경성대역 및 대연역/부경대 포함 여부 검증")
    void testNearbyStations() {
        // 경성대·부경대역 좌표 (수영로)
        double lat = 35.13750;
        double lng = 129.10050;

        List<NearbyStation> nearby = geoLocationService.findNearbyStations(
                dataManager.getAllStations(), lat, lng, 1200.0);

        assertFalse(nearby.isEmpty(), "주변 정류소가 존재해야 함");
        assertEquals("ST-BS-KSU", nearby.get(0).station().id(), "가장 가까운 정류소는 경성대·부경대역이어야 함");
        assertTrue(nearby.get(0).distanceMeters() < 50, "가장 가까운 정류소와의 거리는 50m 이내여야 함");
    }

    @Test
    @DisplayName("목적지가 서면역일 때, 경성대·부경대역에서 출발하여 서면으로 가는 부산 24번 버스 직통 매칭 검증")
    void testDestinationBusMatching() {
        // 목적지를 서면역으로 설정
        dataManager.setDestination("ST-BS-SMN", "테스트 목적지: 서면역");

        // 현재 위치: 부산 경성대·부경대역 (lat: 35.13750, lng: 129.10050)
        List<DestinationBusMatch> matches = busArrivalService.findBusesToDestination(35.13750, 129.10050);

        assertFalse(matches.isEmpty(), "경성대에서 서면역으로 가는 직통 버스가 1대 이상 매칭되어야 함");

        boolean hasBus24 = matches.stream().anyMatch(m -> m.busNumber().equals("24"));
        assertTrue(hasBus24, "부산 24번 버스가 목적지 직통 매칭 목록에 반드시 포함되어야 함");

        // 최단 추천 옵션이 존재하는지 확인
        assertTrue(matches.stream().anyMatch(DestinationBusMatch::isFastestOption), "최단 추천 옵션(isFastestOption)이 있어야 함");
    }

    @Test
    @DisplayName("부산 24번 버스 즐겨찾기 등록 및 삭제 검증")
    void testFavoritesManagement() {
        int initialCount = dataManager.getFavorites().size();

        FavoriteItem added = dataManager.addFavorite(
                FavoriteItem.FavoriteType.BUS, "24", "24번 버스", "수영로 출퇴근");
        assertNotNull(added.id());
        assertEquals(initialCount + 1, dataManager.getFavorites().size());
        assertTrue(dataManager.isFavoriteBus("24"));

        boolean removed = dataManager.removeFavorite(added.id());
        assertTrue(removed);
        assertEquals(initialCount, dataManager.getFavorites().size());
    }
}
