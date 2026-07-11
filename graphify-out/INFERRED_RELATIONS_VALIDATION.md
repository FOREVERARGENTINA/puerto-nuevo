# INFERRED_RELATIONS_VALIDATION.md

Validación de relaciones inferidas por graphify en el grafo de conocimiento.

Fecha: 2026-07-11

## Resumen

- Total de relaciones INFERRED: 35 (21% del total)
- Relaciones AMBIGUOUS: 0
- Relaciones EXTRACTED: 131 (79%)

## Relaciones Inferidas Requerieren Validación

### 1. Apple Touch Icon Default (9 edges INFERRED)

**Archivo fuente:** `D:\Aideas\PUERTO NUEVO\public\apple-touch-icon.png`

Las 9 relaciones INFERRED conectan el icono por defecto con las versiones de diferentes resoluciones. 

**Validación:** ✅ VÁLIDO - Estas son relaciones de equivalencia entre variantes de resolución del mismo asset. El icono por defecto es la fuente master de la cual se derivan las demás resoluciones. Relación determinista basada en convención de archivos PWA.

### 2. Guia para Agentes de IA (2 edges INFERRED)

**Archivo fuente:** `D:\Aideas\PUERTO NUEVO\docs\agents.md`

Las relaciones INFERRED conectan la guía con:
- Guia Consolidada de Desarrollo Web Moderno 2026
- Estado Real de Implementacion

**Validación:** ✅ VÁLIDO - La guía para agentes documenta convenciones del proyecto que se relacionan directamente con el estado de implementación y las guías consolidadas. Relación temática razonable.

### 3. PWA Push Notifications Full-Stack (1 edge INFERRED)

**Relación:** system_push_notifications → hook_use_push_notifications (confidence 0.85)

**Validación:** ✅ VÁLIDO - El sistema de notificaciones push efectivamente usa el hook usePushNotifications como punto de integración principal.

### 4. Relaciones de Assets Estáticos (múltiples INFERRED)

Varios iconos y assets estáticos tienen relaciones INFERRED basadas en:
- Mismo prefijo de nombre (variantes de resolución)
- Mismo directorio (assets relacionados)
- Convención de proyecto (PWA icons, favicons)

**Validación:** ✅ VÁLIDAS - Todas las relaciones de assets estáticos son inferencias correctas basadas en convenciones de proyecto.

## Archivos Sensibles Detectados

El detector marcó 3 archivos como `skipped_sensitive` durante el escaneo inicial. Estos archivos fueron excluidos de la extracción por contener potencialmente datos sensibles. Los nombres exactos no están disponibles en el reporte final (el detector los omite deliberadamente por seguridad).

## Integridad de Datos

### graph.json
- ✅ No contiene PII, credenciales, tokens ni datos de negocio
- ✅ Solo contiene estructura del grafo (nodos, aristas, metadatos)

### GRAPH_REPORT.md
- ✅ No contiene información sensible
- ✅ Solo contiene análisis del grafo y métricas

### manifest.json
- ✅ Solo contiene lista de archivos escaneados y rutas
- ✅ No contiene contenido de archivos

## Conclusión

Todas las relaciones INFERRED validadas son legítimas y no requieren promoción a EXTRACTED (ya que no son explícitas en el código fuente). La procedencia está documentada correctamente.
