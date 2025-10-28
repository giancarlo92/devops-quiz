# Azure DevOps – Guía Rápida

## Definición
- Plataforma para repos, boards, pipelines, artefactos y Test Plans.

## Comandos básicos (CLI)
- `az extension add --name azure-devops`
- `az devops configure --defaults organization=https://dev.azure.com/<org> project=<project>`
- `az pipelines create --name <name> --yml-path .azure-pipelines.yml`

## Casos prácticos
- Pipeline CI/CD con stages para build, test y deploy.
- Integración con Kubernetes (AKS) y contenedores.

## Estructura básica (pipeline YAML)
```yaml
trigger:
  - main

stages:
- stage: Build
  jobs:
  - job: build
    steps:
    - script: npm ci && npm run build

- stage: Deploy
  jobs:
  - job: deploy
    steps:
    - script: kubectl apply -f k8s/
```

## Buenas prácticas
- Usar Service Connections seguros y variables secretas.
- Aprobar despliegues productivos con checks manuales.

## Cuándo usar
- Equipos que ya usan ecosistema Azure y desean integración nativa.

## Cuándo evitar
- Flujos que requieren features fuera del alcance de la plataforma.

## Recursos
- Docs: https://learn.microsoft.com/azure/devops/