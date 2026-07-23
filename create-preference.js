// Cria uma "preference" (pedido de pagamento) no Mercado Pago e devolve o link
// de checkout (Pix + cartão). O Access Token fica só aqui no servidor, nunca
// no navegador do cliente — é o que mantém a integração segura.
//
// Configuração necessária no Netlify (Site settings > Environment variables):
//   MP_ACCESS_TOKEN = seu Access Token de PRODUÇÃO do Mercado Pago

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método não permitido" }) };
  }

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "MP_ACCESS_TOKEN não configurado no Netlify." })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Corpo da requisição inválido." }) };
  }

  const { items, payer, shipping } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "Carrinho vazio." }) };
  }

  // valida e sanitiza os itens (nunca confiar em preço vindo do cliente sem checar tipo/valor)
  const mpItems = items.map((it) => ({
    title: String(it.title || "Produto Maison XIX").slice(0, 250),
    quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
    unit_price: Number(it.unit_price) || 0,
    currency_id: "BRL",
  }));

  if (shipping && Number(shipping) > 0) {
    mpItems.push({
      title: "Frete",
      quantity: 1,
      unit_price: Number(shipping),
      currency_id: "BRL",
    });
  }

  // usa o próprio domínio onde o site está publicado para montar as URLs de retorno
  const host = event.headers["x-forwarded-host"] || event.headers.host;
  const proto = event.headers["x-forwarded-proto"] || "https";
  const baseUrl = `${proto}://${host}`;

  const preference = {
    items: mpItems,
    payer: payer
      ? {
          name: payer.name,
          email: payer.email,
          phone: { number: payer.phone },
          address: {
            zip_code: payer.cep,
            street_name: payer.endereco,
          },
        }
      : undefined,
    back_urls: {
      success: `${baseUrl}/?status=approved`,
      pending: `${baseUrl}/?status=pending`,
      failure: `${baseUrl}/?status=failure`,
    },
    auto_return: "approved",
    statement_descriptor: "MAISON XIX",
  };

  try {
    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(preference),
    });

    const data = await mpRes.json();

    if (!mpRes.ok) {
      return {
        statusCode: mpRes.status,
        body: JSON.stringify({ error: data.message || "Erro ao criar preferência no Mercado Pago." }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ init_point: data.init_point }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Falha ao conectar ao Mercado Pago." }) };
  }
};
