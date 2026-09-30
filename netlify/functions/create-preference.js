// Cria o pedido de pagamento no Mercado Pago (Pix + cartão).
// SEGURANÇA: preço, frete e total são calculados AQUI no servidor.
// O navegador só informa QUAL perfume e QUANTAS unidades — nunca o preço.
//
// Configuração necessária no Netlify (Site configuration > Environment variables):
//   MP_ACCESS_TOKEN = seu Access Token de PRODUÇÃO do Mercado Pago

// ===== TABELA OFICIAL DE PREÇOS (a que vale de verdade na cobrança) =====
// Ao mudar o preço, altere aqui E na linha "const PRECO" do index.html.
const PRECOS = { "100": 159.90 };
const FRETE = 25;
const FRETE_GRATIS_ACIMA = 400;

const CATALOGO = {
  "imagination": "Imagination",
  "vibrato": "Vibrato",
  "good-girl": "Good Girl",
  "prada-lhomme": "Prada L'Homme",
  "torino-21": "Torino 21",
  "creed-himalaya": "Himalaya",
  "renaissance": "Renaissance",
  "prada-amber": "Prada Amber Pour Homme",
  "naxos": "Naxos",
  "sauvage": "Sauvage",
  "phantom": "Phantom",
  "212-vip-black": "212 VIP Black",
  "coco-mademoiselle": "Coco Mademoiselle",
  "olympea": "Olympéa",
  "miss-dior": "Miss Dior",
  "alien": "Alien",
  "oud-maracuja": "Oud Maracujá",
  "one-million": "One Million",
  "libre": "Libre",
  "212-vip-rose": "212 VIP Rosé",
  "myslf": "MYSLF",
};

const brl = (v) => "R$ " + v.toFixed(2).replace(".", ",");
const resp = (statusCode, obj) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return resp(405, { error: "Método não permitido" });

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return resp(500, { error: "MP_ACCESS_TOKEN não configurado no Netlify." });

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return resp(400, { error: "Corpo da requisição inválido." }); }

  const { items, payer } = body;
  if (!Array.isArray(items) || items.length === 0) return resp(400, { error: "Carrinho vazio." });
  if (items.length > 30) return resp(400, { error: "Carrinho grande demais." });

  // monta os itens com preço vindo da tabela oficial
  const linhas = [];
  for (const it of items) {
    const slug = String(it.slug || "");
    const size = String(it.size || "");
    const qty = parseInt(it.quantity, 10);
    if (!CATALOGO[slug] || !PRECOS[size] || !(qty >= 1 && qty <= 50)) {
      return resp(400, { error: "Item inválido no carrinho. Atualize a página e tente novamente." });
    }
    linhas.push({
      slug, size, qty,
      unit: PRECOS[size],
      title: `Maison XIX ${CATALOGO[slug]} (${size} ml)`,
    });
  }

  const subtotal = linhas.reduce((s, l) => s + l.unit * l.qty, 0);
  const frete = subtotal >= FRETE_GRATIS_ACIMA ? 0 : FRETE;
  const total = subtotal + frete;

  // número do pedido — aparece no e-mail e no Mercado Pago ("referência externa")
  const agora = new Date();
  const pedido = "MX" + agora.toISOString().slice(2, 10).replace(/-/g, "") + "-" +
    Math.random().toString(36).slice(2, 6).toUpperCase();

  const p = payer || {};
  const clean = (v, n = 200) => String(v || "").trim().slice(0, n);
  const cliente = {
    nome: clean(p.name), email: clean(p.email), telefone: clean(p.phone, 30),
    cep: clean(p.cep, 12), cidade: clean(p.cidade, 100), endereco: clean(p.endereco),
  };

  const mpItems = linhas.map((l) => ({
    id: `${l.slug}-${l.size}`, title: l.title, quantity: l.qty,
    unit_price: l.unit, currency_id: "BRL",
  }));
  if (frete > 0) mpItems.push({ id: "FRETE", title: "Frete", quantity: 1, unit_price: frete, currency_id: "BRL" });

  const host = event.headers["x-forwarded-host"] || event.headers.host;
  const proto = event.headers["x-forwarded-proto"] || "https";
  const baseUrl = `${proto}://${host}`;

  const preference = {
    items: mpItems,
    external_reference: pedido,
    payer: {
      name: cliente.nome,
      email: cliente.email,
      phone: { number: cliente.telefone },
      address: { zip_code: cliente.cep, street_name: `${cliente.endereco} — ${cliente.cidade}` },
    },
    back_urls: {
      success: `${baseUrl}/?status=approved&pedido=${pedido}`,
      pending: `${baseUrl}/?status=pending&pedido=${pedido}`,
      failure: `${baseUrl}/?status=failure&pedido=${pedido}`,
    },
    auto_return: "approved",
    statement_descriptor: "MAISON XIX",
  };

  try {
    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(preference),
    });
    const data = await mpRes.json();
    if (!mpRes.ok) return resp(mpRes.status, { error: data.message || "Erro ao criar pagamento no Mercado Pago." });

    // resumo calculado no servidor — usado no e-mail do pedido
    return resp(200, {
      init_point: data.init_point,
      pedido,
      resumo: {
        itens: linhas.map((l) => `${l.qty}x ${l.title} — ${brl(l.unit * l.qty)}`).join("\n"),
        subtotal: brl(subtotal),
        frete: frete === 0 ? "Grátis" : brl(frete),
        total: brl(total),
      },
    });
  } catch {
    return resp(500, { error: "Falha ao conectar ao Mercado Pago." });
  }
};
