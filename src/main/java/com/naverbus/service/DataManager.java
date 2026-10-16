package com.naverbus.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.naverbus.model.*;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

public class DataManager {

    private final ObjectMapper objectMapper;
    private final File dataDir;
    private final File favoritesFile;
    private final File destinationConfigFile;

    private final Map<String, Station> stationsById = new ConcurrentHashMap<>();
    private final Map<String, BusRoute> routesById = new ConcurrentHashMap<>();
    private final List<FavoriteItem> favorites = new CopyOnWriteArrayList<>();
    private volatile DestinationConfig destinationConfig;

    public DataManager() {
        this(new File(System.getProperty("user.dir"), "data"));
    }

    public DataManager(File dataDir) {
        this.dataDir = dataDir;
        if (!dataDir.exists()) {
            dataDir.mkdirs();
        }
        this.favoritesFile = new File(dataDir, "favorites.json");
        this.destinationConfigFile = new File(dataDir, "destination.json");

        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.enable(SerializationFeature.INDENT_OUTPUT);

        initDefaultStationsAndRoutes();
        loadFavorites();
        loadDestinationConfig();
    }

    private void initDefaultStationsAndRoutes() {
        // 부산광역시 버스정보관리시스템(BIMS) 실제 5자리 ARS 번호 및 국토교통부 TAGO 실측 GPS 좌표
        List<Station> defaultStations = List.of(
                new Station("ST-BS-WPO", "백운포종점 (용호동)", 35.10452, 129.11287, "07078", List.of(), "오륙도스카이워크 방면"),
                new Station("ST-BS-ORYK", "오륙도스카이워크.SK뷰", 35.10127, 129.12192, "07182", List.of(), "이기대입구 방면"),
                new Station("ST-BS-IGD", "이기대입구.용호사거리", 35.12327, 129.11257, "07133", List.of(), "부경대대연캠퍼스 방면"),
                new Station("ST-BS-PKNU", "부경대대연캠퍼스", 35.13288, 129.10128, "07011", List.of(), "경성대·부경대역 방면"),
                new Station("ST-BS-KSU", "경성대·부경대역 (경성대학교)", 35.13654, 129.09794, "07013", List.of("부산2호선"), "대연역 방면"),
                new Station("ST-BS-NC", "남천역.대남교차로", 35.14150, 129.10850, "07167", List.of("부산2호선"), "경성대·부경대역 방면"),
                new Station("ST-BS-GRS", "금련산역 (수영구)", 35.14650, 129.11280, "14055", List.of("부산2호선"), "남천역 방면"),
                new Station("ST-BS-GA", "광안역 (수영구 광안동)", 35.15250, 129.11550, "14062", List.of("부산2호선"), "금련산역 방면"),
                new Station("ST-BS-SY", "수영교차로.수영역", 35.16100, 129.11650, "14089", List.of("부산2호선", "부산3호선"), "광안역 방면"),
                new Station("ST-BS-DY", "대연역 (부산고려병원)", 35.13563, 129.09516, "07016", List.of("부산2호선"), "못골역 방면"),
                new Station("ST-BS-MG", "남구청.못골역 (못골시장)", 35.13484, 129.08411, "07165", List.of("부산2호선"), "지게골역 방면"),
                new Station("ST-BS-JGG", "지게골역", 35.13508, 129.07565, "07053", List.of("부산2호선"), "문현교차로 방면"),
                new Station("ST-BS-MH", "문현교차로.문현역", 35.13959, 129.06748, "07041", List.of("부산2호선"), "국제금융센터 방면"),
                new Station("ST-BS-BIFC", "국제금융센터·부산은행역", 35.14548, 129.06705, "07067", List.of("부산2호선"), "전포역 방면"),
                new Station("ST-BS-JP", "전포역.전포카페거리", 35.15420, 129.06320, "05705", List.of("부산2호선"), "서면역 방면"),
                new Station("ST-BS-SMN", "서면역.서면지하상가", 35.15517, 129.05925, "05710", List.of("부산1호선", "부산2호선"), "부암역 방면"),
                new Station("ST-BS-BA", "부암역 (온종합병원)", 35.15980, 129.05050, "05722", List.of("부산2호선"), "가야역 방면")
        );

        for (Station s : defaultStations) {
            stationsById.put(s.id(), s);
        }

        // 부산 BIMS 실제 운행 노선 (24, 83, 83-1, 40, 108, 138, 20번)
        List<BusRoute> defaultRoutes = List.of(
                new BusRoute(
                        "R-BS-24", "24", BusRouteType.TRUNK, "서면역.서면지하상가 방면", "05:00", "23:00", 5,
                        List.of("ST-BS-WPO", "ST-BS-ORYK", "ST-BS-IGD", "ST-BS-PKNU", "ST-BS-KSU", "ST-BS-DY", "ST-BS-MG", "ST-BS-JGG", "ST-BS-MH", "ST-BS-BIFC", "ST-BS-JP", "ST-BS-SMN")
                ),
                new BusRoute(
                        "R-BS-83", "83", BusRouteType.TRUNK, "서면·부전시장 방면", "04:50", "22:50", 6,
                        List.of("ST-BS-SY", "ST-BS-GA", "ST-BS-GRS", "ST-BS-NC", "ST-BS-KSU", "ST-BS-DY", "ST-BS-MG", "ST-BS-JGG", "ST-BS-MH", "ST-BS-BIFC", "ST-BS-JP", "ST-BS-SMN")
                ),
                new BusRoute(
                        "R-BS-83-1", "83-1", BusRouteType.TRUNK, "서면 경유 사직동 방면", "04:55", "22:50", 7,
                        List.of("ST-BS-SY", "ST-BS-GA", "ST-BS-GRS", "ST-BS-NC", "ST-BS-KSU", "ST-BS-DY", "ST-BS-MG", "ST-BS-JGG", "ST-BS-MH", "ST-BS-BIFC", "ST-BS-JP", "ST-BS-SMN")
                ),
                new BusRoute(
                        "R-BS-108", "108", BusRouteType.TRUNK, "서면·엄궁 방면", "05:00", "22:40", 8,
                        List.of("ST-BS-SY", "ST-BS-GA", "ST-BS-GRS", "ST-BS-NC", "ST-BS-KSU", "ST-BS-DY", "ST-BS-MG", "ST-BS-JGG", "ST-BS-MH", "ST-BS-BIFC", "ST-BS-JP", "ST-BS-SMN")
                ),
                new BusRoute(
                        "R-BS-138", "138", BusRouteType.TRUNK, "서면·장림 방면", "04:55", "22:30", 9,
                        List.of("ST-BS-IGD", "ST-BS-PKNU", "ST-BS-KSU", "ST-BS-DY", "ST-BS-MG", "ST-BS-JGG", "ST-BS-MH", "ST-BS-BIFC", "ST-BS-JP", "ST-BS-SMN")
                ),
                new BusRoute(
                        "R-BS-40", "40", BusRouteType.TRUNK, "부산역·구덕운동장 방면", "04:40", "22:45", 8,
                        List.of("ST-BS-SY", "ST-BS-GA", "ST-BS-GRS", "ST-BS-NC", "ST-BS-KSU", "ST-BS-DY", "ST-BS-MG", "ST-BS-JGG", "ST-BS-MH")
                ),
                new BusRoute(
                        "R-BS-20", "20", BusRouteType.BRANCH, "서면·백운포 방면", "05:00", "23:10", 10,
                        List.of("ST-BS-WPO", "ST-BS-IGD", "ST-BS-PKNU", "ST-BS-KSU", "ST-BS-NC", "ST-BS-GRS", "ST-BS-GA", "ST-BS-SY", "ST-BS-SMN")
                )
        );

        for (BusRoute r : defaultRoutes) {
            routesById.put(r.id(), r);
        }
    }

