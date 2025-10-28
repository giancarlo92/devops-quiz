# Terraform – Guía Rápida

## Definición
- Herramienta IaC para definir y provisionar infraestructura declarativa.

## Comandos básicos
- `terraform init`
- `terraform plan` / `terraform apply`
- `terraform destroy`

## Casos prácticos
- Provisionar VMs, redes y servicios en múltiples nubes.

## Estructura básica
```hcl
terraform {
  required_version = ">= 1.6"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}
provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "rg" {
  name     = "devops-rg"
  location = "eastus"
}
```

## Buenas prácticas
- Separar `modules`, usar `remote state` y `workspaces`.
- Controlar versiones y `lifecycle` cuando aplique.

## Recursos
- Docs: https://developer.hashicorp.com/terraform/docs