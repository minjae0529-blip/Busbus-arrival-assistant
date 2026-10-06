package com.naverbus.service;

import com.naverbus.model.Appointment;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class AppointmentService {

    private final Map<String, Appointment> appointmentStore = new ConcurrentHashMap<>();

    public AppointmentService() {
        // 기본 샘플 약속 데이터 (서면역 오후 12:30 약속)
        Appointment defaultApp = new Appointment(
                "MEET-2490",
                "서면 카페 & 점심 약속",
                "ST-BS-SMN",
                "서면역(서면지하상가)",
                LocalDateTime.now().plusMinutes(25), // 현재 시각 기준 25분 뒤
                "민재(나)",
                35.13750, 129.10050 // 경성대
        );
        defaultApp.setFriendName("지민");
        defaultApp.setFriendLat(35.14800); // 친구는 남천/광안 부근에서 이동 중
        defaultApp.setFriendLng(129.11200);
        appointmentStore.put(defaultApp.getId(), defaultApp);
    }

    public List<Appointment> getAllAppointments() {
        return new ArrayList<>(appointmentStore.values());
    }

    public Optional<Appointment> getAppointment(String id) {
        return Optional.ofNullable(appointmentStore.get(id));
    }

    public Appointment createAppointment(String title, String destinationId, String destinationName,
                                         LocalDateTime targetTime, String creatorName, double lat, double lng) {
        String id = "MEET-" + (1000 + new Random().nextInt(9000));
        Appointment appointment = new Appointment(id, title, destinationId, destinationName, targetTime, creatorName, lat, lng);
        appointmentStore.put(id, appointment);
        return appointment;
    }

    public boolean joinAppointment(String id, String friendName, double lat, double lng) {
        Appointment app = appointmentStore.get(id);
        if (app != null) {
            app.setFriendName(friendName);
            app.setFriendLat(lat);
            app.setFriendLng(lng);
            return true;
        }
        return false;
    }

    public boolean updateLocation(String id, boolean isCreator, double lat, double lng) {
        Appointment app = appointmentStore.get(id);
        if (app != null) {
            if (isCreator) {
                app.setCreatorLat(lat);
                app.setCreatorLng(lng);
            } else {
                app.setFriendLat(lat);
                app.setFriendLng(lng);
            }
            return true;
        }
        return false;
    }

    public boolean notifyDelay(String id, String who, int delayMinutes, String reason) {
        Appointment app = appointmentStore.get(id);
        if (app != null) {
            app.setDelayMinutes(delayMinutes);
            app.setDelayReason(reason);
            app.setDelaySender(who);
            if (app.getTargetTime() != null) {
                app.setTargetTime(app.getTargetTime().plusMinutes(delayMinutes));
            }
            return true;
        }
        return false;
    }
}
