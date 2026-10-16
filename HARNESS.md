# 🛡️ HARNESS.md: 테스트 및 실행 하네스 규격서 (Execution & Test Harness)

> **프로젝트**: Smart Transit Assistant (Serverless Migration Edition)  
> **문서 버전**: v1.0.0  
> **상태**: Production Standard

---

## 1. 하네스(Harness)의 정의 및 목적

**하네스(Harness)**는 시스템 및 서버리스 마이크로 함수(Serverless Functions)가 배포되기 전과 운영 중, **격리된 환경에서 정확성, 성능, 복원력을 엄격하게 제어하고 검증하는 실행 프레임워크**입니다.

```
+-----------------------------------------------------------------------+
|                         EXECUTION HARNESS                             |
|                                                                       |
|  +--------------------+   +--------------------+   +---------------+  |
|  | Input Generator    |-->| System Under Test  |-->| Assertions &  |  |
|  | & Event Mocking    |   | (Serverless Func)  |   | Verifier      |  |
|  +--------------------+   +--------------------+   +---------------+  |
|            ^                        |                      |          |
|            |                        v                      v          |
|  +-----------------------------------------------------------------+  |
|  |           Fault Injection & Environment Isolation Sandbox       |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
```

### 핵심 목표
1. **결함 격리 (Fault Isolation)**: 외부 공공데이터(BIMS, OSRM, Overpass)의 지연 및 장애가 시스템 전체에 전파되지 않도록 모의 환경(Mock)과 샌드박스를 제공.
2. **서버리스 사전 검증 (Serverless Simulation)**: AWS Lambda, Cloudflare Workers, Vercel Functions의 콜드 스타트 및 실행 제약(Timeout, Memory, Statelessness)을 로컬에서 100% 재현.
3. **루프 엔지니어링 연동 (Loop Feeding)**: 평가 루프(Evaluation Loop)가 자동으로 읽을 수 있는 표준화된 JSON/JUnit 메트릭을 출력.

---

## 2. 하네스 구성 계층 (Architecture Layers)

| 계층 (Layer) | 하네스 컴포넌트 | 역할 및 검증 내용 |
| :--- | :--- | :--- |
| **L1. Contract Harness** | API Schema & DTO Verifier | Request/Response 스키마 유효성, 타입 안정성, Null/Empty 방어 |
| **L2. Function Harness** | Serverless Runtime Simulator | Stateless 함수 독립 실행, 메모리 누수 점검, 타임아웃 강제 테스트 |
| **L3. Network Harness** | Fault Injection & Mock Server | 외부 API 장애(HTTP 500/502/429/Timeout) 주입 시 자동 Fallback 검증 |
| **L4. Performance Harness** | Cold Start & Latency Profiler | 가상 동시성(Virtual Threads/Worker Threads) 기반 P95/P99 지연시간 측정 |

---

## 3. L1: Contract Verification Harness (입출력 검증)

서버리스 함수는 상태가 없으므로 입출력 계약(Contract)이 완벽해야 합니다.

### 3.1 라우팅 및 장소 상세 Contract 규격
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PlaceDetailContract",
  "type": "object",
  "required": ["name", "category", "googleRating", "menuList", "signatureMenu", "priceRange"],
  "properties": {
    "name": { "type": "string", "minLength": 2 },
    "category": { "type": "string" },
    "googleRating": { "type": "number", "minimum": 0.0, "maximum": 5.0 },
    "menuList": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1
    },
    "signatureMenu": { "type": "string", "minLength": 2 },
    "priceRange": { "type": "string" },
    "businessHours": { "type": "string" }
  }
}
```

---

## 4. L2: Serverless Function Execution Harness

각 서버리스 함수는 완전한 독립 컨텍스트에서 실행되어야 합니다.

```java
public class ServerlessFunctionHarness {

    public static <REQ, RES> HarnessResult<RES> execute(
            ServerlessFunction<REQ, RES> function, 
            REQ request, 
            HarnessContext context) {
        
        long startTime = System.nanoTime();
        long memBefore = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();

        try {
            // 1. 타임아웃 제한 스케줄링 (서버리스 런타임 제약 3,000ms 강제)
            CompletableFuture<RES> future = CompletableFuture.supplyAsync(
                () -> function.handleRequest(request, context)
            );
            
            RES response = future.get(context.timeoutMs(), TimeUnit.MILLISECONDS);
            long durationMs = (System.nanoTime() - startTime) / 1_000_000;
            long memAfter = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();

            return HarnessResult.success(response, durationMs, Math.max(0, memAfter - memBefore));
        } catch (TimeoutException te) {
            return HarnessResult.timeout(context.timeoutMs());
        } catch (Exception e) {
            return HarnessResult.failure(e);
        }
    }
}
```

---

## 5. L3: Network Fault Injection Harness (결함 주입)

외부 API(BIMS, OSRM, Overpass)의 실시간 장애 상황을 시뮬레이션하여 시스템의 자동 복구/폴백 역량을 테스트합니다.

### 결함 주입 시나리오
1. **OSRM Timeout 시나리오**: OSRM API 응답이 3.5초를 초과할 때, 즉시 `buildDynamicRoadPath` 간선 직결 알고리즘으로 100% 무중단 폴백되는지 검증.
2. **BIMS 502 Bad Gateway 시나리오**: 부산시 버스 시스템 점검 시, 내장 주기적 캐시 및 시뮬레이션 엔진으로 사용자 UI 단절 없이 카운트다운을 유지하는지 검증.
3. **Overpass Rate Limit (429) 시나리오**: OSM 쿼터 초과 시 검증된 46개소 네이버 플레이스 캐시 DB로 투명하게 전환되는지 검증.

---

## 6. 하네스 실행 및 리포트 규격

하네스는 실행 후 반드시 아래 규격의 정량적 리포트를 출력하여 `LOOP_ENGINEERING.md`의 피드백 루프로 전달합니다:

```json
{
  "harnessRunId": "run-20261016-1710",
  "target": "Serverless-Transit-Suite",
  "passed": 48,
  "failed": 0,
  "coldStartAvgMs": 42.5,
  "executionAvgMs": 8.2,
  "p99LatencyMs": 18.4,
  "memoryDeltaKb": 240,
  "faultRecoveryRate": "100.0%",
  "status": "GREEN"
}
```
