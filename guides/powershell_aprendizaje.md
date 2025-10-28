# PowerShell – Guía Rápida

## Definición
- Shell y lenguaje orientado a objetos para automatización en Windows y multiplataforma.

## Comandos básicos
- `Get-Process`, `Get-Service`, `Get-EventLog`
- `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`
- `Invoke-RestMethod -Uri <url> -Method GET`
- `Import-Module <Nombre>` / `Install-Module <Nombre> -Scope CurrentUser`

## Casos prácticos
- Automatizar despliegues, consultas a APIs y administración de sistemas.

## Estructura básica (script)
```powershell
Param(
  [string]$Name = "World"
)
Write-Host "Hello $Name"
```

## Buenas prácticas
- Modularizar funciones y usar `Param` para entradas.
- Firmar scripts y restringir políticas de ejecución.

## Recursos
- Docs: https://learn.microsoft.com/powershell/