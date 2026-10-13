# Price Scraper

Backend organizado em Arquitetura em Camadas Modular (Feature-Driven).

## Backend

Cada módulo de negócio fica isolado em `backend/src/modules/<modulo>` e separa as responsabilidades que utiliza:

- `*.schema.ts`: tabela e tipos Drizzle;
- `*.zod.ts`: contratos e validações;
- `*.routes.ts`: rotas HTTP;
- `*.controller.ts`: entrada e saída HTTP;
- `*.service.ts`: regras de negócio;
- `*.repository.ts`: persistência e queries.

Fluxo: `routes → controller → service → repository`. Controller valida a entrada e formata a resposta; service aplica regras; repository isola a persistência. Módulos sem banco, como interpretação por LLM, não precisam criar `schema` ou `repository` artificiais.

## Frontend

O frontend segue a mesma organização por funcionalidade em `frontend/src/features`:

- `search`: busca, comparação e detalhes de ofertas;
- `favorites`: lista e ações dos favoritos;
- `auth`: login, cadastro e conta;
- `navigation`: sidebar e definição das abas.

Cada `*.api.ts` concentra chamadas HTTP da funcionalidade. `shared/api.ts` trata o envelope comum da API e `App.tsx` compõe as telas e coordena o estado. Componentes de apresentação não chamam `fetch` diretamente. Dashboard e favoritos usam somente dados retornados pela API; não há ofertas simuladas.

## Como executar

```bash
docker compose up -d
cd backend
copy .env.example .env
npm install
npm run db:push
npm run dev
```

O `docker compose` tambem inicia o Ollama e baixa o modelo `llama3.2:3b` na
primeira execucao. O backend usa a URL `http://localhost:11434` por padrao.

Health check: `GET http://localhost:3333/health`

Exemplo: `POST http://localhost:3333/api/items` com `{ "code": "SKU-001", "name": "Produto" }`.

### Interpretacao de busca com IA

`POST http://localhost:3333/api/llm/interpret-search`

```json
{
  "prompt": "Quero um celular de ate R$ 2.000, com bastante memoria e bom para jogos"
}
```

A IA retorna filtros estruturados. A busca em marketplaces e a comparacao de
ofertas continuam sendo responsabilidade do backend.

### Callback OAuth via Cloudflare Tunnel

1. Copie `.env.example` para `.env` na raiz do projeto.
2. Defina `CLOUDFLARE_TUNNEL_TOKEN` com um token novo, gerado no Cloudflare.
3. Inicie o tunel com `docker compose --profile tunnel up -d cloudflared`.

Use a URL HTTPS configurada no Cloudflare como URI de redirect do Mercado Livre.

### Segredos de integracao

Credenciais do Mercado Livre ficam somente em `backend/.env`, que e ignorado pelo
Git. Nunca inclua tokens, client secrets ou cookies em arquivos versionados, logs
ou mensagens. O backend mascara campos sensiveis antes de registrar erros.

O fluxo OAuth usa Authorization Code com PKCE. Gere uma chave local de 32 bytes
em Base64 para `MELI_TOKEN_ENCRYPTION_KEY`; essa chave nao deve ser compartilhada
nem versionada. Access tokens e refresh tokens sao cifrados com AES-256-GCM antes
de serem gravados no PostgreSQL.
## Executar com Docker

Preencha as credenciais apenas em `backend/.env` e o token do Cloudflare apenas no `.env` da raiz. Esses arquivos nao entram nas imagens Docker.

```powershell
docker compose --profile tunnel up -d --build
```

- Aplicacao local: `http://localhost:8081`
- Healthcheck: `http://localhost:8081/health`
- O tunnel Cloudflare deve apontar para `http://frontend:80` (comunicacao interna entre containers).
