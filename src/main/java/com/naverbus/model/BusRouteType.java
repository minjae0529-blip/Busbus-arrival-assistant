package com.naverbus.model;

public enum BusRouteType {
    TRUNK("간선", "#2B78E4", "#EAF2FF"),     // 파랑
    BRANCH("지선", "#03C75A", "#E8F8F0"),    // 초록
    RAPID("광역", "#F34D4D", "#FEECEC"),     // 빨강
    CIRCULAR("순환", "#F6A609", "#FEF6E7"),  // 노랑
    TOWN("마을", "#52C41A", "#F0F9EB");      // 연두

    private final String label;
    private final String color;
    private final String bgColor;

    BusRouteType(String label, String color, String bgColor) {
        this.label = label;
        this.color = color;
        this.bgColor = bgColor;
    }

    public String getLabel() {
        return label;
    }

    public String getColor() {
        return color;
    }

    public String getBgColor() {
        return bgColor;
    }
}
