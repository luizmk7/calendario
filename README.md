# Cauan · Calendário de postagens

Painel simples para planejar e acompanhar publicações de várias empresas. Versão independente em **Next.js + Supabase**, preparada para importar na Vercel.

## O que está pronto

- Calendário mensal e semanal, com horários de Brasília.
- Empresas editáveis: adicionar, renomear, escolher cor e remover.
- Postagens de Feed, Stories e Reels: criar, editar, mover de data e excluir.
- Upload e troca de imagens (JPG, PNG, WebP ou GIF, até 3 MB).
- Marcação “Já publiquei” e filtro de publicadas ou pendentes.
- Login por e-mail e senha usando Supabase Auth.
- Dados e imagens privados, separados por usuário com Row Level Security.
- Planejamento da Vianzo para outubro de 2026: 10 Feed e 79 Stories. Duas empresas adicionais começam vazias e podem ser renomeadas. Os dados iniciais são criados somente no primeiro acesso de cada conta.

Esta versão não depende da hospedagem Sites, de Cloudflare D1 ou de R2. O painel já publicado anteriormente continua funcionando na hospedagem original. Alterações e imagens que você adicionou naquele painel não são copiadas automaticamente para este novo banco.

## 1. Preparar o Supabase

1. Use um projeto **ativo** em [supabase.com/dashboard](https://supabase.com/dashboard). Se estiver pausado, restaure o projeto antes de continuar. Você também pode criar um projeto exclusivo para este painel.
2. Abra **SQL Editor**, cole todo o conteúdo de [`supabase/setup.sql`](supabase/setup.sql) e execute. Isso cria as tabelas, a função de inicialização, as regras de acesso e o bucket privado `calendar-images`.
3. Em **Authentication → Users → Add user**, crie seu usuário com e-mail e senha e marque o e-mail como confirmado. O painel não oferece cadastro aberto. Se não quiser aceitar novos cadastros pela API, desative “Allow new users to sign up” nas configurações do Supabase Auth.
4. Em **Connect** ou **Settings → API Keys**, copie a URL do projeto e a chave **Publishable** (`sb_publishable_...`). Não use a chave `secret` ou `service_role` nas variáveis públicas.

As tabelas deste projeto usam o prefixo `calendar_` para evitar conflito com outras aplicações. A função `initialize_calendar` executa com as permissões da conta autenticada. A configuração pode ser executada novamente sem apagar calendários existentes; mudanças futuras de estrutura devem ser feitas por novas migrações.

## 2. Publicar na Vercel

1. Abra [vercel.com/new](https://vercel.com/new) e importe **luizmk7/calendario**.
2. Mantenha **Framework: Next.js**, **Root Directory: raiz do repositório**, **Install Command: npm ci** e **Build Command: npm run build**. O arquivo `vercel.json` já define esses comandos.
3. Adicione estas duas variáveis, com os valores do seu Supabase:

| Variável | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave Publishable do projeto |

4. Clique em **Deploy**. Use Node.js 22 ou superior.
5. Abra o endereço publicado e entre com o usuário criado no Supabase.

Se você alterar variáveis `NEXT_PUBLIC_` depois de publicar, faça **Redeploy**: esses valores entram no build do frontend. Não é necessário informar uma chave administrativa do Supabase.

O build funciona sem credenciais, mas a aplicação mostra uma orientação de configuração até as variáveis serem definidas. As funções de calendário precisam do Supabase ativo e do SQL executado.

## Desenvolvimento local

```bash
npm ci
cp .env.example .env.local
# Preencha .env.local com a URL e a chave Publishable.
npm run dev
```

Abra http://localhost:3000. Para conferir o projeto:

```bash
npm run typecheck
npm run build
```

O limite de imagens foi ajustado para 3 MB para caber nos limites de requisição das funções da Vercel, incluindo o formulário de upload.

## Organização

- `app/page.tsx`: login e controle da sessão.
- `app/workspace.tsx`: calendário, empresas e edição de postagens.
- `app/api/data`: leitura e escrita com autenticação e validação.
- `app/api/images`: upload e leitura privada de imagens.
- `lib/supabase`: clientes de navegador e servidor.
- `supabase/setup.sql`: estrutura, políticas, Storage e planejamento inicial.

Não há publicação automática no Instagram: o painel organiza o trabalho e registra o que você publicou manualmente.

## Referências

- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Next.js na Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
