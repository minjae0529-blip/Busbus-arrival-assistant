#!/usr/bin/env bash
# Maven Wrapper script that detects IntelliJ's bundled Maven or system mvn

MVN_CMD=""

if command -v mvn &> /dev/null; then
    MVN_CMD="mvn"
elif [ -f "/Applications/국비수업/IntelliJ IDEA.app/Contents/plugins/maven-plugin/lib/maven3/bin/mvn" ]; then
    MVN_CMD="/Applications/국비수업/IntelliJ IDEA.app/Contents/plugins/maven-plugin/lib/maven3/bin/mvn"
else
    FOUND_MVN=$(find /Applications -name "mvn" 2>/dev/null | grep -E "maven3/bin/mvn" | head -n 1)
    if [ -n "$FOUND_MVN" ]; then
        MVN_CMD="$FOUND_MVN"
    fi
fi

if [ -z "$MVN_CMD" ]; then
    echo "[ERROR] Maven could not be found. Please install Maven or check IntelliJ installation." >&2
    exit 1
fi

exec "$MVN_CMD" "$@"
