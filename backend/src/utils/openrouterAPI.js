import { env } from '../config/env.js';
import { logger } from './logger.js';

const BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * OpenRouter-based text generation with a free model.
 * Same public API as the old claudeAPI.js: checkRelevance, draftReply,
 * analyzeSpamRisk, parseJsonLoose. All network calls happen here.
 */
async function call(messages, { maxTokens = 700, temperature = 0.7 } = {}) {
  if (!env.openRouterApiKey) throw new Error('OPENROUTER_API_KEY not configured');
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.appUrl,
      'X-Title': 'RedditAutoPost',
    },
    body: JSON.stringify({
      model: env.openRouterModel,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenRouter error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  return text.trim();
}

/**
 * 1) Relevance analysis — determine if a Reddit post is worth replying to.
 */
export async function checkRelevance({ title, body, subreddit, webUrl }) {
  const prompt = `Eres un asistente que encuentra oportunidades de aportar valor en Reddit para alguien que ofrece un servicio/web concreta.

WEB DEL USUARIO (contexto sobre qué ofrece): ${webUrl}

POST DE REDDIT:
- subreddit: r/${subreddit}
- título: ${title}
- contenido: ${body || '(sin contenido)'}

Determina si este post es RELEVANTE para alguien que ofrece lo de la web del usuario, es decir: ¿la persona que publicó (o lectores de ese hilo) se beneficiarían genuinamente de la solución/experiencia del usuario?

Responde EXACTAMENTE este JSON, sin nada más:
{"relevante": true|false, "razon": "una línea en español"}`;

  const raw = await call([{ role: 'user', content: prompt }], { temperature: 0.2, maxTokens: 200 });
  return parseJsonLoose(raw);
}

/**
 * 2) Draft a natural reply (value-first, subtle mention of the web + its open-source code).
 */
export async function draftReply({ post, webUrl, kind = 'respuesta' }) {
  const prompt = `Redacta una ${kind} natural a este post de Reddit:

POST ORIGINAL (r/${post.subreddit_name}):
- título: ${post.original_post_title}
- contenido: ${post.original_post_body || '(sin contenido)'}

CONTEXTO sobre quién eres y qué ofreces (de tu web): ${webUrl}
REPO PÚBLICO DE CÓDIGO del usuario (GitHub): ${env.githubUrl}

Requisitos:
- Proporciona valor REAL primero (consejos, insights, experiencia)
- Menciona la web del usuario de forma natural, como si recomendases algo que ya usas
- El usuario quiere que la gente conozca SU CÓDIGO: si queda natural, sugiere que el proyecto es open source y menciona el repo de GitHub (${env.githubUrl}) en una frase corta
- NO hagas pitch explícito ni parezcas vendedor
- Máximo 200 palabras
- Tono casual, auténtico, en el idioma del post (si el post está en español responde en español)
- NUNCA inventes datos, métricas o experiencias que no estén justificadas por el contexto

Redacta SOLO la respuesta final:`;

  return call([{ role: 'user', content: prompt }], { maxTokens: 500 });
}

/**
 * 3) Spam-risk analysis.
 */
export async function analyzeSpamRisk(content) {
  const prompt = `Analiza si este mensaje parece spam o escrito por un bot:

MENSAJE:
"${content}"

Responde EXACTAMENTE este JSON, sin nada más:
{"nivel": "bajo"|"medio"|"alto", "razon": "una línea", "sugerencia": "mejora propuesta si medio/alto, o null si bajo"}`;

  const raw = await call([{ role: 'user', content: prompt }], { temperature: 0.2, maxTokens: 200 });
  return parseJsonLoose(raw);
}

export function parseJsonLoose(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fallthrough */ }
    }
    logger.warn('Could not parse AI JSON output', { raw: raw.slice(0, 500) });
    return null;
  }
}