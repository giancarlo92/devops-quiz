# Grafana – Guía Rápida

## Definición
- Plataforma para visualización de métricas, logs y trazas.

## Comandos básicos
- `grafana-cli plugins install <plugin>`
- Arranque común vía contenedor: `docker run -p 3000:3000 grafana/grafana`

## Casos prácticos
- Dashboards para Prometheus y alertas con Alerting.
- Visor de logs conectando a Loki.

## Estructura básica (provisioning)
```
provisioning/
  datasources/
    prometheus.yaml
  dashboards/
    default.json
```

## Buenas prácticas
- Versionar dashboards y datasources en Git.
- Usar variables de entorno para endpoints.

## Cuándo usar
- Observabilidad y visualización centralizada.

## Cuándo evitar
- Necesidades de BI avanzado (considerar otras herramientas).

## Recursos
- Docs: https://grafana.com/docs/