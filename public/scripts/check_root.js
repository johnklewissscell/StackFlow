const url = 'http://localhost:3000/';

(async () => {
  try {
    const r = await fetch(url, { method: 'GET' });
    console.log('status', r.status);
    const text = await r.text();
    console.log('\nbody preview (first 800 chars):\n');
    console.log(text.slice(0, 800));
  } catch (e) {
    console.error('request error', e && e.message ? e.message : e);
    process.exit(2);
  }
})();

