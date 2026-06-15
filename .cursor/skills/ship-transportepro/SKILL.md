---
name: ship-transportepro
description: >-
  Finaliza entrega no Transporte.PRO: verifica arquivos no disco, aplica migrations
  PostgreSQL (infra/postgres), commit Git e push/PR no GitHub. Use quando o usuário
  pedir commit, subir pro GitHub, atualizar banco, publicar, deploy ou "ship".
disable-model-invocation: true
---

# Ship — Transporte.PRO (DB + commit + GitHub)

Fluxo obrigatório, nesta ordem. **Não pule etapas.**

Repositório oficial: `goulartfelipe618-beep/mobilidade-urbana`.
Remote esperado: `origin https://github.com/goulartfelipe618-beep/mobilidade-urbana.git`.

## 0. Verificar persistência (sempre)

Antes de commitar, confirmar que o código existe no disco:

```powershell
git status --short
dir services\core-node\src\modules\*\*.ts
dir apps\*\src\pages
node scripts\verify-persistence.cjs
```

Se pastas existirem mas arquivos `.ts`/`.tsx` estiverem vazios → **parar** e recriar/salvar antes de continuar.
Nunca considerar a entrega pronta sem confirmar com `Test-Path`, `dir`, `git status --short` e `node scripts\verify-persistence.cjs`.
Nunca commitar deleções inesperadas (`D`) sem confirmação explícita do usuário.

## 1. Banco de dados

Migrations em `infra/postgres/*.sql` (ordem numérica). Aplicar só pendentes:

```powershell
$env:PG_DSN = "<sua-connection-string>"   # nunca commitar .env
node scripts/db-check.js list               # opcional: conferir tabelas
node scripts/db-check.js migrate            # aplica SQL novos
```

Regras:

- **Nova migration** → arquivo `00N_descricao.sql` em `infra/postgres/`, idempotente quando possível (`IF NOT EXISTS`).
- **Nunca** commitar `.env`, senhas ou DSN.
- Se migration falhar → corrigir SQL, **não** commitar código que depende dela.

## 2. Build rápido (se tocou backend/frontend)

```powershell
cd services/core-node; npm run build
cd apps/client-web; npm run build     # se existir e foi alterado
cd apps/driver-web; npm run build    # se existir e foi alterado
cd apps/admin-web; npm run build     # se existir e foi alterado
```

## 3. Commit Git

**Só commitar quando o usuário pedir explicitamente.**

Paralelo:

```powershell
git status --short
git diff
git log -3 --oneline
```

Incluir no commit:

- Código fonte (`services/`, `apps/`, `infra/postgres/`, `scripts/`)
- **Não** incluir: `node_modules/`, `dist/`, `.vite/`, `*.tsbuildinfo`, `.env`, secrets

Mensagem: 1–2 frases, foco no **porquê**. Ex.: `feat(drivers): painel motorista com ofertas e lifecycle de corrida`

PowerShell (commit):

```powershell
git add <paths-relevantes>
git commit -m "mensagem aqui"
git status
```

Proibido: `git config`, `--force`, `--no-verify`, amend sem critério, push em main sem aviso.

## 4. GitHub (push + PR)

Neste projeto, depois do commit, atualizar sempre o repositório oficial, salvo se o usuário pedir para não enviar:

```powershell
git push -u origin HEAD
```

Antes do push, confirmar que `git remote -v` aponta para `goulartfelipe618-beep/mobilidade-urbana`.

PR (se pedido), após push:

```powershell
gh pr create --title "titulo" --body "## Summary`n- ...`n`n## Test plan`n- [ ] migrate ok`n- [ ] build ok"
```

## Checklist final

- [ ] Arquivos existem no disco (não só pastas vazias)
- [ ] `node scripts\verify-persistence.cjs` ok
- [ ] `db-check.js migrate` ok (se houve SQL novo)
- [ ] Build ok (se aplicável)
- [ ] Commit feito com paths corretos
- [ ] Push feito para `goulartfelipe618-beep/mobilidade-urbana`
- [ ] Usuário informado: hash do commit, branch, URL do PR (se houver)
