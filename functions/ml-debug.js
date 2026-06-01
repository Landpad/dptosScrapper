exports.handler = async (event) => {
  let token;
  try { ({ token } = JSON.parse(event.body || "{}")); } catch { return { statusCode: 400, body: "Invalid JSON" }; }

  const h = token ? { Authorization: `Bearer ${token}` } : {};

  const run = async (label, url, headers = {}) => {
    const r = await fetch(url, { headers });
    const b = await r.json().catch(() => ({}));
    return { label, status: r.status, total: b.paging?.total, msg: b.message, scope: b.scope };
  };

  const results = await Promise.all([
    run("users_me",              "https://api.mercadolibre.com/users/me", h),
    run("search_appid_only",     "https://api.mercadolibre.com/sites/MLA/search?q=notebook&limit=1&app_id=4268924083857847"),
    run("search_no_auth",        "https://api.mercadolibre.com/sites/MLA/search?q=notebook&limit=1"),
    run("search_bearer",         "https://api.mercadolibre.com/sites/MLA/search?q=notebook&limit=1", h),
    run("search_re_bearer",      "https://api.mercadolibre.com/sites/MLA/search?category=MLA1472&limit=1", h),
    run("token_info",            `https://api.mercadolibre.com/oauth/token/info?access_token=${token}`),
  ]);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(results, null, 2),
  };
};
