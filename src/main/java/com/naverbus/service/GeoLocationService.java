package com.naverbus.service;

import com.naverbus.model.NearbyStation;
import com.naverbus.model.Station;

import java.util.Comparator;
import java.util.List;

public class GeoLocationService {

    private static final double EARTH_RADIUS_METERS = 6371000.0;
    private static final double WALKING_SPEED_METERS_PER_MINUTE = 75.0; // 약 4.5 km/h

    /**
     * Haversine 공식을 사용한 두 GPS 좌표 간의 미터(m) 단위 정밀 거리 계산
     */
    public static double calculateDistanceMeters(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_METERS * c;
    }

    /**
     * 도보 소요 시간(분) 계산 (최소 1분)
     */
    public static int calculateWalkingMinutes(double distanceMeters) {
        int minutes = (int) Math.round(distanceMeters / WALKING_SPEED_METERS_PER_MINUTE);
        return Math.max(1, minutes);
    }

    /**
     * 주어진 위도/경도 기준으로 반경(maxRadiusMeters) 내의 정류소들을 거리순으로 정렬하여 반환
     */
    public List<NearbyStation> findNearbyStations(List<Station> allStations, double lat, double lng, double maxRadiusMeters) {
        return allStations.stream()
                .map(station -> {
                    double dist = calculateDistanceMeters(lat, lng, station.latitude(), station.longitude());
                    int walking = calculateWalkingMinutes(dist);
                    return new NearbyStation(station, Math.round(dist * 10.0) / 10.0, walking);
                })
                .filter(ns -> ns.distanceMeters() <= maxRadiusMeters)
                .sorted(Comparator.comparingDouble(NearbyStation::distanceMeters))
                .toList();
    }
}
