package com.naverbus.model;

public record DestinationBusMatch(
        String busNumber,
        BusRouteType routeType,
        String routeId,
        Station boardingStation,
        Station destinationStation,
        int stopsToDestination,
        int travelMinutesToDestination,
        BusArrivalInfo arrivalInfo,
        int totalEstimatedMinutes,
        boolean isFastestOption,
        String guideMessage
) {}
