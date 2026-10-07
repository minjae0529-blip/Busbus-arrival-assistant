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
        // 서면역 주변 (네이버/구글 검색 랭킹 상위권 실시간 인기 장소 - 친구 놀거리, 맛집, 카페, 문화 등 11선)
        List<RecommendedPlace> seomyeonPlaces = Arrays.asList(
                // 1. 친구와 놀거리: 보드게임 카페
                new RecommendedPlace(
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
                ),
                // 2. 친구와 놀거리: 방탈출 카페
                new RecommendedPlace(
                        "비트포비아 서면점 (방탈출 테마파크)",
                        "놀거리 · 방탈출 카페",
                        "친구와 팀워크로 단서를 풀어 탈출하는 프리미엄 몰입형 테마 룸",
                        "도보 4분",
                        2, 4.7, 2410,
                        "스릴 만점 랭킹 1위",
                        "60분 탈출 도전",
                        "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=700&auto=format&fit=crop&q=80",
                        35.15520, 129.06010,
                        "FRIEND",
                        "부산 부산진구 중앙대로692번길 38 5층"
                ),
                // 3. 친구와 놀거리: 감성 포토부스
                new RecommendedPlace(
                        "하루필름 서면점 (우정 네컷사진)",
                        "놀거리 · 포토부스",
                        "친구 오기 전/후 인생샷 건지는 쿨톤 우정 네컷사진 & 촬영 소품",
                        "도보 2분",
                        3, 4.8, 4120,
                        "인생샷 핫플 1위",
                        "10~20분 촬영 추천",
                        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=700&auto=format&fit=crop&q=80",
                        35.15490, 129.06120,
                        "FRIEND",
                        "부산 부산진구 동천로 70 1층"
                ),
                // 4. 친구와 놀거리: 락볼링장 & 라운지 펍
                new RecommendedPlace(
                        "스매싱볼 서면점 (락볼링장 & 펍)",
                        "놀거리 · 락볼링 라운지",
                        "화려한 네온 조명과 신나는 비트 속에서 즐기는 친구와 내기 볼링",
                        "도보 5분",
                        4, 4.6, 1720,
                        "저녁 모임 인기",
                        "40~80분 플레이 추천",
                        "https://images.unsplash.com/photo-1538388149542-5e24932d11a8?w=700&auto=format&fit=crop&q=80",
                        35.15650, 129.05850,
                        "FRIEND",
                        "부산 부산진구 서전로10번길 61"
                ),
                // 5. 맛집: 마제소바 & 라멘
                new RecommendedPlace(
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
                ),
                // 6. 맛집: 구워주는 고깃집
                new RecommendedPlace(
                        "구덕포 끝집고기 서면점",
                        "음식점 · 삼겹살 고기 맛집",
                        "직원이 직접 완벽하게 구워주는 육즙 가득 통삼겹 & 해물라면 파티",
                        "도보 5분",
                        6, 4.7, 2650,
                        "친구 모임 고기 맛집",
                        "50~80분 식사 추천",
                        "https://images.unsplash.com/photo-1544025162-d76694265947?w=700&auto=format&fit=crop&q=80",
                        35.15450, 129.06180,
                        "FRIEND",
                        "부산 부산진구 전포대로209번길 17"
                ),
                // 7. 카페: 시그니처 베이커리 카페
                new RecommendedPlace(
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
                ),
                // 8. 혼자 여유: 대형 서점 & 북카페
                new RecommendedPlace(
                        "교보문고 부산점 & 북카페",
                        "서점 · 문화공간",
                        "조용하게 베스트셀러 신간을 읽거나 디자인 문구를 둘러보기 좋은 대형 서점",
                        "도보 4분",
                        8, 4.6, 2150,
                        "혼자 여유 1위",
                        "15~45분 대기 추천",
                        "https://images.unsplash.com/photo-1507842229452-789274934358?w=700&auto=format&fit=crop&q=80",
                        35.15340, 129.05960,
                        "SOLO",
                        "부산 부산진구 중앙대로 658 지하 1층"
                ),
                // 9. 맛집: 나폴리 화덕피자
                new RecommendedPlace(
                        "도재 서면점 (화덕피자 & 파스타)",
                        "음식점 · 이탈리안 화덕피자",
                        "48시간 숙성 도우로 참나무 화덕에 구운 마르게리따 & 생면 파스타",
                        "도보 4분",
                        9, 4.8, 1980,
                        "분위기 다이닝",
                        "40~60분 식사 추천",
                        "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=700&auto=format&fit=crop&q=80",
                        35.15540, 129.06290,
                        "FRIEND",
                        "부산 부산진구 전포대로186번길 34"
                ),
                // 10. 카페: 스페셜티 드립커피
                new RecommendedPlace(
                        "모모스커피 서면 플래그십",
                        "카페 · 핸드드립 커피",
                        "월드바리스타 챔피언의 싱글오리진 필터 커피와 중정 대나무 정원 뷰",
                        "도보 5분",
                        10, 4.8, 4120,
                        "구글 평점 4.8점",
                        "30~50분 대기 추천",
                        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=700&auto=format&fit=crop&q=80",
                        35.15750, 129.06280,
                        "SOLO",
                        "부산 부산진구 전포대로 199번길 12"
                ),
                // 11. 소품샵: 전포 감성 편집샵
                new RecommendedPlace(
                        "도토리 다락방 (전포 빈티지 소품샵)",
                        "소품샵 · 라이프스타일",
                        "아기자기한 캐릭터 문구, 핸드메이드 캔들, 인형이 가득한 소품샵",
                        "도보 5분",
                        11, 4.8, 1640,
                        "감성 소품 1위",
                        "15~30분 구경 추천",
                        "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=700&auto=format&fit=crop&q=80",
                        35.15610, 129.06350,
                        "ALL",
                        "부산 부산진구 서전로38번길 62"
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
