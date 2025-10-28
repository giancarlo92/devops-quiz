# Docker – Guía Rápida

## Definición
- Plataforma de contenedores para empaquetar y ejecutar aplicaciones.

## Comandos básicos
- `docker build -t app:latest .`
- `docker run --rm -p 8080:80 app:latest`
- `docker ps -a` / `docker logs <id>` / `docker exec -it <id> sh`
- `docker images` / `docker rmi <img>` / `docker rm <id>`

## Casos prácticos
- Empaquetar servicio web y publicar imagen en un registry.
- Desarrollo local consistente entre equipos y CI.

## Estructura básica (Dockerfile)
```
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm","start"]
```

## Buenas prácticas
- Mantener imágenes pequeñas (alpine, multi-stage builds).
- No almacenar secretos en la imagen; usar variables/volúmenes.

## Cuándo usar
- Empaquetado reproducible y despliegue portable.

## Cuándo evitar
- Aplicaciones monolíticas con fuertes dependencias OS no contenedorizables.

## Recursos
- Docs: https://docs.docker.com/