# Orden de resultados

La experiencia principal utiliza la predicción municipal de aparcamiento regulado. Ordena por menor porcentaje de ocupación prevista y usa la distancia únicamente como desempate. La interfaz muestra la clasificación oficial alta/media/baja, el porcentaje de ocupación y el horizonte temporal.

No convierte el margen libre en una probabilidad numérica ni aplica la predicción a calles no reguladas.

## Ranking histórico sin predicción

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

Este ranking se conserva en la API por compatibilidad, pero ya no alimenta la lista principal de la interfaz.
