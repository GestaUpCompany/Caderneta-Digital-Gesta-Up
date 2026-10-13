# GITHUB.md — Mapa de repositórios, branches e pushes

Referência para saber para onde cada push vai. Conferido em 08/10/2026 (PWA) e atualizado em 13/10/2026 (Painel) com `git remote -v` e `git ls-remote`.

## Resumo: qual comando para quê

"Staging" aparece com três sentidos: a **branch local** `staging` (que acompanha `origin/staging`), o **repositório** `VictorHSM24/Manejus-PWA-Staging` e a branch **`main`** dentro dele. Use esta tabela e não improvise.

| Quero... | Repo | Comando |
|---|---|---|
| Guardar o trabalho (fluxo normal do usuário) | PWA e Painel | `git push origin staging` |
| Publicar o **app staging do PWA** | PWA | `git push staging-repo staging:main` (é o único push que dispara o deploy de staging) |
| Guardar **e** publicar o staging do PWA de uma vez | PWA | `git push-stg` (alias local, ver abaixo) |
| Publicar em produção (só se o usuário pedir) | PWA e Painel | `git checkout master`, `git merge staging`, `git push origin master` |

`git push origin staging` é o fluxo normal do usuário nos dois repos (a branch existe em `origin` desde 10/10/2026) e **não** dispara nenhum deploy por si só. O app staging do PWA só atualiza com push em `staging-repo` (`main`), pelo workflow `deploy-staging.yml`. Antes de pushar, confirme o repo com `git remote -v`.

## Contas e repositórios

| Conta | Repositório | Papel |
|---|---|---|
| `GestaUpCompany` | `Caderneta-Digital-Gesta-Up` | **PWA de produção**. `master` publica no GitHub Pages. |
| `GestaUpCompany` | `manejus` | **Painel Web** (código local em `C:\Users\USER\Documents\GestaUp-Cadernetas-Gestao`). |
| `VictorHSM24` | `Manejus-PWA-Staging` | **PWA de staging**. Só existe para disparar o Actions e testar no app staging. |

## PWA (`C:\Users\USER\Documents\Caderneta-Digital-Gesta-Up`)

Remotes:

- `origin` → `GestaUpCompany/Caderneta-Digital-Gesta-Up` (produção)
- `staging-repo` → `VictorHSM24/Manejus-PWA-Staging` (staging)

Branch local `staging`: acompanha `origin/staging` (`branch.staging.remote = origin`, `merge = refs/heads/staging`, conferido em 13/10/2026), então um `git push` simples vai para `origin/staging`. No repo de staging (`staging-repo`) a branch que vale é **`main`**; por isso o push de staging precisa de refspec explícito (abaixo).

### Subir para testar no app staging

```
git push staging-repo staging:main
```

- Dispara `.github/workflows/deploy-staging.yml` (`on: push` em `main`, só roda se `github.repository == 'VictorHSM24/Manejus-PWA-Staging'`).
- Faz build com `VITE_BASE_PATH=/Manejus-PWA-Staging/`, `VITE_APP_NAME=Gesta'Up STAGING` e publica no GitHub Pages desse repo.
- `staging-repo` também tem uma branch `staging` (parada em `1f55059`). Não dispara nada, ignorar.
- Nenhum workflow deste repo reage a push em `origin/staging`. Se o app staging atualizar sem push em `staging-repo`, há um mecanismo fora do repo (webhook, espelhamento) que não está documentado aqui.

Atalho: `git push-stg` (alias no `.git/config` local, só nesta máquina; não vai para o GitHub). Equivale a `git push origin staging && git push staging-repo staging:main`. Para recriar o alias:

```
git config alias.push-stg '!git push origin staging && git push staging-repo staging:main'
```

### Subir para produção

Só quando o usuário pedir explicitamente.

- `.github/workflows/deploy.yml` roda em push e em PR para `master`, e só publica se `github.repository == 'GestaUpCompany/Caderneta-Digital-Gesta-Up'`.
- Fluxo: feature/`staging` testada no staging → merge em `master` → `git push origin master`. O deploy é automático.
- Branches de feature (`feat/*`, `fix/*`) vão para `origin` e entram em `master` por PR/merge.

### Conferir a versão publicada

Cada deploy publica `version.json` (`{versao, build, env}`): `https://victorhsm24.github.io/Manejus-PWA-Staging/version.json` (staging) e `https://gestaupcompany.github.io/Caderneta-Digital-Gesta-Up/version.json` (produção). O build tem o formato `AAAA.MM.DD-<commit>` e aparece no app em Configurações > Sobre o app e no rodapé da Home.

### O que NÃO fazer

- Não esperar que `git push origin staging` atualize o app staging: ele só guarda o trabalho na conta da empresa. Para publicar o staging, usar `git push staging-repo staging:main`.
- Sempre explicitar remote e refspec no push (`git push origin staging`, `git push staging-repo staging:main`); não usar `git push` sem argumentos.
- Não commitar em `master` direto: mesclar a `staging` (`git checkout master`, `git merge staging`, `git push origin master`).

## Painel Web (`C:\Users\USER\Documents\GestaUp-Cadernetas-Gestao`)

Remote:

- `origin` → `GestaUpCompany/manejus`

Não há remote para a conta `VictorHSM24` e **não há `.github/workflows`** neste repo (conferido em 08/10/2026). Ou seja:

- Não existe app staging do Painel pelo Actions e **não existe `staging-repo`**. O comando do PWA (`git push staging-repo staging:main`) não se aplica aqui.
- A branch `staging` do Painel **existe em `origin`** (conferido em 13/10/2026) e é a branch de trabalho, com upstream `origin/staging`: `git push origin staging` é o push normal e vai para a conta da empresa. (Em 08/10 ela ainda não existia no remoto; este documento dizia isso e ficou desatualizado.)
- Fluxo: trabalhar na `staging` (ou em branch de feature), commitar e pushar para `origin`. A `master` recebe por merge da `staging` (`git merge staging` na `master`, depois `git push origin master`). O deploy do Painel é pela Vercel (ver o `CLAUDE.md` do Painel); a branch que dispara a produção não está documentada aqui, confirme no projeto da Vercel.
- Por ser produção, só mesclar na `master` e pushar quando o usuário pedir.
- Migrations estruturais do banco vivem aqui: `supabase/migrations/` + `supabase db push` (ver `AGENTS.md`). Commitar e pushar o arquivo.
- Antes de qualquer push no Painel, perguntar ao usuário a branch de destino se não estiver explícita.

## Checklist antes de qualquer push

1. `git remote -v` e `git branch -vv` para confirmar o repo e o upstream.
2. Teste em staging (PWA): `git push staging-repo staging:main`, depois conferir a aba Actions de `VictorHSM24/Manejus-PWA-Staging`.
3. Conferir o resultado: `git ls-remote --heads <remote>`.
4. Commit com `-m "..."` em linha única (sem heredoc). Push só quando o usuário pedir, e a permissão `Bash(git push:*)` precisa estar liberada em `.claude/settings.local.json`.
5. Para desfazer branch criada por engano: `git push origin --delete <branch>` (confirmar antes).
