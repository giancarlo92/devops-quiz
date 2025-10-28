# Monitoreo – Guía Rápida

## Definición
- Observabilidad basada en métricas, logs y trazas para detectar problemas y optimizar rendimiento.

## Conceptos clave
- SLI/SLO/SLA, alertas y correlación.
- Métricas: series temporales (Prometheus), Logs (Loki), Trazas (Tempo/Jaeger).

## Comandos/Utilidades
- Prometheus: `promtool check config prometheus.yml`
- Loki: `logcli query '{app="web"}' --since=1h`
- Grafana: dashboards y alertas.

## Casos prácticos
- Alertas por latencia alta y errores 5xx.
- Dashboard de recursos (CPU/Memoria/Disco) por servicio.

## Estructura básica (pipeline)
```
collectors/exporters -> Prometheus -> Alertmanager
                          \
                           -> Grafana (dashboards)
logs -> Loki -> Grafana Explore
```

## Buenas prácticas
- Alertas accionables, sin ruido; etiquetar métricas.
- Definir objetivos de fiabilidad realistas (SLOs).

## Recursos
- Docs: https://prometheus.io/docs/introduction/overview/