package com.naverbus.model;

import java.time.LocalDateTime;

public class Appointment {
    private String id;              // 약속 고유 코드 (예: MEET-2490)
    private String title;           // 약속 이름 (예: 서면 점심 약속)
    private String destinationId;   // 약속 장소 정류장 ID (예: ST-BS-SMN)
    private String destinationName; // 약속 장소 이름 (예: 서면역)
    private LocalDateTime targetTime; // 약속 일시
    private String creatorName;     // 생성자 닉네임
    private double creatorLat;      // 생성자 실시간 위도
    private double creatorLng;      // 생성자 실시간 경도
    private String friendName;      // 참여 친구 닉네임
    private double friendLat;       // 친구 실시간 위도
    private double friendLng;       // 친구 실시간 경도
    private boolean active;         // 약속 유효 상태
    private int delayMinutes;       // 지연 시간 (분)
    private String delayReason;     // 지연 사유 (예: 버스를 놓쳤어요)
    private String delaySender;     // 지연 알림 발신자

    public Appointment() {}

    public Appointment(String id, String title, String destinationId, String destinationName,
                       LocalDateTime targetTime, String creatorName, double creatorLat, double creatorLng) {
        this.id = id;
        this.title = title;
        this.destinationId = destinationId;
        this.destinationName = destinationName;
        this.targetTime = targetTime;
        this.creatorName = creatorName;
        this.creatorLat = creatorLat;
        this.creatorLng = creatorLng;
        this.active = true;
        this.delayMinutes = 0;
        this.delayReason = null;
        this.delaySender = null;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDestinationId() { return destinationId; }
    public void setDestinationId(String destinationId) { this.destinationId = destinationId; }

    public String getDestinationName() { return destinationName; }
    public void setDestinationName(String destinationName) { this.destinationName = destinationName; }

    public LocalDateTime getTargetTime() { return targetTime; }
    public void setTargetTime(LocalDateTime targetTime) { this.targetTime = targetTime; }

    public String getCreatorName() { return creatorName; }
    public void setCreatorName(String creatorName) { this.creatorName = creatorName; }

    public double getCreatorLat() { return creatorLat; }
    public void setCreatorLat(double creatorLat) { this.creatorLat = creatorLat; }

    public double getCreatorLng() { return creatorLng; }
    public void setCreatorLng(double creatorLng) { this.creatorLng = creatorLng; }

    public String getFriendName() { return friendName; }
    public void setFriendName(String friendName) { this.friendName = friendName; }

    public double getFriendLat() { return friendLat; }
    public void setFriendLat(double friendLat) { this.friendLat = friendLat; }

    public double getFriendLng() { return friendLng; }
    public void setFriendLng(double friendLng) { this.friendLng = friendLng; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public int getDelayMinutes() { return delayMinutes; }
    public void setDelayMinutes(int delayMinutes) { this.delayMinutes = delayMinutes; }

    public String getDelayReason() { return delayReason; }
    public void setDelayReason(String delayReason) { this.delayReason = delayReason; }

    public String getDelaySender() { return delaySender; }
    public void setDelaySender(String delaySender) { this.delaySender = delaySender; }
}
