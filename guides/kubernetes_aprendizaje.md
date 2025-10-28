# Kubernetes – Guía Rápida

## Definición
- Orquestador de contenedores para despliegue, escalado y operación.

## Comandos básicos
- `kubectl get pods,svc,deploy -n <ns>`
- `kubectl apply -f <manifiesto>.yaml`
- `kubectl logs <pod> -n <ns>` / `kubectl exec -it <pod> -- sh`
- `kubectl rollout restart deploy/<name> -n <ns>`

## Casos prácticos
- Despliegue de una app web con Service y Ingress.
- Escalado horizontal y actualizaciones rolling.

## Estructura básica (manifiestos)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: nginx:alpine
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  type: ClusterIP
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 80
```

## Buenas prácticas
- Usar `requests/limits`, probes y ConfigMaps/Secrets.
- Controlar RBAC y namespaces por entorno.

## Cuándo usar
- Apps contenedorizadas con necesidad de alta disponibilidad y escalado.

## Cuándo evitar
- Cargas simples donde un PaaS gestionado sea suficiente.

## Recursos
- Docs: https://kubernetes.io/docs/