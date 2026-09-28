package com.naverbus.model;

import java.time.LocalDateTime;

public record FavoriteItem(
        String id,
        FavoriteType type,
        String targetId,
        String name,
        String memo,
        BusRouteType routeType,
        String createdAt
) {
    public enum FavoriteType {
        BUS,
        STATION
    }
}
