# OpenShift – Guía Rápida

## Definición
- Plataforma empresarial basada en Kubernetes con flujos integrados.

## Comandos básicos (CLI `oc`)
- `oc login https://api.cluster:6443`
- `oc new-project <proj>`
- `oc new-app quay.io/org/app:latest`
- `oc get pods,svc,route`
- `oc expose svc/web`

## Casos prácticos
- Despliegue rápido de imágenes y exposición vía Routes.

## Estructura básica
```
openshift/
  deployment.yaml
  service.yaml
  route.yaml
```

## Buenas prácticas
- Usar `ImageStreams`, `Routes` y `BuildConfigs` cuando aplique.
- Controlar acceso con RBAC y Projects por equipo.

## Recursos
- Docs: https://docs.openshift.com/