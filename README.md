# 🚌 스마트 버스 라우트 (Smart Bus Assistant)

> **실시간 GPS 위치기반 버스 도착 정보 및 스마트 목적지 직통 노선 추천 애플리케이션**입니다.  
> 특정 포털 사이트의 복사판 느낌을 완전히 탈피하고, 독자적인 **모던 모빌리티(Smart Transit) 디자인 시스템**과 **세련된 버스 벡터 심볼**을 적용하여 직관적이고 깔끔한 대중교통 이용 경험을 선사합니다.

---

## 🌟 주요 핵심 기능

### 1. 📍 실시간 GPS 위치 확인 및 인근 정류소 자동 감지
- HTML5 Geolocation API를 통해 사용자의 **실제 디바이스 GPS 좌표**를 실시간으로 연동합니다.
- **Haversine 정밀 거리 계산 공식**을 적용하여 내 위치에서 가장 가까운 도보 거리(m)와 소요 시간(분)의 정류소를 자동 감지합니다.
- 테스트 및 시뮬레이션을 위한 **주요 거점 원클릭 위치 변경 프리셋(신논현역, 강남역, 역삼역, 판교역, 광화문 등)**을 제공합니다.

### 2. 🎯 스마트 목적지 직통 버스 추천 (Smart Destination Routing)
- 사용자가 설정한 목적지(예: `강남역`, `판교역` 등)로 향하는 버스 중 **내 현재 위치의 정류소에 정차하는 직통 버스**만을 지능적으로 필터링합니다.
- **노선 정방향 검증(순번 일치 확인)**: 내 위치 정류소 탑승 ➔ 목적지 정류소 하차 경로를 계산합니다.
- 실시간 도착 예정 시간과 목적지까지의 정류장 수/소요 시간을 결합하여 **가장 먼저 목적지에 도착할 수 있는 최단시간 추천 노선(★ 배지 부여)**을 상단에 하이라이트합니다.

### 3. ⏱️ 초 단위 실시간 버스 도착 정보 (Smart Transit UI)
- **실시간 초 단위 카운트다운 타이머**: `3분 42초`, `곧 도착`, `전 정류장 출발` 등 실시간 감소 애니메이션.
- **버스 상세 메타데이터**: 혼잡도(`여유`, `보통`, `혼잡`), 저상버스 여부(`저상`), 다음 버스 예정 정보(`11분 후`).
- **인터랙티브 노선 트랙(Route Track Bar)**: 정류장 경로 위에서 버스 아이콘(🚌)이 실시간으로 이동하는 시각적 트랙 제공.

### 4. ⭐ 자주 타는 버스 및 자주 가는 역 즐겨찾기 영속화
- 자주 타는 버스 번호나 자주 가는 역을 클릭 한 번으로 간편하게 등록/해제할 수 있습니다.
- 등록된 정보는 `data/favorites.json` 및 `data/destination.json`에 영구 저장되어 앱을 재시작해도 안전하게 보존됩니다.

### 5. 🗺️ 실시간 인터랙티브 벡터 캔버스 맵
### 5. 🗺️ 구글 지도(Google Maps) 기반 실시간 노선도 & 경로 선 위 소요 시간 배지
- **구글 지도 디자인 시스템 적용**: 구글 맵 시그니처 소프트 그레이 배경(`#F1F3F4`), 도심 녹지/공원(`#CEEAD6`), 한강 수변 공간(`#C4E1F6`), 명확한 화이트 격자 도로망(`#FFFFFF` + `#DADCE0`).
- **구글 내비게이션 스타일 파란색 경로선 (Blue Route Polyline)**: 출발 정류소에서 목적지까지 이어지는 선명한 Google Transit Blue(`#1A73E8`) 경로선.
- **파란색 선 상의 실시간 소요 시간 배지 (Time-on-Route Tag)**: 파란색 경로선 정중앙에 구글 지도 내비게이션 스타일의 **흰색 알약 칩(`⏱️ 3분 (0.8km)`)**을 띄워 목적지까지의 구간 소요 시간을 한눈에 파악할 수 있습니다.
- **구글 맵 컨트롤**: 줌 인/아웃(`+`, `-`), 지도/대중교통 레이어 전환 버튼 및 Google 워터마크 제공.

---

## 🎨 디자인 시스템 (Smart Transit & Google Maps UI)

| 구분 | 적용 스타일 및 색상 |
| :--- | :--- |
| **브랜드 심볼** | 세련된 프론트 뷰 **버스 벡터 SVG 심볼** (`#2563EB`) |
| **메인 컬러** | 신뢰감 있는 사파이어 블루 (`#2563EB`) & 딥 네이비 (`#0F172A`) |
| **목적지 히어로 배너** | 프리미엄 트랜짓 카드 스타일 (다크 슬레이트 & 스카이블루 액센트) |
| **실시간 지도** | **Google Maps 베이스** (소프트 그레이, 화이트 도로망, 녹지, Google 로고) |
| **경로 라인 & 시간** | **파란색 Google Transit 라인 (`#1A73E8`)** 및 **선 상의 시간 칩 (`⏱️ 3분 0.8km`)** |
| **간선 버스 (블루)** | `#2563EB` / 배경 `#EFF6FF` |
| **지선 버스 (에메랄드)** | `#10B981` / 배경 `#ECFDF5` |
| **광역 버스 (코랄 레드)** | `#EF4444` / 배경 `#FEF2F2` |
| **마을/순환 버스** | `#8B5CF6` / `#F59E0B` |
| **도착 시간 강조** | 가독성 높은 볼드 타이포그래피, '곧 도착' 펄스 애니메이션 |

