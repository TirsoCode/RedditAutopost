# RedditAutoPost

**Herramienta de automatización de contenido en Reddit con IA**

---

## 📋 Overview

RedditAutoPost es una plataforma web que:
- Monitorea 20+ subreddits automáticamente
- Detecta posts relevantes con IA
- Redacta respuestas/posts naturales (basadas en tu web)
- Mezcla valor + promoción sutíl (sin parecer spam)
- Publica 1-3 posts diarios
- Dashboard para revisar antes de publicar

**Usuario:** Solo tú (MVP personal)  
**Timeline:** 2-3 semanas

---

## 🎯 Flujo de Usuario

```
1. Configuración inicial
   └─ Cargas tu URL web
   └─ Seleccionas subreddits a monitorear (20+)
   └─ Configuras frecuencia de posts (1-3/día)

2. Sistema corre automáticamente
   └─ Cada X horas: escanea subreddits
   └─ Filtra posts relevantes con IA
   └─ Redacta respuesta/post natural
   └─ Almacena en BD

3. Tú revisas en dashboard
   └─ Ve posts redactados
   └─ Aprueba/rechaza/edita
   └─ Click = publica en Reddit

4. Tracking
   └─ Ve stats (upvotes, comentarios, engagement)
   └─ Historial completo
   └─ Análisis de qué subreddits funcionan
```

---

## 🏗️ Arquitectura Técnica

### **Frontend (React)**
```
/frontend
├── pages/
│   ├── Dashboard.jsx          (vista principal)
│   ├── ApprovedPosts.jsx      (posts publicados)
│   ├── SubredditConfig.jsx    (gestión de subreddits)
│   ├── Analytics.jsx          (stats & engagement)
│   └── Settings.jsx           (web URL, frecuencia, etc)
├── components/
│   ├── PostCard.jsx           (post individual para revisar)
│   ├── StatsBadge.jsx         (upvotes, comentarios)
│   ├── SubredditList.jsx      (lista de subreddits activos)
│   └── ApprovalModal.jsx      (revisar antes de publicar)
└── services/
    ├── api.js                 (llamadas al backend)
    └── auth.js                (autenticación Reddit)
```

### **Backend (Node.js + Express)**
```
/backend
├── routes/
│   ├── posts.js               (GET drafts, POST approve, DELETE reject)
│   ├── subreddits.js          (GET list, POST add, DELETE remove)
│   ├── stats.js               (GET engagement, upvotes, comentarios)
│   ├── settings.js            (GET/POST config user)
│   └── publish.js             (POST publish to Reddit)
├── controllers/
│   ├── redditController.js    (PRAW integration, monitoreo)
│   ├── aiController.js        (Claude API calls)
│   ├── postController.js      (CRUD posts)
│   └── authController.js      (OAuth Reddit)
├── models/
│   ├── User.js                (usuario, URL web, config)
│   ├── Post.js                (post redactado, stats, status)
│   ├── Subreddit.js           (subreddits monitoreados)
│   └── RedditAuth.js          (tokens OAuth)
├── jobs/
│   ├── monitorSubreddits.js   (cron: cada 6 horas)
│   ├── redactPosts.js         (llama a IA)
│   └── trackStats.js          (cron: cada hora, update engagement)
└── utils/
    ├── claudeAPI.js           (llamadas a Claude API)
    ├── redditAPI.js           (PRAW wrapper)
    └── logger.js              (logs)
```

### **Base de Datos (PostgreSQL)**
```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  reddit_username VARCHAR UNIQUE,
  reddit_access_token TEXT,
  reddit_refresh_token TEXT,
  web_url VARCHAR,
  post_frequency INT (1-3),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Subreddits monitoreados
CREATE TABLE subreddits (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  subreddit_name VARCHAR,
  active BOOLEAN,
  added_at TIMESTAMP
);

-- Posts redactados
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  subreddit_name VARCHAR,
  original_post_id VARCHAR,
  original_post_title TEXT,
  original_post_url TEXT,
  drafted_content TEXT,
  status VARCHAR (draft, approved, published, rejected),
  published_url VARCHAR,
  reddit_post_id VARCHAR,
  upvotes INT,
  comments INT,
  engagement_score DECIMAL,
  created_at TIMESTAMP,
  published_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Stats de posts publicados
CREATE TABLE post_stats (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts,
  upvotes INT,
  downvotes INT,
  comments INT,
  awards INT,
  engagement_score DECIMAL,
  tracked_at TIMESTAMP
);
```

