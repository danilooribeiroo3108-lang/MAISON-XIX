# Maison XIX — como publicar o site com pagamento funcionando

O site agora tem: clique no perfume → detalhes/notas → adicionar ao carrinho →
carrinho → checkout → pagamento real via **Mercado Pago** (Pix e cartão),
tudo iniciado a partir do próprio site.

Por segurança, quem cria a cobrança é uma pequena função no servidor (o
arquivo `netlify/functions/create-preference.js`), não o navegador do
cliente — é assim que sua chave secreta do Mercado Pago fica protegida.
Por isso o site precisa ser hospedado em algo como o **Netlify**, que roda
essa função grátis.

## Passo 1 — Pegue suas credenciais do Mercado Pago

1. Entre em https://www.mercadopago.com.br/developers/panel
2. Vá em **"Suas integrações" → crie uma aplicação** (se ainda não tiver).
3. Copie o **Access Token de produção** (não é o de teste). Guarde com
   cuidado — é uma senha, não coloque em nenhum chat ou lugar público.

## Passo 2 — Publique o site no Netlify (grátis)

**Opção recomendada (mais confiável): GitHub + Netlify**

1. Crie uma conta grátis em https://github.com (se não tiver).
2. Crie um repositório novo (botão verde "New").
3. Clique em "uploading an existing file" e arraste **todos** os arquivos
   e pastas desta entrega (`index.html`, `netlify.toml`, a pasta
   `netlify/` inteira) — mantenha a estrutura de pastas.
4. Crie uma conta grátis em https://app.netlify.com
5. Clique em **"Add new site" → "Import an existing project"** e conecte
   com o GitHub, escolhendo o repositório que você criou.
6. Deixe as configurações padrão e clique em **Deploy**.

**Opção rápida (se preferir testar sem GitHub):**
Acesse https://app.netlify.com/drop e arraste a pasta inteira do site.
Se a função de pagamento não funcionar por esse caminho, use a opção com
GitHub acima (é o método oficialmente suportado para funções).

## Passo 3 — Configure sua chave secreta no Netlify

1. No painel do site no Netlify, vá em **Site configuration → Environment
   variables**.
2. Clique em **Add a variable**:
   - Key: `MP_ACCESS_TOKEN`
   - Value: (cole o Access Token de produção do Passo 1)
3. Salve e vá em **Deploys → Trigger deploy → Deploy site** para o Netlify
   aplicar a nova variável.

Pronto — o link que o Netlify te dá (algo como
`https://maison-xix.netlify.app`) já é o site funcionando, com pagamento
de verdade. Depois, se quiser, dá pra apontar um domínio próprio
(ex: maisonxix.com.br) nas configurações de domínio do Netlify.

## O que já funciona

- Clicar num perfume abre notas, história e opções de tamanho/preço.
- Carrinho persistente (o cliente pode fechar o navegador e o carrinho
  continua lá).
- Checkout com nome, e-mail, telefone e endereço.
- Frete fixo de R$ 25, grátis acima de R$ 400 (ajustável no `index.html`,
  procure por `FRETE` e `FRETE_GRATIS_ACIMA` dentro do `<script>`).
- Pagamento via Pix ou cartão parcelado, processado pelo Mercado Pago.
- Depois do pagamento, o cliente volta pro site e vê uma mensagem de
  "aprovado", "pendente" ou "não concluído".

## O que vale saber (limitações honestas)

- **Frete é fixo**, não calcula por CEP de verdade. Calcular frete real
  por CEP exige integrar com Correios ou uma transportadora (ex: Melhor
  Envio) — posso te ajudar a adicionar isso depois, se quiser.
- **Estoque não é controlado automaticamente** — o site sempre permite
  comprar qualquer quantidade. Se quiser controlar estoque, também dá
  pra adicionar depois (precisa de um banco de dados simples).
- Você recebe o **pedido dentro do próprio painel do Mercado Pago**
  (aba "Vendas"/"Cobranças"). Se quiser também receber um e-mail ou
  notificação a cada venda, dá pra configurar um webhook — posso montar
  isso também quando quiser.
