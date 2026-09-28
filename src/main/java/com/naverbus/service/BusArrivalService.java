package com.naverbus.service;

import com.naverbus.model.*;

import java.util.*;
import java.util.concurrent.*;

public class BusArrivalService {

    private final DataManager dataManager;
    private final GeoLocationService geoLocationService;

    // 실시간 버스 상태 관리: key = routeId, value = List of Active Bus Positions
    private static class LiveBusInstance {
        int currentStationIndex; // 노선 상 현재 정류소 인덱스
        int secondsToNextStation; // 다음 정류소까지 남은 초
        String congestion; // 여유, 보통, 혼잡
        boolean isLowFloor; // 저상버스

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

        initLiveBuses();

        // 1초마다 실시간 시뮬레이션 타이머 틱(Tick) 수행
        this.tickerService = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "BusSimulatorTicker");
            t.setDaemon(true);
            return t;
        });
        this.tickerService.scheduleAtFixedRate(this::tickSimulation, 1, 1, TimeUnit.SECONDS);
    }

    private void initLiveBuses() {
        Random rand = new Random(42);
        String[] congestions = {"여유", "보통", "혼잡"};

        for (BusRoute route : dataManager.getAllRoutes()) {
            List<LiveBusInstance> buses = new ArrayList<>();
            int numStations = route.stationIds().size();

            // 노선당 2~3대의 버스 인스턴스 생성
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
     * 1초마다 호출되어 버스의 주행 시뮬레이션을 갱신
     */
    private synchronized void tickSimulation() {
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
                    // 다음 정류장으로 이동
                    bus.currentStationIndex = (bus.currentStationIndex + 1) % numStations;
                    // 다음 정류장까지 이동 시간 설정 (90초 ~ 180초)
                    bus.secondsToNextStation = 80 + rand.nextInt(100);
                    // 혼잡도 소폭 변동
                    bus.congestion = congestions[rand.nextInt(congestions.length)];
                }
            }
        }
    }

    /**
     * 특정 정류소에 도착하는 실시간 버스 도착 정보 목록 반환
     */
    public List<BusArrivalInfo> getArrivalsForStation(String stationId) {
        Station targetStation = dataManager.getStation(stationId);
        if (targetStation == null) {
            return Collections.emptyList();
        }

        List<BusArrivalInfo> result = new ArrayList<>();

        for (BusRoute route : dataManager.getAllRoutes()) {
            int stationIdx = route.stationIds().indexOf(stationId);
            if (stationIdx == -1) {
                continue; // 이 정류소를 지나지 않는 노선
            }

            List<LiveBusInstance> buses = liveBusesByRoute.get(route.id());
            if (buses == null || buses.isEmpty()) {
                continue;
            }

            // 이 정류소를 향해 다가오고 있는 버스들 탐색
            List<LiveBusEstimate> estimates = new ArrayList<>();
            for (LiveBusInstance bus : buses) {
                int stopsAway;
                if (bus.currentStationIndex <= stationIdx) {
                    stopsAway = stationIdx - bus.currentStationIndex;
                } else {
                    // 순환 형태
                    stopsAway = (route.stationIds().size() - bus.currentStationIndex) + stationIdx;
                }

                if (stopsAway >= 0 && stopsAway < route.stationIds().size()) {
                    // 각 정류장당 평균 약 100초로 계산
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

        // 남은 시간순 정렬 (즐겨찾기 우선 정렬 옵션 결합 가능)
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
     * 내 현재 GPS 위치 주변 정류장들 중 목적지 정류장으로 직통 운행하는 버스 탐색
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

            // 목적지와 탑승 정류장이 같은 경우 스킵
            if (boardingStation.id().equals(destStation.id())) {
                continue;
            }

            // 이 탑승 정류소에서 이용 가능한 버스 도착 정보 조회
            List<BusArrivalInfo> arrivals = getArrivalsForStation(boardingStation.id());

            for (BusArrivalInfo arrival : arrivals) {
                BusRoute route = dataManager.getRoute(arrival.routeId());
                if (route == null) continue;

                int boardingIdx = route.stationIds().indexOf(boardingStation.id());
                int destIdx = route.stationIds().indexOf(destStation.id());

                // 조건: 노선에 출발지와 목적지가 모두 포함되어 있고, 정방향 운행 (출발지 인덱스 < 목적지 인덱스)
                if (boardingIdx != -1 && destIdx != -1 && boardingIdx < destIdx) {
                    int stopsToDest = destIdx - boardingIdx;
                    // 도심 버스 정류장 간 평균 소요시간 약 2.5분
                    int travelMinutes = Math.max(2, (int) Math.round(stopsToDest * 2.5));
                    int waitMinutes = (int) Math.ceil(arrival.remainingSeconds() / 60.0);
                    int totalMinutes = waitMinutes + travelMinutes;

                    String guide = String.format("[%s] 정류소에서 %s번 탑승 시 %d개 정류장 후 [%s] 도착 (총 약 %d분 소요)",
                            boardingStation.name(), arrival.busNumber(), stopsToDest, destStation.name(), totalMinutes);

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

        // 총 소요시간이 가장 적은 순서로 정렬
        matches.sort(Comparator.comparingInt(DestinationBusMatch::totalEstimatedMinutes));

        // 가장 빠른 옵션 뱃지 부여
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
