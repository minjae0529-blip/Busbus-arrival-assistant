package com.naverbus.server;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.naverbus.model.*;
import com.naverbus.service.BusArrivalService;
import com.naverbus.service.DataManager;
import com.naverbus.service.GeoLocationService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.Executors;

public class AppHttpServer {

    private final int port;
    private final DataManager dataManager;
    private final GeoLocationService geoLocationService;
    private final BusArrivalService busArrivalService;
    private final ObjectMapper objectMapper;
    private HttpServer server;

    public AppHttpServer(int port, DataManager dataManager, GeoLocationService geoLocationService, BusArrivalService busArrivalService) {
        this.port = port;
        this.dataManager = dataManager;
        this.geoLocationService = geoLocationService;
        this.busArrivalService = busArrivalService;
        this.objectMapper = new ObjectMapper();
    }

    public void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress(port), 0);

        // Java 21의 가상 스레드 (Virtual Threads) 실행기 적용
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());

        // API 라우트 등록
        server.createContext("/api/stations/nearby", this::handleNearbyStations);
        server.createContext("/api/stations", this::handleStations);
        server.createContext("/api/routes", this::handleRoutes);
        server.createContext("/api/arrivals", this::handleArrivals);
        server.createContext("/api/favorites/arrivals", this::handleFavoriteArrivals);
        server.createContext("/api/destination/matches", this::handleDestinationMatches);
        server.createContext("/api/destination", this::handleDestination);
        server.createContext("/api/favorites", this::handleFavorites);

        // 정적 HTML/CSS/JS 웹 GUI 서빙
        server.createContext("/", this::handleStaticWeb);

        server.start();
        System.out.println("==================================================================");
        System.out.println(" [NAVER BUS ASSISTANT] 웹 GUI 서버가 정상적으로 기동되었습니다.");
        System.out.println(" 접속 주소: http://localhost:" + port);
        System.out.println("==================================================================");
    }

    public void stop() {
        if (server != null) {
            server.stop(1);
        }
    }

    private void handleNearbyStations(HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "Method Not Allowed");
            return;
        }

        Map<String, String> query = parseQuery(exchange.getRequestURI().getRawQuery());
        double lat = parseDouble(query.get("lat"), 35.13750); // 기본값: 부산 경성대·부경대역 (수영로)
        double lng = parseDouble(query.get("lng"), 129.10050);
        double radius = parseDouble(query.get("radius"), 1500.0);

        List<NearbyStation> nearby = geoLocationService.findNearbyStations(dataManager.getAllStations(), lat, lng, radius);
        sendJsonResponse(exchange, 200, nearby);
    }

    private void handleStations(HttpExchange exchange) throws IOException {
        if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendJsonResponse(exchange, 200, dataManager.getAllStations());
        } else if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            JsonNode body = parseJsonBody(exchange);
            String name = body.path("name").asText();
            double lat = body.path("latitude").asDouble();
            double lng = body.path("longitude").asDouble();
            String arsId = body.path("arsId").asText();
            Station st = dataManager.registerCustomStation(name, lat, lng, arsId, List.of());
            sendJsonResponse(exchange, 201, st);
        } else {
            sendResponse(exchange, 405, "Method Not Allowed");
        }
    }

    private void handleRoutes(HttpExchange exchange) throws IOException {
        if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendJsonResponse(exchange, 200, dataManager.getAllRoutes());
        } else {
            sendResponse(exchange, 405, "Method Not Allowed");
        }
    }

    private void handleArrivals(HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "Method Not Allowed");
            return;
        }

        Map<String, String> query = parseQuery(exchange.getRequestURI().getRawQuery());
        String stationId = query.get("stationId");
        if (stationId == null || stationId.isBlank()) {
            stationId = "ST-BS-KSU"; // 기본 부산 경성대·부경대역
        }

        List<BusArrivalInfo> arrivals = busArrivalService.getArrivalsForStation(stationId);
        sendJsonResponse(exchange, 200, arrivals);
    }

    private void handleFavoriteArrivals(HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "Method Not Allowed");
            return;
        }

        Map<String, String> query = parseQuery(exchange.getRequestURI().getRawQuery());
        double lat = parseDouble(query.get("lat"), 35.13750);
        double lng = parseDouble(query.get("lng"), 129.10050);

        List<BusArrivalInfo> favArrivals = busArrivalService.getFavoriteBusesArrivals(lat, lng);
        sendJsonResponse(exchange, 200, favArrivals);
    }

    private void handleDestinationMatches(HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "Method Not Allowed");
            return;
        }

        Map<String, String> query = parseQuery(exchange.getRequestURI().getRawQuery());
        double lat = parseDouble(query.get("lat"), 35.13750);
        double lng = parseDouble(query.get("lng"), 129.10050);

        List<DestinationBusMatch> matches = busArrivalService.findBusesToDestination(lat, lng);
        sendJsonResponse(exchange, 200, matches);
    }

    private void handleDestination(HttpExchange exchange) throws IOException {
        if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            DestinationConfig dest = dataManager.getDestinationConfig();
            sendJsonResponse(exchange, 200, dest != null ? dest : Map.of());
        } else if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            JsonNode body = parseJsonBody(exchange);
            String stationId = body.path("stationId").asText();
            String memo = body.path("memo").asText();

            DestinationConfig updated = dataManager.setDestination(stationId, memo);
            if (updated != null) {
                sendJsonResponse(exchange, 200, updated);
            } else {
                sendJsonResponse(exchange, 400, Map.of("error", "정류소를 찾을 수 없습니다: " + stationId));
            }
        } else {
            sendResponse(exchange, 405, "Method Not Allowed");
        }
    }

    private void handleFavorites(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();

        if ("GET".equalsIgnoreCase(method)) {
            sendJsonResponse(exchange, 200, dataManager.getFavorites());
        } else if ("POST".equalsIgnoreCase(method)) {
            JsonNode body = parseJsonBody(exchange);
            String typeStr = body.path("type").asText("BUS");
            FavoriteItem.FavoriteType type = "STATION".equalsIgnoreCase(typeStr) ?
                    FavoriteItem.FavoriteType.STATION : FavoriteItem.FavoriteType.BUS;
            String targetId = body.path("targetId").asText();
            String name = body.path("name").asText();
            String memo = body.path("memo").asText();

            FavoriteItem added = dataManager.addFavorite(type, targetId, name, memo);
            sendJsonResponse(exchange, 201, added);
        } else if ("DELETE".equalsIgnoreCase(method)) {
            // /api/favorites/{id}
            String[] parts = path.split("/");
            if (parts.length >= 4) {
                String favId = parts[3];
                boolean removed = dataManager.removeFavorite(favId);
                sendJsonResponse(exchange, 200, Map.of("success", removed, "id", favId));
            } else {
                sendJsonResponse(exchange, 400, Map.of("error", "Invalid ID"));
            }
        } else {
            sendResponse(exchange, 405, "Method Not Allowed");
        }
    }

    private void handleStaticWeb(HttpExchange exchange) throws IOException {
        String path = exchange.getRequestURI().getPath();
        if ("/".equals(path) || path.isEmpty()) {
            path = "/index.html";
        }

        // src/main/resources/static/ 또는 클래스패스에서 파일 읽기
        InputStream is = getClass().getResourceAsStream("/static" + path);
        if (is == null) {
            File localFile = new File("src/main/resources/static" + path);
            if (localFile.exists()) {
                is = new FileInputStream(localFile);
            }
        }

        if (is == null) {
            sendResponse(exchange, 404, "404 Not Found");
            return;
        }

        byte[] bytes = is.readAllBytes();
        is.close();

        String contentType = "text/html; charset=UTF-8";
        if (path.endsWith(".css")) contentType = "text/css; charset=UTF-8";
        else if (path.endsWith(".js")) contentType = "application/javascript; charset=UTF-8";
        else if (path.endsWith(".json")) contentType = "application/json; charset=UTF-8";
        else if (path.endsWith(".png")) contentType = "image/png";
        else if (path.endsWith(".svg")) contentType = "image/svg+xml";

        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private JsonNode parseJsonBody(HttpExchange exchange) throws IOException {
        try (InputStream is = exchange.getRequestBody()) {
            return objectMapper.readTree(is);
        }
    }

    private void sendJsonResponse(HttpExchange exchange, int status, Object data) throws IOException {
        byte[] bytes = objectMapper.writeValueAsBytes(data);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private void sendResponse(HttpExchange exchange, int status, String message) throws IOException {
        byte[] bytes = message.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=UTF-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private Map<String, String> parseQuery(String query) {
        Map<String, String> result = new HashMap<>();
        if (query == null || query.isBlank()) {
            return result;
        }
        for (String param : query.split("&")) {
            String[] entry = param.split("=", 2);
            if (entry.length > 1) {
                result.put(
                        URLDecoder.decode(entry[0], StandardCharsets.UTF_8),
                        URLDecoder.decode(entry[1], StandardCharsets.UTF_8)
                );
            } else if (entry.length == 1) {
                result.put(URLDecoder.decode(entry[0], StandardCharsets.UTF_8), "");
            }
        }
        return result;
    }

    private double parseDouble(String str, double defaultValue) {
        if (str == null || str.isBlank()) return defaultValue;
        try {
            return Double.parseDouble(str);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
}
