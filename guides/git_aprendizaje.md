# Git – Guía Rápida

## Definición
- Sistema de control de versiones distribuido.

## Comandos básicos
- `git init` / `git clone <url>`
- `git add .` / `git commit -m "mensaje"`
- `git branch -M main` / `git checkout -b feature/x`
- `git merge feature/x` / `git rebase main`
- `git push origin main` / `git pull`

## Casos prácticos
- Flujo por ramas: `feature` → `PR` → `review` → `merge`.
- Hotfix rápido desde producción hacia main.

## Estructura básica (repo)
```
.
├─ src/
├─ tests/
└─ README.md
```

## Buenas prácticas
- Commits pequeños, mensajes claros y PRs acotados.
- Usar tags y releases para versiones.

## Cuándo usar
- Todo desarrollo con necesidad de versionado y colaboración.

## Cuándo evitar
- N/A.

## Recursos
- Docs: https://git-scm.com/doc