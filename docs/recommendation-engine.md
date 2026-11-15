# Motor de recomendaciones

`heuristic_v0` ordena zonas, pero no predice ocupación.

```text
distance_score = max(0, 1 - distancia / radio)
evidence_score = min(log(1 + geometrías) / log(1 + 50), 1)
ranking_score = 0.75 × distance_score + 0.25 × evidence_score
```

La puntuación no se muestra como porcentaje. Todas las respuestas incluyen:

- `availability_probability: null`
- `availability_status: unknown`
- `confidence: unvalidated`
- explicación basada en distancia y evidencia municipal

Una futura predicción histórica deberá implementar otra estrategia y aportar versión del modelo, fecha, variables, calibración e incertidumbre. Nunca sustituirá silenciosamente al ranking por reglas.
