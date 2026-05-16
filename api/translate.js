const { translateToEnglish } = require('../lib/translate');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vercel auto-parses JSON body, but stringified bodies need a fallback
    const body =
      typeof req.body === 'object' && req.body !== null
        ? req.body
        : JSON.parse(req.body || '{}');

    const text = body.text;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text (string) is required' });
    }

    const result = await translateToEnglish(text);
    res.status(200).json(result);
  } catch (err) {
    console.error('translate error:', err);
    res.status(500).json({ error: String(err.message || err) });
  }
};
