# GitHub Actions – Guía Rápida

## Definición
- Automatización CI/CD basada en eventos y workflows YAML.

## Comandos básicos (CLI opcional)
- `gh workflow list`
- `gh workflow run <workflow.yml>`

## Casos prácticos
- Build/test en cada `push` y despliegue a producción con `tag`.

## Estructura básica (workflow)
```yaml
name: CI
on:
  push:
    branches: [ main ]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci && npm test && npm run build
```

## Buenas prácticas
- Usar `secrets` y ambientes con `protection rules`.
- Cachear dependencias para acelerar builds.

## Cuándo usar
- Repos alojados en GitHub con flujos de CI/CD.

## Cuándo evitar
- Repos fuera de GitHub o requerimientos de runner dedicado.

## Recursos
- Docs: https://docs.github.com/actions