# ArgoCD – Guía Rápida

## Definición
- Herramienta GitOps para sincronizar el estado deseado (manifiestos en Git) con el clúster Kubernetes.
- Gestiona despliegues, rollbacks y health checks automáticamente.

## Comandos básicos
- `argocd login <host> --username <user> --password <pass>`
- `argocd app create <nombre> --repo <url> --path <ruta> --dest-server https://kubernetes.default.svc --dest-namespace <ns>`
- `argocd app list`
- `argocd app sync <nombre>`
- `argocd app set <nombre> --auto-sync true`
- `argocd app delete <nombre>`

## Casos prácticos
- Despliegue multiambiente (dev/stg/prd) con ramas o carpetas por entorno.
- Rollback rápido a la última versión estable almacenada en Git.
- Aplicación de políticas de seguridad y validaciones antes del sync.

## Estructura básica (repositorio GitOps)
```
apps/
  my-app/
    base/
      deployment.yaml
      service.yaml
    overlays/
      dev/
        kustomization.yaml
      prod/
        kustomization.yaml
argocd/
  application.yaml  # Definición del ArgoCD Application
```

## Buenas prácticas
- Mantener manifiestos en Git, inmutables y versionados.
- Usar `overlays` con Kustomize para diferencias entre entornos.
- Activar auto-sync y health checks; auditar cambios vía PR.

## Cuándo usar
- Equipos que desean trazabilidad completa y despliegue declarativo en Kubernetes.

## Cuándo evitar
- Entornos sin Kubernetes o donde no se requiera GitOps.

## Recursos
- Docs: https://argo-cd.readthedocs.io/