package com.naverbus.service;

import com.naverbus.model.Appointment;
import com.naverbus.model.MidpointResult;
import com.naverbus.model.RecommendedPlace;
import com.naverbus.model.Station;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class AppointmentService {

    private final Map<String, Appointment> appointmentStore = new ConcurrentHashMap<>();

    public AppointmentService() {
        // 기본 샘플 약속 데이터 (서면역 오후 12:30 약속)
        Appointment defaultApp = new Appointment(
                "MEET-2490",
                "서면 카페 & 점심 약속",
                "ST-BS-SMN",
                "서면역(서면지하상가)",
                LocalDateTime.now().plusMinutes(25), // 현재 시각 기준 25분 뒤
                "민재(나)",
                35.13750, 129.10050 // 경성대
        );
        defaultApp.setFriendName("지민");
        defaultApp.setFriendLat(35.14800); // 친구는 남천/광안 부근에서 이동 중
        defaultApp.setFriendLng(129.11200);

        // 기본 추천 약속 풀코스 (1차 맛집 ➔ 2차 카페 ➔ 3차 보드게임 놀거리)
        defaultApp.getCoursePlaces().add(new RecommendedPlace(
                "칸다소바 서면점 (마제소바 맛집)",
                "음식점 · 일식 라멘",
                "도쿄 라멘 대회 우승 정통 마제소바 & 바질 아부라소바 전문점",
                "도보 4분",
                5, 4.8, 3890,
                "웨이팅 맛집 1위",
                "30~50분 식사 추천",
                "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=700&auto=format&fit=crop&q=80",
                35.15710, 129.06220,
                "ALL",
                "부산 부산진구 동천로 105 1층"
        ));
        defaultApp.getCoursePlaces().add(new RecommendedPlace(
                "블랙업커피 서면본점",
                "카페 · 베이커리",
                "시그니처 해수염 커피와 갓 구운 패스츄리로 유명한 서면 대표 카페",
                "도보 3분",
                7, 4.7, 5420,
                "네이버 검색 1위",
                "20~40분 대기 추천",
                "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=700&auto=format&fit=crop&q=80",
                35.15620, 129.05890,
                "ALL",
                "부산 부산진구 서전로10번길 41"
        ));
        defaultApp.getCoursePlaces().add(new RecommendedPlace(
                "레드버튼 서면점 (보드게임 카페)",
                "놀거리 · 보드게임 카페",
                "프라이빗 룸에서 친구와 600여 종의 보드게임 & 치킨 스낵 즐기기",
                "도보 3분",
                1, 4.8, 3890,
                "친구 놀거리 1위",
                "1~2시간 플레이 추천",
                "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=700&auto=format&fit=crop&q=80",
                35.15580, 129.05980,
                "FRIEND",
                "부산 부산진구 중앙대로692번길 46 3층"
        ));

        appointmentStore.put(defaultApp.getId(), defaultApp);
    }

    public List<Appointment> getAllAppointments() {
        return new ArrayList<>(appointmentStore.values());
    }

    public Optional<Appointment> getAppointment(String id) {
        return Optional.ofNullable(appointmentStore.get(id));
    }

    public Appointment createAppointment(String title, String destinationId, String destinationName,
                                         LocalDateTime targetTime, String creatorName, double lat, double lng) {
        String id = "MEET-" + (1000 + new Random().nextInt(9000));
        Appointment appointment = new Appointment(id, title, destinationId, destinationName, targetTime, creatorName, lat, lng);
        appointmentStore.put(id, appointment);
        return appointment;
    }

    public boolean joinAppointment(String id, String friendName, double lat, double lng) {
        Appointment app = appointmentStore.get(id);
        if (app != null) {
            app.setFriendName(friendName);
            app.setFriendLat(lat);
            app.setFriendLng(lng);
            return true;
        }
        return false;
    }

    public boolean updateLocation(String id, boolean isCreator, double lat, double lng) {
        Appointment app = appointmentStore.get(id);
        if (app != null) {
            if (isCreator) {
                app.setCreatorLat(lat);
                app.setCreatorLng(lng);
            } else {
                app.setFriendLat(lat);
                app.setFriendLng(lng);
            }
            return true;
        }
        return false;
    }

    public boolean notifyDelay(String id, String who, int delayMinutes, String reason) {
        Appointment app = appointmentStore.get(id);
        if (app != null) {
            app.setDelayMinutes(delayMinutes);
            app.setDelayReason(reason);
            app.setDelaySender(who);
            if (app.getTargetTime() != null) {
                app.setTargetTime(app.getTargetTime().plusMinutes(delayMinutes));
            }
            return true;
        }
        return false;
    }

    public boolean addCoursePlace(String id, RecommendedPlace place) {
        Appointment app = appointmentStore.get(id);
        if (app != null && place != null) {
            for (RecommendedPlace p : app.getCoursePlaces()) {
                if (p.getName().equals(place.getName())) {
                    return false; // 이미 등록됨
                }
            }
            app.getCoursePlaces().add(place);
            return true;
        }
        return false;
    }

    public boolean removeCoursePlace(String id, String placeName) {
        Appointment app = appointmentStore.get(id);
        if (app != null && placeName != null) {
            return app.getCoursePlaces().removeIf(p -> p.getName().equals(placeName));
        }
        return false;
    }

    public boolean clearCoursePlaces(String id) {
        Appointment app = appointmentStore.get(id);
        if (app != null) {
            app.getCoursePlaces().clear();
            return true;
        }
        return false;
    }

    public boolean updateAppointmentDestination(String id, String destinationId, String destinationName) {
        Appointment app = appointmentStore.get(id);
        if (app != null) {
            app.setDestinationId(destinationId);
            app.setDestinationName(destinationName);
            return true;
        }
        return false;
    }

    /**
     * 위밋플레이스 / 만날각 스타일 두 참여자의 중간 지점(Midpoint Station) 알고리즘
     */
    public MidpointResult findMidpointStation(double myLat, double myLng, double friendLat, double friendLng,
                                              List<Station> stations, PlaceRecommendService placeRecommendService) {
        if (stations == null || stations.isEmpty()) {
            return null;
        }

        Station bestStation = null;
        double minScore = Double.MAX_VALUE;
        double bestMyDist = 0;
        int bestMyMin = 0;
        double bestFriendDist = 0;
        int bestFriendMin = 0;
        int bestDiff = 0;

        for (Station s : stations) {
            double myDist = GeoLocationService.calculateDistanceMeters(myLat, myLng, s.latitude(), s.longitude());
            double friendDist = GeoLocationService.calculateDistanceMeters(friendLat, friendLng, s.latitude(), s.longitude());

            // 대중교통 이동 시간 추정 (기본 대기 3분 + 380m 당 1분)
            int myMin = Math.max(2, (int) Math.round(3.0 + (myDist / 380.0)));
            int friendMin = Math.max(2, (int) Math.round(3.0 + (friendDist / 380.0)));
            int diff = Math.abs(myMin - friendMin);
            int total = myMin + friendMin;

            // 정규화 편차 점수 (편차가 적을수록, 총 이동시간이 적을수록 유리)
            double score = (diff * 2.5) + (total * 0.7);

            if (score < minScore) {
                minScore = score;
                bestStation = s;
                bestMyDist = myDist;
                bestMyMin = myMin;
                bestFriendDist = friendDist;
                bestFriendMin = friendMin;
                bestDiff = diff;
            }
        }

        if (bestStation == null) {
            bestStation = stations.get(0);
        }

        String reason = String.format(
                "내 위치에서 약 %d분, 친구 위치에서 약 %d분 소요 (이동 시간 편차 %d분)으로 두 사람 모두에게 가장 공평한 중간 만남 지점입니다.",
                bestMyMin, bestFriendMin, bestDiff
        );

        List<RecommendedPlace> nearby = placeRecommendService.getRecommendations(bestStation.id(), 20);

        return new MidpointResult(
                bestStation.id(),
                bestStation.name(),
                bestStation.latitude(),
                bestStation.longitude(),
                Math.round(bestMyDist * 10.0) / 10.0,
                bestMyMin,
                Math.round(bestFriendDist * 10.0) / 10.0,
                bestFriendMin,
                bestDiff,
                reason,
                nearby
        );
    }
}
