# Ativar os painéis de clientes

Projeto existente: `utkmkkmlvdanojnunmft` (`https://utkmkkmlvdanojnunmft.supabase.co`).

## 1. Atualizar o banco existente

No [SQL Editor do projeto](https://supabase.com/dashboard/project/utkmkkmlvdanojnunmft/sql/new), execute o conteúdo de `supabase/migrations/20261011_client_portal.sql` inteiro.

**Não execute novamente `setup.sql` em um banco que já recebeu a migração.** Ele é a estrutura antiga para instalação inicial. A migração deve ser sempre a última etapa. Em uma instalação do zero: execute `setup.sql`, inicialize a conta gestora uma vez e só então execute a migração.

A migração é transacional e pode ser repetida. Preserva empresas, postagens, notas antigas e caminhos de imagens. Cada postagem existente começa com quantidade 1; as já publicadas continuam publicadas. Contas que já tinham um espaço inicializado continuam gestoras. Novas contas não criam calendários automaticamente.

O código reconhece a falta da nova tabela e mantém o calendário anterior disponível até aplicar a migração. Depois, recarregue o sistema para abrir o novo painel. A URL e a chave pública existentes continuam sendo usadas; não é necessária chave administrativa no aplicativo.

## 2. Vincular um cliente

1. Em Authentication → Users → Add user, crie uma conta exclusiva com e-mail e senha e marque o e-mail como confirmado. Não use seu login de gestor para um cliente.
2. Entre no sistema com sua conta gestora.
3. Escolha a empresa → Acessos dos clientes → informe o e-mail confirmado → Vincular acesso.
4. Envie ao cliente o endereço do sistema e combine o acesso por um canal seguro. O sistema não envia e-mails automaticamente.
5. O cliente entra no mesmo endereço e vê somente a empresa vinculada. Ele pode consultar o planejamento e enviar novidades.

Cada conta de cliente tem uma empresa. Uma empresa pode ter mais de um cliente autorizado. Para trocar a empresa de um cliente, remova o acesso anterior e vincule novamente. Contas gestoras não podem ser vinculadas como clientes. Uma conta sem vínculo recebe uma orientação e nenhum calendário.

## 3. Usar o painel

- **Calendário:** data, formato, quantidade, título e tema opcionais; sem mídia ou horário no novo formulário.
- **Publicação parcial:** para 3 Stories, use “+1 publicado” a cada publicação ou informe o total no editor. Os resumos somam quantidades, não cards.
- **Anotações:** Minhas notas reúne ideias e roteiros privados, com opções de abrir, editar e apagar. Mensagens do cliente reúne novidades da própria empresa. Data opcional, sem filtros ou status.
- **Acessos dos clientes:** somente o gestor pode vincular e revogar clientes.
- O painel busca atualizações a cada 30 segundos enquanto visível e ao voltar à janela. Há também atualização manual.

As observações anteriores aparecem no editor do gestor como texto privado. Os campos antigos de observações, horário e imagens continuam no banco; não são enviados ao cliente. O calendário novo não oferece upload nem publicação no Instagram.

## 4. Conferir após ativar

Entre como gestor e como dois clientes diferentes, em sessões separadas. Confira a empresa de cada um, o envio de novidades e a ausência das notas internas no cliente. Remova um vínculo e confirme que a conta perde o acesso após atualizar. Compare os totais anteriores à migração com os novos resumos (quantidade inicial 1 por postagem).

Não compartilhe sua senha ou uma chave `service_role` com o cliente. O banco aplica as permissões independentemente da interface.
