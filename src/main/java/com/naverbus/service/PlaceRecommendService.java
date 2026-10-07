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
        // 서면역 주변 (네이버/구글 검색 랭킹 상위권 실시간 인기 장소 - 카페, 음식점, 문화, 쇼핑 등)
        List<RecommendedPlace> seomyeonPlaces = Arrays.asList(
                new RecommendedPlace(
                        "블랙업커피 서면본점",
                        "카페 · 베이커리",
                        "시그니처 해수염 커피로 유명한 서면 대표 스페셜티 베이커리 카페",
                        "도보 3분",
                        1, 4.7, 3420,
                        "네이버 검색 1위",
                        "20~40분 대기 추천",
                        "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=700&auto=format&fit=crop&q=80"
                ),
                new RecommendedPlace(
                        "칸다소바 서면점 (마제소바 맛집)",
                        "음식점 · 일식 라멘",
                        "도쿄 라멘 대회 우승 정통 마제소바 & 바질 아부라소바 전문점",
                        "도보 4분",
                        2, 4.8, 2890,
                        "웨이팅 맛집 1위",
                        "30~50분 식사 추천",
                        "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=700&auto=format&fit=crop&q=80"
                ),
                new RecommendedPlace(
                        "교보문고 부산점 & 북카페",
                        "서점 · 문화공간",
                        "조용하게 베스트셀러 신간을 읽거나 디자인 문구를 둘러보기 좋은 대형 서점",
                        "도보 4분",
                        3, 4.6, 2150,
                        "약속 전 둘러보기 1위",
                        "15~45분 대기 추천",
                        "https://images.unsplash.com/photo-1507842229452-789274934358?w=700&auto=format&fit=crop&q=80"
                ),
                new RecommendedPlace(
                        "미진축산 서면직영점",
                        "음식점 · 고기 맛집",
                        "육즙 가득한 두툼한 삼겹살과 소갈비살이 일품인 서면 중심가 핫플레이스",
                        "도보 5분",
                        4, 4.7, 1940,
                        "고기 맛집 랭킹 상위",
                        "40~60분 식사 추천",
                        "https://images.unsplash.com/photo-1544025162-d76694265947?w=700&auto=format&fit=crop&q=80"
                ),
                new RecommendedPlace(
                        "모모스커피 서면 플래그십",
                        "카페 · 드립커피",
                        "월드바리스타 챔피언의 싱글오리진 필터 커피와 차분한 중정 정원 뷰",
                        "도보 5분",
                        5, 4.8, 4120,
                        "구글 평점 4.8점",
                        "30~50분 대기 추천",
                        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=700&auto=format&fit=crop&q=80"
                ),
                new RecommendedPlace(
                        "포토이즘 & 소품샵 골목",
                        "소품샵 · 포토부스",
                        "친구 오기 전 네컷사진 촬영 및 아기자기한 캐릭터 굿즈 구경",
                        "도보 2분",
                        6, 4.8, 1890,
                        "핫플레이스 랭킹 3위",
                        "10~25분 대기 추천",
                        "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=700&auto=format&fit=crop&q=80"
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
