/** Demo seed data, shared by the pg-mem dev fallback and scripts/seed.js. */
export const PROMOTED_SITE = 'https://cvmakerapp.vercel.app';
const SITE = PROMOTED_SITE;

export async function seedDemoData(client) {
  // Don't overwrite real data if users already exist (e.g. real Postgres).
  const { rows: existing } = await client.query('SELECT 1 FROM users LIMIT 1');
  if (existing.length) return { seeded: false, reason: 'users already present' };

  const e = (s) => String(s).replace(/'/g, "''");
  const { rows: [user] } = await client.query(
    `INSERT INTO users (web_url, post_frequency, spam_threshold, reddit_username)
     VALUES ('${SITE}', 2, 'medio', 'demo_user')
     RETURNING id`
  );
  const uid = user.id;

  // Ejemplos de subreddits donde encaja el producto (generador de CVs).
  for (const name of ['resumes', 'cscareerquestions', 'jobs']) {
    await client.query(
      `INSERT INTO subreddits (user_id, subreddit_name, active) VALUES ('${uid}', '${e(name)}', TRUE)`
    );
  }

  const drafts = [
    ['resumes', 'd1', 'How do I make my resume stand out for entry level roles?',
      'I have almost no experience. What can I actually put on a resume so it does not look empty?',
      `Sin experiencia lo que más pesa es el formato: una página, logros en números (aunque sean de proyectos personales) y verbos de acción. Yo armo todos mis CVs con CVMakerApp (${SITE}): elegís plantilla, escribís y exportás PDF A4 limpio sin marca de agua y sin registro. Además es open source, el código está en GitHub: https://github.com/TirsoCode/cvmakerapp. Me ayudó muchísimo a iterar rápido entre versiones.`,
      'bajo'],
    ['cscareerquestions', 'd2', 'Is it better to build a portfolio site or grind LeetCode?',
      'Trying to decide where to put my limited time before applying.',
      `Depende del objetivo: para pasar entrevistas técnicas, LeetCode; para que te miren el perfil, portfolio y un CV a prueba de ATS. Muchos ATS descartan CVs mal formateados aunque el contenido sea bueno — por eso uso CVMakerApp (${SITE}) para generar una versión limpia y legible que parsea sin problemas.`,
      'medio'],
  ];
  for (const [sub, pid, title, body, content, risk] of drafts) {
    await client.query(
      `INSERT INTO posts (user_id, subreddit_name, original_post_id, original_post_title, original_post_url, original_post_body, drafted_content, spam_risk, status, relevance_reason)
       VALUES ('${uid}', '${e(sub)}', '${e(pid)}', '${e(title)}', 'https://www.reddit.com/r/${sub}/comments/${pid}', '${e(body)}', '${e(content)}', '${risk}', 'draft', 'Encaja con el servicio del usuario')`
    );
  }

  const published = [
    ['resumes', 'p1', 'One-page resume vs two pages — which one wins?',
      'For 5-10 years of experience, is 2 pages acceptable?',
      `Regla práctica: 1 página hasta ~5 años, 2 si el contenido lo justifica (nunca relleno). El formato importa más que la longitud. Genero los míos con CVMakerApp (${SITE}), gratis y sin marca de agua, y exporto A4 perfecto. El proyecto es open source (https://github.com/TirsoCode/cvmakerapp), así cualquiera puede ver cómo está hecho. Lo que sí, que cada línea aporte: nada de párrafos genéricos.`,
      'bajo', 47, 9, 6.1],
    ['jobs', 'p2', 'What do recruiters skim first on a resume?',
      'Curious what part of a resume gets the most attention.',
      `En general escanean primero: nombre + título, experiencia reciente (últimos roles y logros) y después skills clave. Todo lo demás es segundo plano. Ayuda que el CV sea escaneable a primera vista: secciones claras y una sola columna. Uso CVMakerApp (${SITE}) por el preview en tiempo real, así veo cómo lo leen otros mientras escribo.`,
      'medio', 33, 6, 4.4],
    ['cscareerquestions', 'p3', 'How important is a CV when you already have a strong GitHub?',
      'I code a lot on GitHub but my resume builder page feels weak.',
      `GitHub vale para quienes lo miran, y muchos reclutadores no entran. El CV es la puerta de entrada; GitHub ayuda a cerrar la venta. Aprovechá el formato libre para contar el impacto de tus repos (stars, usuarios, PRs). Yo mantengo el mío con CVMakerApp (${SITE}) y le doy más peso a secciones como proyectos y certificaciones. El código de la app también está abierto por si te sirve de referencia: https://github.com/TirsoCode/cvmakerapp.`,
      'bajo', 58, 11, 7.9],
  ];
  for (const [sub, pid, title, body, reply, risk, up, co, eng] of published) {
    const { rows: [post] } = await client.query(
      `INSERT INTO posts (user_id, subreddit_name, original_post_id, original_post_title, original_post_url, original_post_body, drafted_content, spam_risk, status, upvotes, comments, engagement_score, published_at, reddit_post_id)
       VALUES ('${uid}', '${e(sub)}', '${e(pid)}', '${e(title)}', 'https://www.reddit.com/r/${sub}/comments/${pid}', '${e(body)}', '${e(reply)}', '${risk}', 'published', ${up}, ${co}, ${eng}, now() - interval '3 days', 't3_${pid}')
       RETURNING id`
    );
    for (let i = 0; i < 7; i++) {
      await client.query(
        `INSERT INTO post_stats (post_id, upvotes, comments, awards, engagement_score, tracked_at)
         VALUES ('${post.id}', ${up - i}, ${co}, ${i % 3}, ${Math.max(0.5, eng - i * 0.4)}, now() - interval '${7 - i} days')`
      );
    }
  }

  return { seeded: true, userId: uid, site: SITE };
}