---

## 🤖 Flujo de IA (Claude API)

### **1. Análisis de Relevancia**
```
INPUT: 
  - Post de Reddit (título + contenido + subreddit)
  - Tu web URL (extraída como contexto)

PROMPT:
"Analiza este post de Reddit y determina si es relevante 
para alguien que usa [TU SERVICIO].
Responde SOLO: relevante/no_relevante + por_qué (1 línea)"

OUTPUT: relevante? (true/false)
```

### **2. Redacción Natural**
```
INPUT:
  - Post original
  - Tu web (contexto sobre qué ofreces)
  - Tipo: "respuesta" o "post"

PROMPT:
"Redacta una respuesta natural a este post de Reddit:
[POST]

Contexto sobre quién eres: [TU WEB CONTENT]

Requisitos:
- Proporciona valor real primero (consejos, insight)
- Menciona tu solución de forma natural, como si recomendases algo que usas
- NO hagas pitch explícito
- Máximo 200 palabras
- Tono casual, auténtico, nada salesy
- Si es relevante, sugiere tu web al final: 'Yo uso [tu web] para esto y me funciona'

Redacta:"

OUTPUT: texto redactado listo para revisar
```

### **3. Análisis de Spam Risk**
```
INPUT: texto redactado

PROMPT:
"¿Parece spam/bot este mensaje? 
Responde: bajo/medio/alto + por_qué

Si es MEDIO o ALTO, propón mejora:"

OUTPUT: risk_level + suggestion
```

---

## 🔄 Procesos Automáticos (Cron Jobs)

### **Job 1: Monitorear Subreddits** (cada 6 horas)
```python
# Pseudocódigo
for subreddit in user.subreddits:
    posts = reddit.get_new_posts(subreddit, limit=50)
    
    for post in posts:
        # Evita duplicados
        if post_exists_in_db(post.id):
            continue
        
        # Analiza relevancia con IA
        is_relevant = claude_api.check_relevance(post, user.web_url)
        
        if is_relevant:
            # Redacta automáticamente
            draft = claude_api.redact_response(post, user.web_url)
            
            # Guarda en BD
            save_post_draft(
                user_id=user.id,
                subreddit=subreddit,
                original_post_id=post.id,
                drafted_content=draft,
                status="draft"
            )
```

### **Job 2: Publicar Posts Aprobados** (cada 1 hora)
```python
# Pseudocódigo
approved_posts = get_approved_posts(status="approved")

for post in approved_posts:
    try:
        # Publica en Reddit
        reddit_post = reddit.submit(
            subreddit=post.subreddit_name,
            title=post.title or "Aquí va el título",
            selftext=post.drafted_content
        )
        
        # Actualiza BD
        post.update(
            status="published",
            reddit_post_id=reddit_post.id,
            published_url=reddit_post.url,
            published_at=now()
        )
    except Exception as e:
        log_error(e)
```

### **Job 3: Trackear Stats** (cada hora)
```python
# Pseudocódigo
published_posts = get_published_posts()

for post in published_posts:
    reddit_post = reddit.submission(post.reddit_post_id)
    
    save_stat(
        post_id=post.id,
        upvotes=reddit_post.score,
        comments=len(reddit_post.comments),
        awards=count_awards(reddit_post),
        engagement_score=(upvotes + comments*2 + awards*5) / time_posted_hours
    )
```

---

## 🔐 Autenticación

### **Reddit OAuth Flow**
```
1. User hace click en "Conectar Reddit"
2. Redirige a: https://www.reddit.com/api/v1/authorize
   ├─ client_id: [TU APP ID]
   ├─ redirect_uri: https://tusite.com/callback
   ├─ scope: [submit, edit, read, history]
   └─ response_type: code

3. Reddit redirige a /callback con código

4. Backend intercambia código por tokens
   ├─ access_token (1 hora)
   └─ refresh_token (permanente)

5. Guarda en BD, usuario logueado ✅
```

---

## 📊 Dashboard Features

