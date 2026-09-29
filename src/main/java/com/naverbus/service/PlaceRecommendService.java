package com.naverbus.service;

import com.naverbus.model.RecommendedPlace;

import java.util.*;

public class PlaceRecommendService {

    // 목적지별(서면, 대연 등) 네이버/구글 검색 랭킹 기반 핫플레이스 DB
    private final Map<String, List<RecommendedPlace>> placeDatabase = new HashMap<>();

    public PlaceRecommendService() {
        initDatabase();
    }

    private void initDatabase() {
        // 서면역 주변 (네이버/구글 검색 랭킹 상위권 실시간 인기 장소)
        List<RecommendedPlace> seomyeonPlaces = Arrays.asList(
                new RecommendedPlace(
                        "블랙업커피 서면본점",
                        "스페셜티 카페",
                        "시그니처 해수염 커피로 유명한 서면 대표 베이커리 카페",
                        "도보 3분",
                        1, 4.7, 3420,
                        "네이버 검색 1위",
                        "20~40분 대기 추천"
                ),
                new RecommendedPlace(
                        "교보문고 부산점 & 북카페",
                        "서점 / 라이프스타일",
                        "조용하게 책을 읽거나 신간 둘러보기 최적인 약속 대기 명소",
                        "도보 4분",
                        2, 4.6, 2150,
                        "약속 전 들르기 1위",
                        "15~45분 대기 추천"
                ),
                new RecommendedPlace(
                        "포토이즘 & 소품샵 골목",
                        "포토부스 / 편집샵",
                        "친구 오기 전 네컷사진 촬영 및 귀여운 라이프스타일 굿즈 구경",
                        "도보 2분",
                        3, 4.8, 1890,
                        "핫플레이스 랭킹 3위",
                        "10~25분 대기 추천"
                ),
                new RecommendedPlace(
                        "모모스커피 서면 플래그십",
                        "월드바리스타 챔피언 카페",
                        "스페셜티 필터 커피와 차분한 정원 뷰를 즐길 수 있는 힐링 공간",
                        "도보 5분",
                        4, 4.8, 4120,
                        "구글 평점 4.8점",
                        "30~50분 대기 추천"
                )
        );

        placeDatabase.put("ST-BS-SMN", seomyeonPlaces); // 서면역
        placeDatabase.put("DEFAULT", seomyeonPlaces);
    }

    public List<RecommendedPlace> getRecommendations(String destinationStationId, int earlyArrivalMinutes) {
        List<RecommendedPlace> list = placeDatabase.getOrDefault(destinationStationId, placeDatabase.get("DEFAULT"));
        // 조기 도착 시간에 맞춤 필터링 또는 전체 반환
        return list;
    }
}
