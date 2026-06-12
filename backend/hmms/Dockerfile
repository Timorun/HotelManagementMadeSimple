# Stage 1: Build the application
FROM eclipse-temurin:21-jre-alpine AS build
WORKDIR /hmms

# Copy build files
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Grant execute permission and download dependencies
RUN chmod +x mvnw && ./mvnw dependency:go-offline

# Copy source code and build package
COPY src src
RUN ./mvnw -DskipTests package

# Stage 2: Create the runtime image
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Copy the built jar from stage 1
COPY --from=build /hmms/target/hmms-0.0.1-SNAPSHOT.jar app.jar

# Configure execution with JVM memory guards for low-cost cloud hosting
ENV PORT=8080
ENTRYPOINT ["sh", "-c", "java -XX:MaxRAMPercentage=70 -XX:InitialRAMPercentage=25 -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError -Dserver.port=${PORT} -jar app.jar"]
