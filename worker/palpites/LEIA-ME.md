# Palpites da Temporada — AirBall 2026–2027

A aba está em https://cecinstefano.github.io/airball-dynasty/#/palpites-da-temporada

## 1. Criar o banco (uma vez)
No Cloudflare, abra Storage & databases > D1 SQL Database > Create database.
Nome sugerido: airball-palpites-2026-2027.
Abra o banco, vá à aba Console, cole TODO o conteúdo de schema.sql (nesta pasta) e execute.
Isso cria a tabela gm_picks sem apagar tabelas existentes.

## 2. Criar um Worker SEPARADO
Workers & Pages > Create application > Create Worker (ou Start with Hello World).
Nome sugerido: airball-palpites. Não substitua airball-espn-proxy.
No editor, substitua o código inicial por TODO o conteúdo de worker.mjs e clique em Deploy.
O arquivo é único: o catálogo de opções já está incluído, sem dependências.

## 3. Conectar o banco e configurar o prazo
No Worker novo, abra Bindings > Add binding > D1 database.
Variable name: DB (exatamente em maiúsculas). Selecione o banco criado no passo 1.
Em Settings > Variables and Secrets, adicione:
- DEADLINE, tipo Text: 2026-10-16T00:00:00-03:00
  Aceita edições até o fim de 15/10/2026 em Brasília; bloqueia à meia-noite.
- ADMIN_KEY, tipo Secret: uma senha aleatória longa, idealmente 32 caracteres ou mais,
  criada no seu gerenciador de senhas. Guarde-a; não coloque no GitHub ou no grupo.
Salve/deploy. A origem permitida já é https://cecinstefano.github.io.
O Worker ESPN não precisa de nenhuma alteração ou nova credencial.

## 4. Verificar
Copie a URL do Worker novo, por exemplo a URL que o Cloudflare mostrar terminando em workers.dev.
Abra SUA_URL/health. Deve mostrar ok:true, locked:false e deadline preenchido.
Sem DEADLINE válida, o salvamento fica bloqueado. Isso é intencional.

## 5. Gerar os links privados e conectar o site
Abra PowerShell nesta pasta (worker/palpites) e execute:

  powershell -ExecutionPolicy Bypass -File .\CONFIGURAR.ps1 -WorkerUrl "COLE_A_URL_HTTPS_DO_WORKER_NOVO"

O comando só vale para este processo. Ele pedirá o ADMIN_KEY sem exibi-lo.
O script gera um link por franquia e salva um arquivo PRIVADO em Downloads.
Também preenche assets/palpites/config.json com a URL pública da API.
Nunca envie o arquivo de convites para o GitHub: envie cada link apenas ao GM correspondente.
Quem possuir o link pode editar aquela ficha até o prazo. Não há senha adicional.
O servidor guarda apenas o hash do convite, não o link em texto aberto.
Rodar novamente não altera os links existentes. Guarde o arquivo de Downloads.
Se perder um link, gere outro para UMA franquia (preserva a ficha e revoga o link anterior):
  powershell -ExecutionPolicy Bypass -File .\CONFIGURAR.ps1 -WorkerUrl "SUA_URL" -Franquia "stefanos-supersonics" -Renovar

## 6. Publicar e testar antes de distribuir
No GitHub Desktop, faça commit da alteração em assets/palpites/config.json e Push origin.
Abra seu link privado, preencha uma categoria e clique em Salvar rascunho.
Reabra o mesmo link em outro navegador: confira se a escolha aparece.
Confira que o link público não mostra sua ficha antes do prazo.
Depois envie os demais links, individualmente. O programa não envia mensagens sozinho.

## Como funciona
- Uma ficha por franquia; identificação vinculada ao convite, sem escolher outro GM.
- Rascunhos incompletos podem ser salvos. Confirmar exige todas as perguntas obrigatórias.
- As listas impedem nomes repetidos dentro da mesma seleção. NBA e AirBall ficam separados.
- All-Star 24, All-NBA 15 (3x5), All-Rookie 10 (2x5), TOP 5 Fantasy com 60+ jogos,
  Rookie Fantasy com 60+ jogos. Esses critérios são para apuração ao fim da temporada.
- All-Rookie e Rookie do Ano: o GM deve escolher atletas elegíveis; o catálogo ESPN disponível
  não traz elegibilidade oficial de rookie, portanto não há validação automática dessa condição.
- Steal/ERROU! mostram o round e o pick original do draft.
- Salvar rascunho após confirmar retira a confirmação; é preciso confirmar novamente.
- Rascunhos locais recuperam edições acidentais no mesmo navegador, mas só a mensagem
  “salvo no servidor” confirma que foram guardados no Cloudflare.
- Duas abas/dispositivos não sobrescrevem silenciosamente: conflito de versão pede recarga.
  Antes de recarregar, use Exportar minha ficha para guardar suas alterações.
- Depois do prazo, todas as fichas CONFIRMADAS ficam públicas; rascunhos ficam privados.
- O organizador pode consultar/exportar a tabela no console D1. Os rascunhos são privados
  para os outros GMs, não para o administrador do banco.
- Não há apuração automática nem placar de pontos nesta etapa. A ficha registra os palpites.
- Catálogo de nomes/draft é uma fotografia da criação. Para atualizar, mantenha sincronizados
  assets/palpites/schema.json e o SCHEMA no início do worker.mjs e publique ambos.

## Problemas comuns
“Banco ainda não configurado”: confira o binding DB e a execução de schema.sql.
“Prazo ainda precisa configurar”: confira DEADLINE em formato ISO, com -03:00.
“Convite inválido”: confirme o link completo; se foi renovado, só o novo funciona.
Erro de origem: abra o site oficial GitHub Pages, não um HTML aberto diretamente.
Erro ao salvar: a ficha fica na tela. Não compartilhe o link privado ao pedir ajuda.

Documentação oficial:
https://developers.cloudflare.com/d1/get-started/
https://developers.cloudflare.com/workers/configuration/secrets/
