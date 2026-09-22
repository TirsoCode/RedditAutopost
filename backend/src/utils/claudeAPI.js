import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const client = env.anthropicApiKey ? new Anthropic({ apiKey: env.anthropicApiKey }) : null;

const MODEL = 'claude-sonnet-4-5';

async function call(messages, { maxTokens = 700, temperature = 0.7 } = {}) {
  if (!client) throw new Error('ANTHROPIC_API_KEY not configured');
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature,
    messages,
  });
  return res.content.map((b) => b.text || '').join('').trim();
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

  const raw = await call([{ role: 'user', content: prompt }], { temperature: 0.2 });
  return parseJsonLoose(raw);
}

/**
 * 2) Draft a natural reply (value-first, subtle mention).
 */
export async function draftReply({ post, webUrl, kind = 'respuesta' }) {
  const prompt = `Redacta una ${kind} natural a este post de Reddit:

POST ORIGINAL (r/${post.subreddit_name}):
- título: ${post.original_post_title}
- contenido: ${post.original_post_body || '(sin contenido)'}

CONTEXTO sobre quién eres y qué ofreces (de tu web): ${webUrl}

Requisitos:
- Proporciona valor REAL primero (consejos, insights, experiencia)
- Menciona la solución del usuario de forma natural, como si recomendases algo que ya usas
- NO hagas pitch explícito ni parezcas vendedor
- Máximo 200 palabras
- Tono casual, auténtico, en el idioma del post (si el post está en español responde en español)
- Si encaja de forma natural, sugiere la web al final: "Yo uso ${webUrl} para esto y me funciona"
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

  const raw = await call([{ role: 'user', content: prompt }], { temperature: 0.2 });
  return parseJsonLoose(raw);
}

function parseJsonLoose(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fallthrough */ }
    }
    logger.warn('Could not parse AI JSON output', { raw });
    return null;
  }
}