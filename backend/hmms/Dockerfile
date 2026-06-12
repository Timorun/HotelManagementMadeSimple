# syntax=docker/dockerfile:1

# ===== Stage 1: Build =====
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Copy only files needed for dependency resolution first (better layer caching)
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

# Then copy source and build
COPY src ./src
RUN mvn -q -DskipTests clean package

# ===== Stage 2: Runtime =====
FROM eclipse-temurin:21-jre-jammy

# Create non-root user
RUN useradd -ms /bin/bash appuser
USER appuser

WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

# JVM tuned for small containers / low RAM plans
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:InitialRAMPercentage=25 -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["java", "-jar", "app.jar"]
