package com.naverbus.model;

public record BusArrivalInfo(
        String routeId,
        String busNumber,
        BusRouteType routeType,
        String stationId,
        String stationName,
        String nextStationName,
        String direction,
        int remainingSeconds,
        int remainingStations,
        String congestion,
        boolean isLowFloor,
        int secondBusRemainingSeconds,
        int secondBusRemainingStations,
        String previousStationName,
        boolean isArrivingSoon,
        String formattedRemainingTime,
        boolean isFavorite
) {
    public static String formatSeconds(int totalSeconds) {
        if (totalSeconds <= 30) {
            return "곧 도착";
        }
        int minutes = totalSeconds / 60;
        int seconds = totalSeconds % 60;
        if (minutes == 0) {
            return seconds + "초";
        }
        return minutes + "분 " + seconds + "초";
    }
}
