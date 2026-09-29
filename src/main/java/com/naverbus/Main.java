package com.naverbus;

import com.naverbus.server.AppHttpServer;
import com.naverbus.service.BusArrivalService;
import com.naverbus.service.DataManager;
import com.naverbus.service.GeoLocationService;

import java.awt.*;
import java.io.IOException;
import java.net.ServerSocket;
import java.net.URI;

public class Main {

    private static final int DEFAULT_PORT = 8080;

    public static void main(String[] args) {
        printBanner();

        int port = findAvailablePort(DEFAULT_PORT);

        DataManager dataManager = new DataManager();
        GeoLocationService geoLocationService = new GeoLocationService();
        BusArrivalService busArrivalService = new BusArrivalService(dataManager, geoLocationService);
        com.naverbus.service.AppointmentService appointmentService = new com.naverbus.service.AppointmentService();
        com.naverbus.service.PlaceRecommendService placeRecommendService = new com.naverbus.service.PlaceRecommendService();

        AppHttpServer server = new AppHttpServer(port, dataManager, geoLocationService, busArrivalService, appointmentService, placeRecommendService);

        try {
            server.start();

            String url = "http://localhost:" + port;
            System.out.println(">> 브라우저에서 아래 주소로 접속하여 네이버 지도 스타일의 GUI를 확인할 수 있습니다:");
            System.out.println(">> " + url);
            System.out.println();

            // Mac 데스크탑 기본 브라우저 자동 열기
            openBrowser(url);

            // 종료 훅 등록
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                System.out.println("\n서버를 종료합니다...");
                server.stop();
            }));

            // 메인 스레드 유지 (서버 대기)
            Thread.currentThread().join();

        } catch (Exception e) {
            System.err.println("[FATAL] 서버 오류: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private static void openBrowser(String url) {
        try {
            if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                Desktop.getDesktop().browse(new URI(url));
            } else {
                // macOS open 명령어 직접 호출 폴백
                Runtime.getRuntime().exec(new String[]{"open", url});
            }
        } catch (Exception e) {
            System.out.println("[INFO] 브라우저 자동 열기 생략 (" + e.getMessage() + "). 브라우저에 " + url + " 을 직접 입력해주세요.");
        }
    }

    private static int findAvailablePort(int startPort) {
        int port = startPort;
        while (port < startPort + 50) {
            try (ServerSocket socket = new ServerSocket(port)) {
                return port;
            } catch (IOException e) {
                port++;
            }
        }
        return startPort;
    }

    private static void printBanner() {
        System.out.println("""
            ================================================================================
             NAVER BUS ASSISTANT - 실시간 위치기반 버스 도착 및 목적지 안내 서비스
             [Java 21 LTS / Virtual Threads / Naver Maps UI Design System]
            ================================================================================
            """);
    }
}
