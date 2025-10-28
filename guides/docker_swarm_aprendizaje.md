# Docker Swarm – Guía Rápida

## Definición
- Orquestador nativo de Docker para clúster y servicios distribuidos.

## Comandos básicos
- `docker swarm init`
- `docker swarm join --token <token> <manager-ip>:2377`
- `docker service create --name web -p 80:80 nginx`
- `docker service ls` / `docker service ps web`
- `docker service scale web=5`
- `docker stack deploy -c docker-compose.yml mystack`

## Casos prácticos
- Despliegue de servicios stateless balanceados con escalado.
- Pila con múltiples servicios mediante `stack`.

## Estructura básica (stack compose)
```yaml
version: "3.8"
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    deploy:
      replicas: 3
      update_config:
        order: start-first
```

## Buenas prácticas
- Usar redes overlay y constraints para colocar servicios.
- Configurar actualizaciones rolling y healthchecks.

## Cuándo usar
- Orquestación sencilla sin necesidad de Kubernetes.

## Cuándo evitar
- Requerimientos complejos (autoscaling avanzado, CRDs, etc.).

## Recursos
- Docs: https://docs.docker.com/engine/swarm/