package com.naverbus.model;

public record DestinationConfig(
        String stationId,
        String stationName,
        double latitude,
        double longitude,
        String memo,
        String updatedAt
) {}
