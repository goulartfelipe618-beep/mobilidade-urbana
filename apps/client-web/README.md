# Transporte.PRO Passageiro

PWA web do passageiro.

## Rodar

```bash
cd apps/client-web
npm install
npm run dev
```

Porta **5173** com proxy `/api` para `http://localhost:3000`.

## Fluxo

- Login/cadastro como PASSAGEIRO
- Origem/destino e categorias do `guia.txt`
- Cotacao com `/api/v1/pricing/quote`
- Criacao de corrida com `/api/v1/rides`
- Acompanhamento por polling da corrida ativa
