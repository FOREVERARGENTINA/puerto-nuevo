# Prevención y Corrección de Mojibakes

## Qué es un mojibake

Corrupción de caracteres especiales (á, é, ñ) que aparecen como `Ã©`, `Ãº`, `Ã±`.

**Causa:** Codex/OpenAI u otros agentes escriben con codificación Latin-1 en lugar de UTF-8.

---

## Prevención Automática

### 1. .editorconfig (ya configurado)

Todos los editores (VS Code, Codex, etc.) que soporten EditorConfig respetarán automáticamente UTF-8.

### 2. Configurar VS Code

Si usas VS Code con Codex:

```json
// .vscode/settings.json
{
  "files.encoding": "utf8",
  "files.autoGuessEncoding": false
}
```

---

## Detección de Mojibakes

### Comando

```bash
npm run check:encoding
```

Escanea archivos `.js`, `.jsx`, `.css`, `.html`, `.md` en busca de mojibakes.

**Salida ejemplo:**
```
=== DETECTOR DE MOJIBAKES ===

--- RESUMEN ---
Archivos escaneados: 112
Archivos con problemas: 2

[MOJIBAKE] src/components/gallery/admin/MediaUploader.jsx
  - sÃºbelo (1 ocurrencias) -> deberia ser: súbelo

[ACCION] Para corregir automaticamente:
  npm run fix:encoding
```

---

## Corrección Automática

### Modo dry-run (preview, no modifica)

```bash
npm run fix:encoding
```

### Aplicar cambios

```bash
npm run fix:encoding:apply
```

O alternativamente:
```bash
npm run fix:encoding -- --apply
```

**Estrategia de corrección:**
- Mapeo determinístico UTF-8 mal interpretado como Latin-1
- Ordena claves por longitud (evita reemplazos parciales)
- Dry-run por defecto (requiere --apply para escribir)
- Sin patrones duplicados o ambiguos

---

## Workflow Recomendado

Después de que Codex edite archivos:

1. **Verificar:**
   ```bash
   npm run check:encoding
   ```

2. **Preview correcciones:**
   ```bash
   npm run fix:encoding
   ```

3. **Aplicar si todo OK:**
   ```bash
   npm run fix:encoding:apply
   ```

4. **Revisar cambios:**
   ```bash
   git diff
   ```

5. **Commitear:**
   ```bash
   git add .
   git commit -m "fix: corregir mojibakes"
   ```

---

## Pre-commit Hook (opcional)

Valida automáticamente antes de cada commit:

```bash
# .git/hooks/pre-commit
#!/bin/sh
npm run check:encoding || {
  echo "[ERROR] Mojibakes detectados. Ejecuta: npm run fix:encoding:apply"
  exit 1
}
```

---

## Solución Manual (VS Code)

Si un archivo específico tiene mojibake:

1. Abrí el archivo en VS Code
2. Click en "UTF-8" (barra inferior derecha)
3. "Reopen with Encoding" → **Western (Windows 1252)**
4. Los caracteres se verán correctos
5. "Save with Encoding" → **UTF-8**
6. Listo

---

## 📋 Mojibakes Comunes

| Mojibake | Correcto | Palabra ejemplo |
|----------|----------|-----------------|
| Ã©       | é        | café            |
| Ã¡       | á        | página          |
| Ã³       | ó        | función         |
| Ãº       | ú        | menú            |
| Ã­       | í        | raíz            |
| Ã±       | ñ        | niño            |
| Â¿       | ¿        | ¿Cómo?          |
| Â¡       | ¡        | ¡Hola!          |

---

## 🤖 Configurar Codex/OpenAI

Si usás Codex desde API/CLI, asegurate de:

```javascript
const fs = require('fs');

// Siempre especificar UTF-8 al escribir
fs.writeFileSync(filePath, content, { encoding: 'utf8' });
```

---

## ✨ Resumen

- ✅ `.editorconfig` configurado → Previene mojibakes
- ✅ `npm run check:encoding` → Detecta problemas
- ✅ `npm run fix:encoding` → Corrige automáticamente
- ✅ UTF-8 siempre, en todos lados

**Nunca más mojibakes! 🎉**
