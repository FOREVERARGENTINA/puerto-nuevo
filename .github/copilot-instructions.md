# GitHub Copilot Instructions

Lee `docs/AGENTS.md` para decisiones específicas de este proyecto.
Lee `docs/guia.md` para principios generales de desarrollo web.

**Jerarquía:** AGENTS.md > guia.md > Sugerencias por defecto

## Reglas principales:

- Siempre mobile-first
- Accesibilidad obligatoria (alt descriptivos, contraste 4.5:1)
- Validación isomórfica con Zod (cliente + servidor)
- Self-hosted fonts (NO Google Fonts CDN)
- CSS moderno nativo (nesting, container queries, :has())
- INP < 200ms (event delegation, debouncing)

Consultar docs/AGENTS.md para stack específico del proyecto.
Consultar docs/guia.md para ejemplos de código y mejores prácticas.
