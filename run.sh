#!/usr/bin/env bash
# NAVER BUS ASSISTANT - 실행 스크립트

echo "=========================================================="
echo " [NAVER BUS ASSISTANT] 애플리케이션을 시작합니다..."
echo " Java 버전: $(java -version 2>&1 | head -n 1)"
echo "=========================================================="

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# JAR 파일 존재 여부 확인 후 없으면 빌드
JAR_FILE="$DIR/target/bus-arrival-assistant-1.0.0.jar"
if [ ! -f "$JAR_FILE" ]; then
    echo ">> JAR 빌드 중..."
    ./mvnw clean package -DskipTests=true
fi

echo ">> 애플리케이션 실행..."
java -jar "$JAR_FILE"
