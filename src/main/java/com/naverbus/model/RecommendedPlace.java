package com.naverbus.model;

public class RecommendedPlace {
    private String name;           // 장소명
    private String category;       // 카테고리 (카페/디저트, 복합문화공간, 소품샵 등)
    private String description;    // 한줄 설명
    private String walkMinutes;    // 목적지 기준 도보 시간 (예: "도보 3분")
    private int naverSearchRank;   // 네이버 검색 랭킹 순위
    private double googleRating;   // 구글 평점 (예: 4.8)
    private int reviewCount;       // 리뷰 수
    private String badge;          // 태그 (예: "인기 급상승", "분위기 맛집")
    private String suitableStay;   // 추천 체류 시간 (예: "15~30분 추천")
    private String imageUrl;       // 장소 대표 고화질 사진 URL

    public RecommendedPlace() {}

    public RecommendedPlace(String name, String category, String description, String walkMinutes,
                            int naverSearchRank, double googleRating, int reviewCount, String badge, String suitableStay, String imageUrl) {
        this.name = name;
        this.category = category;
        this.description = description;
        this.walkMinutes = walkMinutes;
        this.naverSearchRank = naverSearchRank;
        this.googleRating = googleRating;
        this.reviewCount = reviewCount;
        this.badge = badge;
        this.suitableStay = suitableStay;
        this.imageUrl = imageUrl;
    }

    public String getName() { return name; }
    public String getCategory() { return category; }
    public String getDescription() { return description; }
    public String getWalkMinutes() { return walkMinutes; }
    public int getNaverSearchRank() { return naverSearchRank; }
    public double getGoogleRating() { return googleRating; }
    public int getReviewCount() { return reviewCount; }
    public String getBadge() { return badge; }
    public String getSuitableStay() { return suitableStay; }
    public String getImageUrl() { return imageUrl; }
}
