exports.handler = async (event) => {
  let token;
  try { ({ token } = JSON.parse(event.body || "{}")); } catch { return { statusCode: 400, body: "Invalid JSON" }; }
  if (!token) return { statusCode: 400, body: "Missing token" };

  const [meRes, searchRes] = await Promise.all([
    fetch("https://api.mercadolibre.com/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch("https://api.mercadolibre.com/sites/MLA/search?category=MLA1472&limit=1", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  const [meBody, searchBody] = await Promise.all([meRes.text(), searchRes.text()]);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      me:     { status: meRes.status,     body: JSON.parse(meBody) },
      search: { status: searchRes.status, body: JSON.parse(searchBody) },
    }, null, 2),
  };
};
