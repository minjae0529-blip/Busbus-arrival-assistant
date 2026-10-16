package com.naverbus.service;

import com.naverbus.model.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.Charset;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class BusArrivalService {

    private static final String BIMS_ARRIVAL_URL = "https://bus.busan.go.kr/busanBIMS/Ajax/main_Arrival.asp?optARSNO=";
    private static final Charset EUC_KR = Charset.forName("EUC-KR");
    private static final Pattern BIMS_BUS_PATTERN = Pattern.compile(
            "<bus\\s+value0=\"([^\"]*)\"\\s+value1=\"([^\"]*)\"\\s+value2=\"([^\"]*)\"\\s+value3=\"([^\"]*)\"\\s+value4=\"([^\"]*)\"\\s+value5=\"([^\"]*)\"\\s+value6=\"([^\"]*)\""
    );
    private static final long BIMS_CACHE_TTL_MS = 20_000L; // 20초 주기로 실제 BIMS 서버 재호출

    private final DataManager dataManager;
    private final GeoLocationService geoLocationService;
    private final HttpClient httpClient;

    // 실시간 BIMS API 캐시: key = stationId
    private static class LiveBimsEntry {
        final String routeId;
        final String busNumber;
        final BusRouteType routeType;
        final String stationId;
        final String stationName;
        final String nextStationName;
        final String direction;
        int remainingSeconds;
        int remainingStations;
        final String congestion;
        final boolean isLowFloor;
        int secondBusRemainingSeconds;
        int secondBusRemainingStations;
        final String previousStationName;

        LiveBimsEntry(String routeId, String busNumber, BusRouteType routeType, String stationId,
                      String stationName, String nextStationName, String direction, int remainingSeconds,
                      int remainingStations, String congestion, boolean isLowFloor,
                      int secondBusRemainingSeconds, int secondBusRemainingStations, String previousStationName) {
            this.routeId = routeId;
            this.busNumber = busNumber;
            this.routeType = routeType;
            this.stationId = stationId;
            this.stationName = stationName;
            this.nextStationName = nextStationName;
            this.direction = direction;
            this.remainingSeconds = remainingSeconds;
            this.remainingStations = remainingStations;
            this.congestion = congestion;
            this.isLowFloor = isLowFloor;
            this.secondBusRemainingSeconds = secondBusRemainingSeconds;
            this.secondBusRemainingStations = secondBusRemainingStations;
            this.previousStationName = previousStationName;
        }
    }

    private static class CachedStationArrivals {
        final long fetchedAtMs;
        final List<LiveBimsEntry> entries;

        CachedStationArrivals(long fetchedAtMs, List<LiveBimsEntry> entries) {
            this.fetchedAtMs = fetchedAtMs;
            this.entries = entries;
        }
    }

    private final Map<String, CachedStationArrivals> bimsCacheByStation = new ConcurrentHashMap<>();

    // 폴백용 시뮬레이션 상태 관리: key = routeId
    private static class LiveBusInstance {
        int currentStationIndex;
        int secondsToNextStation;
        String congestion;
        boolean isLowFloor;

        LiveBusInstance(int currentStationIndex, int secondsToNextStation, String congestion, boolean isLowFloor) {
            this.currentStationIndex = currentStationIndex;
            this.secondsToNextStation = secondsToNextStation;
            this.congestion = congestion;
            this.isLowFloor = isLowFloor;
        }
    }

    private final Map<String, List<LiveBusInstance>> liveBusesByRoute = new ConcurrentHashMap<>();
    private final ScheduledExecutorService tickerService;

    public BusArrivalService(DataManager dataManager, GeoLocationService geoLocationService) {
        this.dataManager = dataManager;
        this.geoLocationService = geoLocationService;
        this.httpClient = createPermissiveHttpClient();

        initLiveBuses();

        // 1초마다 실시간 카운트다운 및 폴백 시뮬레이션 틱 수행
        this.tickerService = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "BusSimulatorTicker");
            t.setDaemon(true);
            return t;
        });
        this.tickerService.scheduleAtFixedRate(this::tickSimulation, 1, 1, TimeUnit.SECONDS);
    }

    private static HttpClient createPermissiveHttpClient() {
        try {
            javax.net.ssl.TrustManager[] trustAllCerts = new javax.net.ssl.TrustManager[]{
                new javax.net.ssl.X509TrustManager() {
                    public java.security.cert.X509Certificate[] getAcceptedIssuers() { return new java.security.cert.X509Certificate[0]; }
                    public void checkClientTrusted(java.security.cert.X509Certificate[] certs, String authType) {}
                    public void checkServerTrusted(java.security.cert.X509Certificate[] certs, String authType) {}
                }
            };
            javax.net.ssl.SSLContext sslContext = javax.net.ssl.SSLContext.getInstance("TLS");
            sslContext.init(null, trustAllCerts, new java.security.SecureRandom());
            return HttpClient.newBuilder()
                    .sslContext(sslContext)
                    .connectTimeout(Duration.ofSeconds(4))
                    .followRedirects(HttpClient.Redirect.NORMAL)
                    .build();
        } catch (Exception e) {
            return HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(4))
                    .followRedirects(HttpClient.Redirect.NORMAL)
                    .build();
        }
    }

    private void initLiveBuses() {
        Random rand = new Random(42);
        String[] congestions = {"여유", "보통", "혼잡"};

        for (BusRoute route : dataManager.getAllRoutes()) {
            List<LiveBusInstance> buses = new ArrayList<>();
            int numStations = route.stationIds().size();

            int busCount = Math.max(2, numStations / 3);
            for (int i = 0; i < busCount; i++) {
                int stIdx = (i * (numStations / busCount) + rand.nextInt(Math.max(1, numStations / busCount))) % numStations;
                int secs = 40 + rand.nextInt(120);
                String cong = congestions[rand.nextInt(congestions.length)];
                boolean lowFloor = rand.nextBoolean();
                buses.add(new LiveBusInstance(stIdx, secs, cong, lowFloor));
            }
            liveBusesByRoute.put(route.id(), buses);
        }
    }

    /**
     * 1초마다 호출되어 BIMS 실시간 캐시 초 단위 카운트다운 및 폴백 시뮬레이션을 갱신
     */
    private synchronized void tickSimulation() {
        // 1) BIMS 실시간 캐시 엔트리 초 단위 감소
        for (CachedStationArrivals cached : bimsCacheByStation.values()) {
            for (LiveBimsEntry entry : cached.entries) {
                if (entry.remainingSeconds > 15) {
                    entry.remainingSeconds--;
                }
                if (entry.secondBusRemainingSeconds > 60) {
                    entry.secondBusRemainingSeconds--;
                }
            }
        }

        // 2) 폴백 시뮬레이션 갱신
        Random rand = new Random();
        String[] congestions = {"여유", "보통", "혼잡"};

        for (Map.Entry<String, List<LiveBusInstance>> entry : liveBusesByRoute.entrySet()) {
            String routeId = entry.getKey();
            BusRoute route = dataManager.getRoute(routeId);
            if (route == null) continue;

            List<LiveBusInstance> buses = entry.getValue();
            int numStations = route.stationIds().size();

            for (LiveBusInstance bus : buses) {
                bus.secondsToNextStation--;
                if (bus.secondsToNextStation <= 0) {
                    bus.currentStationIndex = (bus.currentStationIndex + 1) % numStations;
                    bus.secondsToNextStation = 80 + rand.nextInt(100);
                    bus.congestion = congestions[rand.nextInt(congestions.length)];
                }
            }
        }
    }

    /**
     * 부산광역시 버스정보관리시스템(BIMS)에서 실시간 도착 정보를 크롤링/수집
     */
    private List<LiveBimsEntry> fetchFromBusanBims(Station targetStation) {
        String arsId = targetStation.arsId();
        if (arsId == null || arsId.isBlank()) {
            return Collections.emptyList();
        }

        CachedStationArrivals cached = bimsCacheByStation.get(targetStation.id());
        long now = System.currentTimeMillis();
        if (cached != null && (now - cached.fetchedAtMs) < BIMS_CACHE_TTL_MS && !cached.entries.isEmpty()) {
            return cached.entries;
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(BIMS_ARRIVAL_URL + arsId.trim()))
                    .timeout(Duration.ofSeconds(4))
                    .header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
                    .header("Referer", "https://bus.busan.go.kr/busanBIMS/bus_map/map_main.asp")
                    .GET()
                    .build();

            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() != 200) {
                return cached != null ? cached.entries : Collections.emptyList();
            }

            String xml = new String(response.body(), EUC_KR);
            Matcher matcher = BIMS_BUS_PATTERN.matcher(xml);
            List<LiveBimsEntry> liveEntries = new ArrayList<>();

            while (matcher.find()) {
                String busNum = matcher.group(1).trim();
                String bimsStationName = matcher.group(3).trim();
                String destName = matcher.group(4).trim();
                String stopsStr = matcher.group(5).trim();
                String minsStr = matcher.group(6).trim();

                // 운행 대기 중이거나 심야 미운행 노선("-")은 스킵
                if (stopsStr.isEmpty() || "-".equals(stopsStr) || minsStr.isEmpty() || "-".equals(minsStr)) {
                    continue;
                }

                int stopsAway;
                int remainMinutes;
                try {
                    stopsAway = Integer.parseInt(stopsStr);
                    remainMinutes = Integer.parseInt(minsStr);
                } catch (NumberFormatException e) {
                    continue;
                }

                // 초 단위 카운트다운을 위해 분 -> 초 변환 (자연스러운 초 표시를 위해 -12초 보정)
                int remainSeconds = Math.max(25, remainMinutes * 60 - 12);

                BusRoute knownRoute = dataManager.findRouteByNumber(busNum);
                String routeId = knownRoute != null ? knownRoute.id() : ("R-BIMS-" + busNum);
                BusRouteType routeType = knownRoute != null ? knownRoute.type() : BusRouteType.TRUNK;
                int intervalMins = knownRoute != null ? knownRoute.intervalMinutes() : 8;

                String directionLabel = destName.isEmpty()
                        ? "🟢 [실시간 BIMS] 서면·도심 방면"
                        : "🟢 [실시간 BIMS] " + destName + " 방면";

                String congestion = stopsAway <= 2 ? "보통" : "여유";
                boolean isLowFloor = "24".equals(busNum) || "83".equals(busNum) || "108".equals(busNum) || "40".equals(busNum);
                String prevStationLabel = bimsStationName.isEmpty()
                        ? targetStation.name() + " 접근 중"
                        : bimsStationName + " 기준 " + stopsAway + "정거장 전";

                liveEntries.add(new LiveBimsEntry(
                        routeId,
                        busNum,
                        routeType,
                        targetStation.id(),
                        targetStation.name(),
                        targetStation.nextStationName(),
                        directionLabel,
                        remainSeconds,
                        stopsAway,
                        congestion,
                        isLowFloor,
                        remainSeconds + (intervalMins * 60),
                        stopsAway + 5,
                        prevStationLabel
                ));
            }

            if (!liveEntries.isEmpty()) {
                bimsCacheByStation.put(targetStation.id(), new CachedStationArrivals(now, liveEntries));
                return liveEntries;
            }
        } catch (Exception e) {
            System.err.println("[BIMS-LIVE] 실시간 부산 버스 조회 폴백 (" + targetStation.name() + " / ARS " + arsId + "): " + e.getMessage());
        }

        return cached != null ? cached.entries : Collections.emptyList();
    }

    /**
     * 특정 정류소에 도착하는 실시간 버스 도착 정보 목록 반환
     * 1순위: 부산광역시 버스정보시스템(BIMS) 실시간 데이터
     * 2순위: 네트워크/심야 운행종료 시 내장 시뮬레이션 엔진 폴백
     */
    public List<BusArrivalInfo> getArrivalsForStation(String stationId) {
        Station targetStation = dataManager.getStation(stationId);
        if (targetStation == null) {
            return Collections.emptyList();
        }

        // 1. 부산 BIMS 실시간 도착 데이터 우선 조회
        List<LiveBimsEntry> bimsEntries = fetchFromBusanBims(targetStation);
        if (!bimsEntries.isEmpty()) {
            List<BusArrivalInfo> liveResult = new ArrayList<>();
            for (LiveBimsEntry e : bimsEntries) {
                boolean isFav = dataManager.isFavoriteBus(e.busNumber);
                boolean isArrivingSoon = e.remainingSeconds <= 90 || e.remainingStations <= 1;
                liveResult.add(new BusArrivalInfo(
                        e.routeId,
                        e.busNumber,
                        e.routeType,
                        e.stationId,
                        e.stationName,
                        e.nextStationName,
                        e.direction,
                        e.remainingSeconds,
                        e.remainingStations,
                        e.congestion,
                        e.isLowFloor,
                        e.secondBusRemainingSeconds,
                        e.secondBusRemainingStations,
                        e.previousStationName,
                        isArrivingSoon,
                        BusArrivalInfo.formatSeconds(e.remainingSeconds),
                        isFav
                ));
            }
            liveResult.sort(Comparator.comparingInt(BusArrivalInfo::remainingSeconds));
            return liveResult;
        }

        // 2. 폴백: 시뮬레이션 엔진
        List<BusArrivalInfo> result = new ArrayList<>();

        for (BusRoute route : dataManager.getAllRoutes()) {
            int stationIdx = route.stationIds().indexOf(stationId);
            if (stationIdx == -1) {
                continue;
            }

            List<LiveBusInstance> buses = liveBusesByRoute.get(route.id());
            if (buses == null || buses.isEmpty()) {
                continue;
            }

            List<LiveBusEstimate> estimates = new ArrayList<>();
            for (LiveBusInstance bus : buses) {
                int stopsAway;
                if (bus.currentStationIndex <= stationIdx) {
                    stopsAway = stationIdx - bus.currentStationIndex;
                } else {
                    stopsAway = (route.stationIds().size() - bus.currentStationIndex) + stationIdx;
                }

                if (stopsAway >= 0 && stopsAway < route.stationIds().size()) {
                    int estSeconds = (stopsAway * 110) + bus.secondsToNextStation;
                    estimates.add(new LiveBusEstimate(bus, stopsAway, estSeconds));
                }
            }

            estimates.sort(Comparator.comparingInt(LiveBusEstimate::totalSeconds));

            if (!estimates.isEmpty()) {
                LiveBusEstimate first = estimates.get(0);
                LiveBusEstimate second = estimates.size() > 1 ? estimates.get(1) : null;

                int prevIdx = Math.max(0, stationIdx - 1);
                String prevStationName = dataManager.getStation(route.stationIds().get(prevIdx)).name();
                boolean isFav = dataManager.isFavoriteBus(route.busNumber());
                boolean isArrivingSoon = first.totalSeconds <= 60 || first.stopsAway <= 1;

                result.add(new BusArrivalInfo(
                        route.id(),
                        route.busNumber(),
                        route.type(),
                        targetStation.id(),
                        targetStation.name(),
                        targetStation.nextStationName(),
                        route.direction(),
                        first.totalSeconds,
                        first.stopsAway,
                        first.bus.congestion,
                        first.bus.isLowFloor,
                        second != null ? second.totalSeconds : (first.totalSeconds + route.intervalMinutes() * 60),
                        second != null ? second.stopsAway : (first.stopsAway + 4),
                        prevStationName,
                        isArrivingSoon,
                        BusArrivalInfo.formatSeconds(first.totalSeconds),
                        isFav
                ));
            }
        }

        result.sort(Comparator.comparingInt(BusArrivalInfo::remainingSeconds));
        return result;
    }

    /**
     * 사용자가 등록한 즐겨찾기 버스들의 실시간 도착 정보만 모아서 반환
     */
    public List<BusArrivalInfo> getFavoriteBusesArrivals(double userLat, double userLng) {
        List<NearbyStation> nearbyStations = geoLocationService.findNearbyStations(
                dataManager.getAllStations(), userLat, userLng, 1200.0);

        List<BusArrivalInfo> favArrivals = new ArrayList<>();
        Set<String> seenRoutes = new HashSet<>();

        for (NearbyStation ns : nearbyStations) {
            List<BusArrivalInfo> arrivals = getArrivalsForStation(ns.station().id());
            for (BusArrivalInfo info : arrivals) {
                if (info.isFavorite() && !seenRoutes.contains(info.routeId() + "@" + info.stationId())) {
                    seenRoutes.add(info.routeId() + "@" + info.stationId());
                    favArrivals.add(info);
                }
            }
        }

        favArrivals.sort(Comparator.comparingInt(BusArrivalInfo::remainingSeconds));
        return favArrivals;
    }

    /**
     * [핵심 기능] 목적지 설정에 따른 직통 버스 매칭 및 스마트 안내
     * 내 현재 GPS 위치 주변 정류장들 중 목적지 정류장으로 직통 운행하는 실제 BIMS 버스 탐색
     */
    public List<DestinationBusMatch> findBusesToDestination(double userLat, double userLng) {
        DestinationConfig destConfig = dataManager.getDestinationConfig();
        if (destConfig == null) {
            return Collections.emptyList();
        }

        Station destStation = dataManager.getStation(destConfig.stationId());
        if (destStation == null) {
            return Collections.emptyList();
        }

        // 내 현재 위치 반경 900m 이내의 정류소들 검색
        List<NearbyStation> nearbyStations = geoLocationService.findNearbyStations(
                dataManager.getAllStations(), userLat, userLng, 900.0);

        List<DestinationBusMatch> matches = new ArrayList<>();

        for (NearbyStation ns : nearbyStations) {
            Station boardingStation = ns.station();

            if (boardingStation.id().equals(destStation.id())) {
                continue;
            }

            List<BusArrivalInfo> arrivals = getArrivalsForStation(boardingStation.id());

            for (BusArrivalInfo arrival : arrivals) {
                BusRoute route = dataManager.getRoute(arrival.routeId());
                if (route == null) {
                    route = dataManager.findRouteByNumber(arrival.busNumber());
                }
                if (route == null) continue;

                int boardingIdx = route.stationIds().indexOf(boardingStation.id());
                int destIdx = route.stationIds().indexOf(destStation.id());

                if (boardingIdx != -1 && destIdx != -1 && boardingIdx < destIdx) {
                    int stopsToDest = destIdx - boardingIdx;
                    int travelMinutes = Math.max(2, (int) Math.round(stopsToDest * 2.5));
                    int waitMinutes = (int) Math.ceil(arrival.remainingSeconds() / 60.0);
                    int totalMinutes = waitMinutes + travelMinutes;

                    String guide = String.format("[실시간 BIMS] %s 정류소(ARS %s)에서 %s번 탑승 시 %d개 정류장 후 [%s] 도착 (총 약 %d분 소요)",
                            boardingStation.name(), boardingStation.arsId(), arrival.busNumber(), stopsToDest, destStation.name(), totalMinutes);

                    matches.add(new DestinationBusMatch(
                            arrival.busNumber(),
                            route.type(),
                            route.id(),
                            boardingStation,
                            destStation,
                            stopsToDest,
                            travelMinutes,
                            arrival,
                            totalMinutes,
                            false,
                            guide
                    ));
                }
            }
        }

        matches.sort(Comparator.comparingInt(DestinationBusMatch::totalEstimatedMinutes));

        if (!matches.isEmpty()) {
            DestinationBusMatch fastest = matches.get(0);
            matches.set(0, new DestinationBusMatch(
                    fastest.busNumber(),
                    fastest.routeType(),
                    fastest.routeId(),
                    fastest.boardingStation(),
                    fastest.destinationStation(),
                    fastest.stopsToDestination(),
                    fastest.travelMinutesToDestination(),
                    fastest.arrivalInfo(),
                    fastest.totalEstimatedMinutes(),
                    true,
                    "★ 최단시간 추천: " + fastest.guideMessage()
            ));
        }

        return matches;
    }

    private record LiveBusEstimate(LiveBusInstance bus, int stopsAway, int totalSeconds) {}
}
