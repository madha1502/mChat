# Build stage
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY server/.mvn/ ./.mvn/
COPY server/mvnw server/pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B
COPY server/src ./src
RUN ./mvnw clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN mkdir -p uploads data
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 5000 5001
ENTRYPOINT ["java", "-jar", "app.jar"]
