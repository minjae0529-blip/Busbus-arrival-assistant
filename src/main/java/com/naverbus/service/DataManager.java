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
        // 부산 수영구, 남구, 부산진구(서면) 실제 정류소 데이터 및 실측 GPS 좌표
        List<Station> defaultStations = List.of(
                new Station("ST-BS-WPO", "백운포종점 (용호동)", 35.10520, 129.11750, "07120", List.of(), "오륙도 방면"),
                new Station("ST-BS-ORYK", "오륙도스카이워크.SK뷰", 35.10180, 129.12350, "07125", List.of(), "이기대입구 방면"),
                new Station("ST-BS-IGD", "이기대입구.용호사거리", 35.12780, 129.11020, "07038", List.of(), "부경대대연캠퍼스 방면"),
                new Station("ST-BS-PKNU", "부경대대연캠퍼스", 35.13520, 129.10300, "07045", List.of(), "경성대·부경대역 방면"),
                new Station("ST-BS-KSU", "경성대·부경대역 (수영로)", 35.13750, 129.10050, "07062", List.of("부산2호선"), "대연역 방면"),
                new Station("ST-BS-NC", "남천역 (수영구 남천동)", 35.14150, 129.10850, "14012", List.of("부산2호선"), "경성대 방면"),
                new Station("ST-BS-GA", "광안역 (수영구 광안동)", 35.15250, 129.11550, "14020", List.of("부산2호선"), "남천역 방면"),
                new Station("ST-BS-SY", "수영역 (수영구 수영동)", 35.16100, 129.11650, "14030", List.of("부산2호선", "부산3호선"), "광안역 방면"),
                new Station("ST-BS-DY", "대연역.부산고려병원", 35.13550, 129.09200, "07070", List.of("부산2호선"), "못골역 방면"),
                new Station("ST-BS-MG", "못골역.남구청", 35.13600, 129.08450, "07078", List.of("부산2호선"), "지게골역 방면"),
                new Station("ST-BS-JGG", "지게골역", 35.13720, 129.07600, "07085", List.of("부산2호선"), "문현교차로 방면"),
                new Station("ST-BS-MH", "문현교차로.문현역", 35.13900, 129.06650, "07092", List.of("부산2호선"), "국제금융센터 방면"),
                new Station("ST-BS-BIFC", "국제금융센터·부산은행역", 35.14800, 129.06450, "05015", List.of("부산2호선"), "서면역 방면"),
                new Station("ST-BS-SMN", "서면역.서면지하상가", 35.15780, 129.05920, "05028", List.of("부산1호선", "부산2호선"), "전포사거리 방면")
        );

        for (Station s : defaultStations) {
            stationsById.put(s.id(), s);
        }

        // 부산 24번 및 수영구 연계 주요 시내버스 실제 노선
        List<BusRoute> defaultRoutes = List.of(
                new BusRoute(
                        "R-BS-24", "24", BusRouteType.TRUNK, "서면역 방면", "05:00", "23:00", 5,
                        List.of("ST-BS-WPO", "ST-BS-ORYK", "ST-BS-IGD", "ST-BS-PKNU", "ST-BS-KSU", "ST-BS-DY", "ST-BS-MG", "ST-BS-JGG", "ST-BS-MH", "ST-BS-BIFC", "ST-BS-SMN")
                ),
                new BusRoute(
                        "R-BS-83-1", "83-1", BusRouteType.TRUNK, "서면 경유 사직 방면", "04:55", "22:50", 7,
                        List.of("ST-BS-SY", "ST-BS-GA", "ST-BS-NC", "ST-BS-KSU", "ST-BS-DY", "ST-BS-MH", "ST-BS-SMN")
                ),
                new BusRoute(
                        "R-BS-40", "40", BusRouteType.TRUNK, "부산역·서면 방면", "04:40", "22:45", 8,
                        List.of("ST-BS-SY", "ST-BS-GA", "ST-BS-NC", "ST-BS-KSU", "ST-BS-DY", "ST-BS-BIFC", "ST-BS-SMN")
                ),
                new BusRoute(
                        "R-BS-20", "20", BusRouteType.BRANCH, "수영구청·광안리 방면", "05:00", "23:10", 10,
                        List.of("ST-BS-IGD", "ST-BS-PKNU", "ST-BS-KSU", "ST-BS-NC", "ST-BS-GA", "ST-BS-SY")
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