    private void loadFavorites() {
        if (favoritesFile.exists()) {
            try {
                List<FavoriteItem> loaded = objectMapper.readValue(favoritesFile, new TypeReference<List<FavoriteItem>>() {});
                favorites.clear();
                favorites.addAll(loaded);
                return;
            } catch (IOException e) {
                System.err.println("[WARN] Failed to load favorites: " + e.getMessage());
            }
        }

        // 기본 추천 즐겨찾기: 부산 24번 버스 & 경성대·부경대역
        favorites.add(new FavoriteItem(
                UUID.randomUUID().toString(),
                FavoriteItem.FavoriteType.BUS,
                "24",
                "24번 버스",
                "수영로·대연동·서면 메인 노선",
                BusRouteType.TRUNK,
                LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        ));
        favorites.add(new FavoriteItem(
                UUID.randomUUID().toString(),
                FavoriteItem.FavoriteType.STATION,
                "ST-BS-KSU",
                "경성대·부경대역 (수영로)",
                "수영구/남구 환승 거점",
                null,
                LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        ));
        saveFavorites();
    }

    public synchronized void saveFavorites() {
        try {
            objectMapper.writeValue(favoritesFile, favorites);
        } catch (IOException e) {
            System.err.println("[ERROR] Failed to save favorites: " + e.getMessage());
        }
    }

