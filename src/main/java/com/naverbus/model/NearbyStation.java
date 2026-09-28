package com.naverbus.model;

public record NearbyStation(
        Station station,
        double distanceMeters,
        int walkingMinutes
) {}
