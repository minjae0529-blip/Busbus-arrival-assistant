package com.naverbus.model;

import java.util.ArrayList;
import java.util.List;

public class RecommendedPlace {
    private String name;           // 장소명 / 브랜드 상호
    private String category;       // 카테고리 (일식, 양식, 고기맛집, 카페/디저트, 복합문화공간 등)
    private String description;    // 한줄 설명
    private String walkMinutes;    // 목적지 기준 도보 시간 (예: "도보 3분")
    private int naverSearchRank;   // 네이버 검색 랭킹 순위
    private double googleRating;   // 네이버/구글 평점 (예: 4.8)
    private int reviewCount;       // 리뷰 수
    private String badge;          // 상표/인증 뱃지 (예: "네이버 플레이스 1위", "블루리본 2024", "줄서는식당")
    private String suitableStay;   // 추천 체류 시간 (예: "30~50분 추천")
    private String imageUrl;       // 장소 및 대표 메뉴 고화질 사진 URL
    private double latitude;       // 위도
    private double longitude;      // 경도
    private String theme;          // "FRIEND", "SOLO", "FOOD", "CAFE", "PLAY", "ALL"
    private String address;        // 상세 도로명 주소

    // [신규 확장 필드]: 메뉴판 및 상세 상표/분위기 정보
    private List<String> menuList = new ArrayList<>(); // 대표 메뉴판 (메뉴명 & 실제 가격)
    private String signatureMenu;                      // 시그니처 대표 메뉴
    private String priceRange;                         // 가격대 (예: "1만원대", "1~2만원대", "5천원~1만원")
    private String moodTags;                           // 분위기/특징 태그 (예: "#자가제면 #혼밥환영 #데이트코스 #인스타감성")
    private String businessHours;                      // 영업시간 (예: "11:30 ~ 21:30")
    private String phone;                              // 매장 전화번호

    public RecommendedPlace() {}

    // 기존 14개 인자 생성자 (호환성 유지)
    public RecommendedPlace(String name, String category, String description, String walkMinutes,
                            int naverSearchRank, double googleRating, int reviewCount, String badge,
                            String suitableStay, String imageUrl, double latitude, double longitude,
                            String theme, String address) {
        this(name, category, description, walkMinutes, naverSearchRank, googleRating, reviewCount, badge,
             suitableStay, imageUrl, latitude, longitude, theme, address,
             new ArrayList<>(), "", "1~2만원대", "#인기맛집", "11:00 ~ 21:00", "정보 없음");
    }

    // 신규 풀 패키지 생성자 (메뉴판 및 상표/분위기 포함)
    public RecommendedPlace(String name, String category, String description, String walkMinutes,
                            int naverSearchRank, double googleRating, int reviewCount, String badge,
                            String suitableStay, String imageUrl, double latitude, double longitude,
                            String theme, String address,
                            List<String> menuList, String signatureMenu, String priceRange,
                            String moodTags, String businessHours, String phone) {
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
        this.latitude = latitude;
        this.longitude = longitude;
        this.theme = theme;
        this.address = address;
        this.menuList = (menuList != null) ? menuList : new ArrayList<>();
        this.signatureMenu = signatureMenu;
        this.priceRange = priceRange;
        this.moodTags = moodTags;
        this.businessHours = businessHours;
        this.phone = phone;
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
    public double getLatitude() { return latitude; }
    public double getLongitude() { return longitude; }
    public String getTheme() { return theme; }
    public String getAddress() { return address; }

    public List<String> getMenuList() { return menuList; }
    public void setMenuList(List<String> menuList) { this.menuList = menuList; }

    public String getSignatureMenu() { return signatureMenu; }
    public void setSignatureMenu(String signatureMenu) { this.signatureMenu = signatureMenu; }

    public String getPriceRange() { return priceRange; }
    public void setPriceRange(String priceRange) { this.priceRange = priceRange; }

    public String getMoodTags() { return moodTags; }
    public void setMoodTags(String moodTags) { this.moodTags = moodTags; }

    public String getBusinessHours() { return businessHours; }
    public void setBusinessHours(String businessHours) { this.businessHours = businessHours; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
}
