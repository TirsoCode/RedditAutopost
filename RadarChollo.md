# 📦   RadarChollo — Especificación del Proyecto

> Micro SaaS de alertas de precio para tiendas online españolas  
> Stack: Next.js · Supabase · Resend · ScraperAPI · Vercel

---

## 1. Descripción
RadarChollo permite a cualquier usuario pegar la URL de un producto de cualquier tienda online (con foco en tiendas españolas) y recibir un aviso por email cuando:

- El precio **baja**
- El precio **sube** (para vendedores o seguimiento)
- El producto vuelve a estar **en stock**

Sin complicaciones. Sin instalar nada. Solo pegar la URL y esperar el aviso.

---

## 2. Usuarios y acceso

- **Autenticación:** Login con Google + registro con cuenta propia (email/contraseña)
- **Límite por usuario:** máximo **5 productos** rastreados simultáneamente
- **Precio:** completamente **gratuito**

---

## 3. Funcionalidades principales

### 3.1 Añadir producto
- El usuario pega la URL de cualquier producto de tienda online española
- La web extrae automáticamente: nombre del producto, precio actual e imagen (si disponible)
- El usuario elige qué tipo de alerta quiere: bajada de precio, subida de precio o vuelta a stock

### 3.2 Dashboard del usuario
- Lista de productos rastreados (máximo 5)
- Para cada producto se muestra:
  - Nombre del producto
  - Precio actual
  - Precio anterior
  - Estado (en stock / sin stock)
  - Tipo de alerta activada
  - Botón para eliminar el rastreo

### 3.3 Alertas por email
- Canal único: **email**
- Se envía cuando se cumple la condición configurada
- El email incluye: nombre del producto, precio anterior, precio nuevo y enlace directo al producto

### 3.4 Historial de precios
- No se implementa gráfica de historial
- Solo se muestra el **precio actual** y el **precio anterior**

---

## 4. Stack tecnológico

| Capa | Tecnología | Plan gratuito |
|---|---|---|
| Frontend / Backend | Next.js (App Router) | ✅ |
| Base de datos | Supabase | ✅ |
| Autenticación | Supabase Auth (Google OAuth + email) | ✅ |
| Scraping de precios | ScraperAPI | ✅ 1.000 créditos/mes |
| Envío de emails | Resend | ✅ 3.000 emails/mes |
| Cron jobs | Vercel Cron Jobs | ✅ |
| Despliegue | Vercel | ✅ |

---

## 5. Frecuencia de rastreo

Determinada por los límites del plan gratuito de ScraperAPI:

- **1.000 créditos/mes gratuitos**
- Con 5 productos por usuario y revisión cada 6 horas → ~150 revisiones/mes por usuario
- Frecuencia recomendada: **cada 6 horas**

---

## 6. Modelo de negocio

- **Gratuito para siempre**
- Objetivo: crecer por volumen y visibilidad
- Posible monetización futura: plan premium con más productos o frecuencia mayor (no en v1)

---

## 7. Tiendas soportadas

- Cualquier tienda online accesible públicamente
- Foco inicial en **tiendas españolas**: Amazon.es, Zara, El Corte Inglés, MediaMarkt, PcComponentes, Fnac, etc.
- El usuario pega la URL y la web intenta scrapearlo automáticamente

---

## 8. Diseño visual

- **Estilo:** por definir (pendiente pregunta 11)

---

## 9. Pendiente de definir

- [ ] Nombre de la web
- [ ] Estilo visual (pregunta 11 en curso)
- [ ] Preguntas 12 y 13

---

## 10. Estructura de base de datos (Supabase)

### Tabla `users`
Gestionada por Supabase Auth automáticamente.

### Tabla `tracked_products`
```
id              uuid (PK)
user_id         uuid (FK → auth.users)
url             text
name            text
image_url       text
current_price   numeric
previous_price  numeric
in_stock        boolean
alert_type      enum ('price_drop', 'price_rise', 'back_in_stock')
created_at      timestamp
last_checked_at timestamp
```

### Tabla `alert_logs`
```
id          uuid (PK)
product_id  uuid (FK → tracked_products)
alert_type  text
old_value   numeric
new_value   numeric
sent_at     timestamp
```

---

## 11. Flujo principal del usuario

```
1. Usuario llega a la landing
2. Se registra o hace login con Google
3. Pega la URL de un producto
4. La web muestra nombre, precio actual e imagen
5. El usuario elige el tipo de alerta y confirma
6. El producto aparece en su dashboard
7. Cada 6h el cron revisa el precio
8. Si se cumple la condición → email automático al usuario
```

---

## 12. Roadmap v1 (MVP)

- [ ] Landing page con CTA
- [ ] Autenticación (Google + email)
- [ ] Formulario para añadir URL de producto
- [ ] Scraping con ScraperAPI
- [ ] Dashboard con lista de productos
- [ ] Cron job cada 6h
- [ ] Email de alerta con Resend
- [ ] Página de gestión de alertas (eliminar producto)
