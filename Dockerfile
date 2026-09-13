FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY backend/pom.xml .
RUN mvn -B dependency:go-offline
COPY backend/src ./src
RUN mvn -B package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /build/target/payments-1.0.0.jar /app/payments.jar
ENV SERVER_ADDRESS=0.0.0.0
ENV SPRING_PROFILES_ACTIVE=railway
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/payments.jar", "--debug=false"]
