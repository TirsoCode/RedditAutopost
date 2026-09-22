const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const level = LEVELS[process.env.LOG_LEVEL || 'info'] ?? LEVELS.info;

function write(lvl, msg, meta) {
  if (LEVELS[lvl] < level) return;
  const line = meta === undefined
    ? `[${new Date().toISOString()}] ${lvl.toUpperCase()} ${msg}`
    : `[${new Date().toISOString()}] ${lvl.toUpperCase()} ${msg} ${JSON.stringify(meta)}`;
  (lvl === 'error' ? console.error : console.log)(line);
}

export const logger = {
  debug: (msg, meta) => write('debug', msg, meta),
  info: (msg, meta) => write('info', msg, meta),
  warn: (msg, meta) => write('warn', msg, meta),
  error: (msg, meta) => write('error', msg, meta),
};