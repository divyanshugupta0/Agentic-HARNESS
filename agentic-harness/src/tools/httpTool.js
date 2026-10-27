// HTTP request tool
async function httpGet(url) {
  const res = await fetch(url);
  return res.json();
}

async function httpPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

module.exports = { httpGet, httpPost };
