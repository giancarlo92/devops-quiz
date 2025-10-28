# Azure – Guía Rápida

## Definición
- Plataforma cloud de Microsoft con servicios IaaS, PaaS y SaaS.

## Comandos básicos (CLI)
- `az login`
- `az group create -n <rg> -l <region>`
- `az vm create -g <rg> -n <vm> --image UbuntuLTS --admin-username <user>`
- `az storage account create -n <name> -g <rg> -l <region> --sku Standard_LRS`
- `az aks create -g <rg> -n <aks> --node-count 2 --generate-ssh-keys`

## Casos prácticos
- Provisionar RG, redes y VMs base para laboratorio.
- AKS para orquestación de contenedores y CI/CD.

## Estructura básica (IaC con ARM/Bicep)
```
infra/
  main.bicep
  modules/
    vnet.bicep
    vm.bicep
```

## Buenas prácticas
- Usar identidades gestionadas y Key Vault para secretos.
- Etiquetar recursos (`tags`) para coste y gobernanza.

## Cuándo usar
- Necesidad de integración con ecosistema Microsoft y servicios administrados.

## Cuándo evitar
- Requerimientos que no se ajusten al modelo de costes/servicios.

## Recursos
- Docs: https://learn.microsoft.com/azure/