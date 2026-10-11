# 🌊 WAVE - Premium Music Player

## Visión
WAVE es un reproductor de música premium diseñado para competir con Spotify. Con identidad propia, interfaz moderna y experiencia de usuario fluida, ofrece una alternativa profesional y diferenciada.

## Identidad Visual

### Paleta de Colores (WAVE Spectrum)
- **Primario:** Cyan brillante `#00d9ff` - Energía y tecnología
- **Secundario:** Índigo `#6366f1` - Profundidad y sofisticación
- **Base:** Azul oscuro profundo `#0a0e27` - Premium y minimalista
- **Acentos:** Emerald verde `#10b981` - Confirmaciones y éxito

### Diseño
- **Glassmorphism:** Bordes translúcidos y fondos con blur
- **Motion Design:** Transiciones suaves y animaciones premium
- **Profundidad:** Sombras y gradientes estratégicos
- **Tipografía:** Figtree (headings) + Inter Tight (body)

## Características Principales

### Desktop
- ✅ Reproductor central con portada grande
- ✅ Barra de volumen sticky
- ✅ Controles flotantes siempre accesibles
- ✅ Visualizador de espectro dinámico
- ✅ Cola de reproducción inteligente
- ✅ Ecualizador 10-band
- ✅ Búsqueda en tiempo real (local + YouTube + iTunes)

### Mobile
- ✅ Bottom navigation intuitiva
- ✅ Drawer deslizable sincronizado (biblioteca + playlists)
- ✅ Miniplayer compacto con controles
- ✅ Interfaz táctil optimizada
- ✅ Responsive completo (hasta 680px)

### Común
- ✅ Playlists personalizadas
- ✅ Descarga por URL (YouTube)
- ✅ Temas de color dinámicos
- ✅ Atajos de teclado (Space, ← →, ↑ ↓)
- ✅ Sincronización de estado
- ✅ Persistencia local (IndexedDB)

## Diferenciación vs Spotify

| Aspecto | WAVE | Spotify |
|---------|------|----------|
| Paleta | Cyan/Índigo/Azul | Verde/Gris |
| Feeling | Premium Tech Brand | Streaming generic |
| Mobile | Drawer + Bottom nav | Tab-based |
| Visualizador | Animado premium | Minimal |
| Identidad | WAVE = Audio brand | Spotify = Music platform |

## Estructura de Archivos

```
ucp/
├── index.html              # HTML estructura completa
├── style-premium.css       # Estilos rediseñados (paleta nueva)
├── premium-player.js       # Lógica de player + mobile fixes
├── script.js              # Lógica principal (original)
├── wave-fixes.js          # Compatibilidad y fixes
└── README-WAVE.md         # Este archivo
```

## Cómo Usar

1. **Abrir la app:** `index.html` en navegador
2. **Cargar música:** Botón "Elegir carpeta de música" en sidebar
3. **Reproducir:** Click en canción o Space para play/pause
4. **Mobile:** Usa bottom nav para navegar entre vistas
5. **Atajos:**
   - `Space`: Play/Pause
   - `← →`: Anterior/Siguiente
   - `↑ ↓`: Volumen

## Roadmap Futuro

- [ ] Sincronización en la nube
- [ ] Recomendaciones basadas en IA
- [ ] Modo podcast
- [ ] Integración con redes sociales
- [ ] Aplicación nativa (Electron)
- [ ] Soporte para servicios (Spotify, Apple Music)

## Notas de Desarrollo

### Paleta Premium
La paleta cyan/índigo fue elegida para:
- Diferenciarse de Spotify (verde)
- Sonar como "tech brand" (no generic music)
- Mantener legibilidad en azul profundo
- Evocar sensación de calidad y exclusividad

### Mobile-First Responsive
- Breakpoint principal: 680px
- Drawer automático en mobile
- Bottom nav sticky
- Miniplayer sincronizado
- Contacto nativo en iOS/Android

### Performance
- CSS optimizado con variables
- JavaScript modular y ligero
- IndexedDB para persistencia
- Scroll smooth con momentum

## Créditos

**WAVE** es un proyecto premium de música diseñado para ser diferente, profesional y competitivo.

---

**Versión:** 1.0 Premium  
**Última actualización:** Octubre 2026  
**Estado:** Producción ✅
