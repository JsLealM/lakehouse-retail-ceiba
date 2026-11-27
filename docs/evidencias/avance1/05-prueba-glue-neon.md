# Evidencia #5 · Glue llega a Neon sin VPC

Job temporal `prueba_neon` (script `etl/jobs/prueba_neon.py`) ejecutado en AWS Glue, región us-east-2,
**sin VPC ni conexión de red**, con el rol `ceiba-glue-role` y el secreto `ceiba/neon-oltp`.

## Resultado del job (aws glue get-job-run)

```json
{
    "estado": "SUCCEEDED",
    "inicio": "2026-11-27T18:47:12.491000-05:00",
    "fin": "2026-11-27T18:48:21.457000-05:00",
    "seg": 61,
    "dpu_seg": 123.0,
    "workers": 2,
    "tipo": "G.1X",
    "glue": "5.0",
    "timeout": 3
}
```

Run id: `jr_b169af3260c075e1d07a2efaa57c41f516cd4e1d354ec776be613b14462c0ef2`

## Salida del script (CloudWatch, grupo /aws-glue/jobs/output)

```
[prueba_neon] credenciales desde Secrets Manager
[prueba_neon] retail.cliente: 120011 filas (esperado 120011)
```

## Qué demuestra

- Glue llega a Neon por internet con TLS (`sslmode=require`), sin VPC ni NAT Gateway.
- El rol `ceiba-glue-role` puede leer el secreto `ceiba/neon-oltp` (módulo security, #33).
- Costo: 123 DPU-segundos ≈ 0,015 USD (0,44 USD por DPU-hora).

El job y su script se borraron después de la prueba.