    private void loadDestinationConfig() {
        if (destinationConfigFile.exists()) {
            try {
                destinationConfig = objectMapper.readValue(destinationConfigFile, DestinationConfig.class);
                return;
            } catch (IOException e) {
                System.err.println("[WARN] Failed to load destination config: " + e.getMessage());
            }
        }

        // 기본 목적지 설정: 서면역·서면지하상가 (부산 24번 종점/회차지)
        Station seomyeon = stationsById.get("ST-BS-SMN");
        if (seomyeon != null) {
            destinationConfig = new DestinationConfig(
                    seomyeon.id(),
                    seomyeon.name(),
                    seomyeon.latitude(),
                    seomyeon.longitude(),
                    "기본 설정 목적지 (부산 최대 도심/환승)",
                    LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
            );
            saveDestinationConfig();
        }
    }

    public synchronized void saveDestinationConfig() {
        try {
            if (destinationConfig != null) {
                objectMapper.writeValue(destinationConfigFile, destinationConfig);
            }
        } catch (IOException e) {
            System.err.println("[ERROR] Failed to save destination config: " + e.getMessage());
        }
    }

    // Getters and Mutators
    public List<Station> getAllStations() {
        return new ArrayList<>(stationsById.values());
    }

    public Station getStation(String stationId) {
        return stationsById.get(stationId);
    }

    public Station findStationByName(String query) {
        String trimmed = query.trim().toLowerCase();
        for (Station s : stationsById.values()) {
            if (s.name().toLowerCase().contains(trimmed)) {
                return s;
            }
        }
        return null;
    }

    public List<BusRoute> getAllRoutes() {
        return new ArrayList<>(routesById.values());
    }

    public BusRoute getRoute(String routeId) {
        return routesById.get(routeId);
    }

    public BusRoute findRouteByNumber(String busNumber) {
        String num = busNumber.trim();
        for (BusRoute r : routesById.values()) {
            if (r.busNumber().equalsIgnoreCase(num)) {
                return r;
            }
        }
        return null;
    }

    public List<FavoriteItem> getFavorites() {
        return new ArrayList<>(favorites);
    }

    public FavoriteItem addFavorite(FavoriteItem.FavoriteType type, String targetId, String name, String memo) {
        BusRouteType routeType = null;
        if (type == FavoriteItem.FavoriteType.BUS) {
            BusRoute route = findRouteByNumber(name);
            if (route != null) {
                routeType = route.type();
            }
        }

        FavoriteItem item = new FavoriteItem(
                UUID.randomUUID().toString(),
                type,
                targetId,
                name,
                memo != null ? memo : "",
                routeType,
                LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        );
        favorites.add(item);
        saveFavorites();
        return item;
    }

    public boolean removeFavorite(String id) {
        boolean removed = favorites.removeIf(item -> item.id().equals(id));
        if (removed) {
            saveFavorites();
        }
        return removed;
    }

    public boolean isFavoriteBus(String busNumber) {
        return favorites.stream()
                .anyMatch(f -> f.type() == FavoriteItem.FavoriteType.BUS &&
                        (f.name().equalsIgnoreCase(busNumber) || f.targetId().equalsIgnoreCase(busNumber)));
    }

    public DestinationConfig getDestinationConfig() {
        return destinationConfig;
    }

    public DestinationConfig setDestination(String stationId, String memo) {
        Station station = stationsById.get(stationId);
        if (station == null) {
            station = findStationByName(stationId);
        }
        if (station != null) {
            this.destinationConfig = new DestinationConfig(
                    station.id(),
                    station.name(),
                    station.latitude(),
                    station.longitude(),
                    memo != null ? memo : "설정된 목적지",
                    LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
            );
            saveDestinationConfig();
            return destinationConfig;
        }
        return null;
    }

    public Station registerCustomStation(String name, double lat, double lng, String arsId, List<String> subwayLines) {
        String id = "ST-CUSTOM-" + UUID.randomUUID().toString().substring(0, 6);
        Station station = new Station(id, name, lat, lng, arsId, subwayLines != null ? subwayLines : List.of(), "상행/하행");
        stationsById.put(id, station);
        return station;
    }

    public BusRoute registerCustomRoute(String busNumber, BusRouteType type, String direction, List<String> stationIds) {
        String id = "R-CUSTOM-" + UUID.randomUUID().toString().substring(0, 6);
        BusRoute route = new BusRoute(id, busNumber, type, direction, "05:00", "23:30", 10, stationIds);
        routesById.put(id, route);
        return route;
    }
}
