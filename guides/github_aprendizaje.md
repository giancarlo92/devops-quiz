# GitHub – Guía Rápida

## Definición
- Plataforma para alojar código, colaborar y automatizar flujos.

## Comandos básicos (CLI `gh`)
- `gh auth login`
- `gh repo create <owner>/<name> --public`
- `gh issue create -t "Título" -b "Descripción"`
- `gh pr create --fill`

## Casos prácticos
- Flujo de PR con revisión y checks obligatorios.
- Gestión de Issues y Projects para trabajo ágil.

## Estructura básica
```
.
├─ .github/
│  └─ workflows/ci.yml
├─ src/
└─ README.md
```

## Buenas prácticas
- Protecciones en ramas, revisiones obligatorias y CODEOWNERS.
- Usar Releases y etiquetas semánticas.

## Cuándo usar
- Colaboración y automatización sobre repos Git.

## Cuándo evitar
- Repos privados con restricciones corporativas específicas.

## Recursos
- Docs: https://docs.github.com/