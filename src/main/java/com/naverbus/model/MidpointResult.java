package com.naverbus.model;

import java.util.List;

public record MidpointResult(
        String stationId,
        String stationName,
        double latitude,
        double longitude,
        double myDistanceMeters,
        int myEstimatedMinutes,
        double friendDistanceMeters,
        int friendEstimatedMinutes,
        int timeDifferenceMinutes,
        String recommendationReason,
        List<RecommendedPlace> nearbyHotplaces
) {}
