# GITHUB.md — Mapa de repositórios, branches e pushes

Referência para saber para onde cada push vai. Conferido em 08/10/2026 com `git remote -v`, `git ls-remote` e os workflows.

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

Branch local `staging`: acompanha `staging-repo/main` (`branch.staging.remote = staging-repo`, `merge = refs/heads/main`). O nome local é `staging`, mas no repo de staging a branch que vale é **`main`**.

### Subir para testar no app staging

```
git push staging-repo staging:main
```

- Dispara `.github/workflows/deploy-staging.yml` (`on: push` em `main`, só roda se `github.repository == 'VictorHSM24/Manejus-PWA-Staging'`).
- Faz build com `VITE_BASE_PATH=/Manejus-PWA-Staging/`, `VITE_APP_NAME=Gesta'Up STAGING` e publica no GitHub Pages desse repo.
- `staging-repo` também tem uma branch `staging` (parada em `1f55059`). Não dispara nada, ignorar.

### Subir para produção

Só quando o usuário pedir explicitamente.

- `.github/workflows/deploy.yml` roda em push e em PR para `master`, e só publica se `github.repository == 'GestaUpCompany/Caderneta-Digital-Gesta-Up'`.
- Fluxo: feature/`staging` testada no staging → merge em `master` → `git push origin master`. O deploy é automático.
- Branches de feature (`feat/*`, `fix/*`) vão para `origin` e entram em `master` por PR/merge.

### Conferir a versão publicada

Cada deploy publica `version.json` (`{versao, build, env}`): `https://victorhsm24.github.io/Manejus-PWA-Staging/version.json` (staging) e `https://gestaupcompany.github.io/Caderneta-Digital-Gesta-Up/version.json` (produção). O build tem o formato `AAAA.MM.DD-<commit>` e aparece no app em Configurações > Sobre o app e no rodapé da Home.

### O que NÃO fazer

- **Nunca** `git push origin staging`. Cria a branch `staging` na conta da empresa e pede PR, e não dispara o staging. (Aconteceu em 08/10/2026; a branch foi apagada com `git push origin --delete staging`.)
- Nunca usar `git push` sem remote/refspec explícitos estando na `staging`: o upstream já aponta para `staging-repo/main`, mas explicitar evita erro.
- Não commitar em `master` direto.

## Painel Web (`C:\Users\USER\Documents\GestaUp-Cadernetas-Gestao`)

Remote:

- `origin` → `GestaUpCompany/manejus`

Não há remote para a conta `VictorHSM24` e **não há `.github/workflows`** neste repo (conferido). Ou seja:

- Não existe app staging do Painel pelo Actions.
- A branch local `staging` do Painel tem upstream `origin/staging`, mas essa branch **não existe no remoto** (nem aparece em `git branch -a`). Um `git push` nela criaria `staging` na conta da empresa.
- Para o Painel, o fluxo é: trabalhar em branch de feature, commitar e pushar para `origin` (`git push origin <branch>`), e `master` recebe por merge.
- Migrations estruturais do banco vivem aqui: `supabase/migrations/` + `supabase db push` (ver `AGENTS.md`). Commitar e pushar o arquivo.
- Antes de qualquer push no Painel, perguntar ao usuário a branch de destino se não estiver explícita.

## Checklist antes de qualquer push

1. `git remote -v` e `git branch -vv` para confirmar o repo e o upstream.
2. Teste em staging (PWA): `git push staging-repo staging:main`, depois conferir a aba Actions de `VictorHSM24/Manejus-PWA-Staging`.
3. Conferir o resultado: `git ls-remote --heads <remote>`.
4. Commit com `-m "..."` em linha única (sem heredoc). Push só quando o usuário pedir, e a permissão `Bash(git push:*)` precisa estar liberada em `.claude/settings.local.json`.
5. Para desfazer branch criada por engano: `git push origin --delete <branch>` (confirmar antes).