---

## 🛠️ 기술 스택 (Tech Stack)

- **언어 및 런타임**: Java 21 (JDK 21 LTS)
- **동시성 모델**: Java 21 Virtual Threads (`Executors.newVirtualThreadPerTaskExecutor()`)
- **내장 서버**: Java 21 Lightweight High-Performance Embedded HTTP Server (`com.sun.net.httpserver`)
- **데이터 처리 & 영속성**: Jackson Databind 2.17.0 (JSON File-based Persistence)
- **프론트엔드 GUI**: HTML5, Vanilla JavaScript, Smart Transit CSS System, HTML5 Canvas 2D
- **빌드 도구**: Apache Maven 3.9+ / Maven Wrapper (`mvnw`)
- **테스트**: JUnit 5 (JUnit Jupiter 5.10.2)

---

## 📂 프로젝트 구조

```
gov/java/bus-arrival-assistant/
├── pom.xml                               # Maven 의존성 및 Java 21 설정
├── mvnw                                  # 이식성 높은 Maven Wrapper 실행 스크립트
├── run.sh                                # 애플리케이션 원클릭 실행 스크립트
├── README.md                             # 프로젝트 설명서
├── data/                                 # 즐겨찾기 및 목적지 JSON 영속화 폴더
│   ├── favorites.json
│   └── destination.json
└── src/
    ├── main/
    │   ├── java/com/naverbus/
    │   │   ├── Main.java                 # 엔트리포인트 및 브라우저 자동 오픈
    │   │   ├── model/                    # 도메인 모델 (Java 21 Records)
    │   │   │   ├── BusArrivalInfo.java   # 실시간 도착 정보 모델
    │   │   │   ├── BusRoute.java         # 버스 노선 모델
    │   │   │   ├── BusRouteType.java     # 간선/지선/광역/마을 열거형
    │   │   │   ├── DestinationBusMatch.java # 목적지 직통 매칭 모델
    │   │   │   ├── DestinationConfig.java   # 사용자 목적지 설정
    │   │   │   ├── FavoriteItem.java     # 즐겨찾기 모델
    │   │   │   ├── NearbyStation.java    # 거리 기반 인근 정류소 모델
    │   │   │   └── Station.java          # 정류소/역 모델
    │   │   ├── server/
    │   │   │   └── AppHttpServer.java    # 가상 스레드 기반 RESTful API 및 정적 서버
    │   │   └── service/
    │   │       ├── BusArrivalService.java # 실시간 도착 계산 및 직통 매칭 엔진
    │   │       ├── DataManager.java      # 데이터 초기화 및 JSON 영속화 관리자
    │   │       └── GeoLocationService.java # Haversine 거리 및 도보 시간 계산
    │   └── resources/static/             # 모던 스마트 트랜짓 웹 GUI
    │       ├── index.html                # 반응형 웹 GUI 레이아웃
    │       ├── app.css                   # 스마트 트랜짓 디자인 시스템 스타일시트
    │       └── app.js                    # 실시간 GPS, 카운트다운, Canvas 노선도
    └── test/java/com/naverbus/
        └── BusArrivalServiceTest.java    # Haversine 거리, 매칭, 즐겨찾기 단위 테스트
```

---

## 🚀 실행 방법 (Getting Started)

### 사전 요구사항
- **Java**: JDK 21 이상 (설치 확인: `java -version`)

### 1. 원클릭 실행 스크립트 사용
```bash
./run.sh
```
실행 시 자동으로 JAR 빌드가 진행된 후 애플리케이션이 구동되며, 기본 브라우저가 자동으로 열립니다.

### 2. Maven Wrapper를 통한 빌드 및 실행
```bash
# 테스트 실행
./mvnw clean test

# 패키징 (Fat JAR 빌드)
./mvnw clean package

# 직접 실행
java -jar target/bus-arrival-assistant-1.0.0.jar
```

### 3. 브라우저 접속
서버가 시작되면 웹 브라우저에서 아래 주소로 접속합니다:
👉 **`http://localhost:8080`**

---

## 🔌 RESTful API 명세 (REST API Endpoints)

| HTTP 메서드 | 엔드포인트 | 설명 |
| :--- | :--- | :--- |
| `GET` | `/` | 스마트 버스 라우트 웹 GUI 메인 화면 |
| `GET` | `/api/stations/nearby?lat=..&lng=..` | 현재 GPS 좌표 기준 반경 내 정류소 검색 |
| `GET` | `/api/stations` | 전체 등록 정류소 목록 조회 |
| `GET` | `/api/routes` | 전체 버스 노선 및 경유 정류소 목록 |
| `GET` | `/api/arrivals?stationId=..` | 해당 정류소의 실시간 버스 도착 정보 (초 단위 갱신) |
| `GET` | `/api/destination` | 현재 설정된 목적지 정류소 조회 |
| `POST` | `/api/destination` | 목적지 정류소 변경 (`{"stationId": "ST-GNM", "memo": "강남역"}`) |
| `GET` | `/api/destination/matches?lat=..&lng=..` | 내 GPS 위치에서 목적지로 가는 직통 버스 매칭 및 최단시간 추천 |
| `GET` | `/api/favorites` | 자주 타는 버스 / 역 즐겨찾기 목록 |
| `POST` | `/api/favorites` | 즐겨찾기 등록 (`type`, `targetId`, `name`, `memo`) |
| `DELETE` | `/api/favorites/{id}` | 즐겨찾기 삭제 |

---

## 📄 라이선스
MIT License
