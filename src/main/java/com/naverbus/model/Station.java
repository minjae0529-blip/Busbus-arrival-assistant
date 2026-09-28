package com.naverbus.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record Station(
        String id,
        String name,
        double latitude,
        double longitude,
        String arsId,
        List<String> subwayLines,
        String nextStationName
) {
    public Station withDistance(double distanceMeters) {
        return new Station(id, name, latitude, longitude, arsId, subwayLines, nextStationName);
    }
}
