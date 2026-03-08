FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .
RUN npm run build

# Runtime image: holds /dist so docker-compose entrypoint can copy it to a volume
FROM alpine:3.20
COPY --from=builder /app/dist /dist
