# Cambios

## 2026-08-14 — Fix preventivo en `firebase.json`

Se agregó `"**/.*/**"` al array `ignore`.

**Por qué:** el patrón `"**/.*"` que ya estaba excluye *archivos* ocultos pero
**no el contenido de carpetas ocultas**, así que Firebase subía `.git/objects/…`
y el repositorio quedaba descargable por HTTP. Eso pasó en 6 sitios del grupo
(ver expediente).

**Este sitio no estaba expuesto** — se verificó. El cambio es preventivo y se
activa solo en el próximo deploy normal; no hace falta desplegar por esto.

---

Expediente completo:
`D:\Aideas\FRANDOWEB\BOOSTRAP\docs\incidente-git-expuesto.md`
