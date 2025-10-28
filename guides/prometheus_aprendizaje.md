# Prometheus – Guía Rápida

## Definición
- Sistema de monitorización basado en scraping y series temporales.

## Comandos/Utilidades
- `promtool check config prometheus.yml`
- Consultas: `sum(rate(http_requests_total[5m])) by (status)`

## Casos prácticos
- Alertas por error rate y latencia con Alertmanager.

## Estructura básica (prometheus.yml)
```yaml
scrape_configs:
  - job_name: 'app'
    static_configs:
      - targets: ['app:9090']
```

## Buenas prácticas
- Etiquetar métricas y evitar cardinalidad excesiva.
- Usar `recording rules` para agregados comunes.

## Recursos
- Docs: https://prometheus.io/docs/