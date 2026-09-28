package com.naverbus.model;

import java.util.List;

public record BusRoute(
        String id,
        String busNumber,
        BusRouteType type,
        String direction,
        String firstTime,
        String lastTime,
        int intervalMinutes,
        List<String> stationIds
) {}
