# Linux – Guía Rápida

## Definición
- Sistema operativo open source, base de la mayoría de infra DevOps.

## Comandos básicos
- Navegación: `ls`, `cd`, `pwd`, `tree`
- Gestión: `cp`, `mv`, `rm`, `tar`, `zip`, `unzip`
- Permisos: `chmod`, `chown`, `umask`
- Procesos: `ps`, `top`, `htop`, `kill`, `nice`
- Red: `ip`, `ss`, `curl`, `wget`
- Servicios: `systemctl status <svc>`, `journalctl -u <svc>`

## Casos prácticos
- Diagnóstico de servicios y logs.
- Automatización con scripts Bash.

## Estructura básica (script)
```bash
#!/usr/bin/env bash
set -euo pipefail

log() { echo "[$(date +%T)] $*"; }
log "Iniciando tarea"
# ...
```

## Buenas prácticas
- Usar `set -euo pipefail` en scripts.
- Mantener roles y permisos mínimos.

## Recursos
- Docs: https://www.gnu.org/software/coreutils/manual/