### **Vista Principal (Draft Posts)**
```
┌─────────────────────────────────────────┐
│ RedditAutoPost - Dashboard              │
├─────────────────────────────────────────┤
│ Posts pendientes: 12 | Publicados: 45   │
├─────────────────────────────────────────┤
│                                         │
│ [Post Card 1]                           │
│ ├─ Subreddit: r/python                  │
│ ├─ Original: "How to learn FastAPI?"    │
│ ├─ Drafted: "Yo uso [TU SERVICIO]..."   │
│ ├─ Spam Risk: Bajo ✅                   │
│ └─ [Aprobar] [Rechazar] [Editar]        │
│                                         │
│ [Post Card 2]                           │
│ └─ ...                                  │
│                                         │
└─────────────────────────────────────────┘
```

### **Vista de Stats**
```
┌─────────────────────────────────────────┐
│ Analytics                               │
├─────────────────────────────────────────┤
│ Total publicados: 45                    │
│ Promedio upvotes: 23                    │
│ Promedio comentarios: 5                 │
│ Engagement rate: 8.2%                   │
│                                         │
│ Top subreddits:                         │
│ ├─ r/python: 15 posts, avg 28 upvotes  │
│ ├─ r/learnprogramming: 12 posts, ...    │
│ └─ r/webdev: 10 posts, ...              │
│                                         │
│ Últimos 7 días (gráfico):               │
│ │     ▁ ▃ ▅ ▇ █ ▆ ▄                    │
│ └─────────────────────────────────────┘
```

### **Vista Settings**
```
┌─────────────────────────────────────────┐
│ Configuración                           │
├─────────────────────────────────────────┤
│ Web URL: https://tuproducto.com         │
│ Frecuencia: 2 posts/día                 │
│                                         │
│ Subreddits activos:                    │
│ ├─ ✅ r/python (agregar más)            │
│ ├─ ✅ r/webdev                          │
│ ├─ ✅ r/learnprogramming                │
│ └─ ➕ Agregar subreddit                 │
│                                         │
│ [Guardar cambios]                       │
└─────────────────────────────────────────┘
```

---

## 🛡️ Consideraciones de Seguridad

- **Ban Risk:** Solo redacción manual (tú revisas) = cero automatización pura
- **Rate Limiting:** Respeta límites de Reddit API (~60 requests/min)
- **Tokens:** Guardar encriptados en BD
- **User-Agent:** Identificarse como tu app, no como bot malicioso
- **Content Review:** Tú siempre das el OK final antes de publicar

---

## 📦 Stack Resumen

| Capa | Tech |
|------|------|
| **Frontend** | React 18 + Vite |
| **Backend** | Node.js + Express |
| **DB** | PostgreSQL |
| **IA** | Claude API (Anthropic) |
| **Reddit API** | PRAW (Python) o Reddit JS SDK |
| **Auth** | OAuth 2.0 (Reddit) |
| **Hosting** | Vercel (frontend) + Render/Railway (backend) |
| **Cron Jobs** | node-cron o similar |

---

## 🚀 MVP Roadmap (2-3 semanas)

### **Semana 1:**
- [ ] Setup inicial (repo, estructura, auth Reddit)
- [ ] DB schema + modelos
- [ ] Backend básico: rutas posts, subreddits, settings
- [ ] Frontend dashboard (UI estática)

### **Semana 2:**
- [ ] Integración Claude API (redacción)
- [ ] Integración Reddit API (monitoreo + publicación)
- [ ] Cron jobs funcionando
- [ ] Dashboard dinámico (conectado a backend)

### **Semana 3:**
- [ ] Polish + testing
- [ ] Stats/Analytics
- [ ] Deploy a producción
- [ ] Primera ronda de posts reales

---

## 🎨 Paleta de Colores (Propuesta)

```
Primary: #FF4500 (Reddit orange)
Secondary: #0079D3 (Reddit blue)
Background: #030303 (Dark)
Text: #FFFFFF
Success: #22C55E
Warning: #F59E0B
Error: #EF4444
```

---

## 📝 Notas Importantes

1. **Sin Full Automation:** Tú siempre revisas antes de publicar (evita bans)
2. **Natural Language:** IA redacta como humano, no como máquina
3. **Web Context:** Tu URL es el "identity" del bot (qué ofreces)
4. **Freemium Ready:** Estructura lista para monetizar después (límites de posts/día, subreddits, etc)

---

**¿Empezamos a codearlo?** 🔧
