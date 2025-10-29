# Sistema de Controle de Atividades

Aplicação web para gerenciamento de atividades com cadastro, edição, filtros, relatórios e integração opcional via webhook.

## Visão Geral
- Backend em `Node.js` com `Express`.
- Banco de dados `MariaDB`.
- Frontend simples em HTML/CSS/JS vanilla (SPA leve).
- Autenticação por `JWT`.
- Configuração de `Webhook` para envio automático (opcional).

### Novidades recentes
- Login aceita `Usuário ou Email` no mesmo campo (case-insensitive com `trim`) e prioriza o nome.
- Reset de senha redefine para o próprio nome do usuário (com `trim`).
- Papel `Visualizador` pode criar atividades, sempre atribuídas a si mesmo.
- Permissões no Cronograma/Atividades: não-admins veem apenas atividades que criaram ou pelas quais são responsáveis; admins veem todas.
- Cronograma (Calendário e Tabela):
  - Filtros por `Origem`, `Atividade`, `Status`, `Prioridade` e `Responsável` (origem/atividade são case-insensitive).
  - Itens vencidos e não concluídos destacados em vermelho.
  - Calendário exibe somente atividades com `due_date`, com título "Atividade – Responsável" e badge de status.
  - Tabela unifica a coluna de prazo como `Finalizará em` (usa `due_date`) e mantém `Finalizada em` para concluídas.
- Webhook:
  - Teste realiza POST real com timeout de 10s e tratamento de erro detalhado.
  - Envio manual monta payload conforme campos configurados e faz POST real.
  - Envio automático ao criar/editar atividades quando `auto_send` está ativo.

## Requisitos
- Node.js >= 18
- MariaDB >= 10.6

## Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com as variáveis abaixo:

```
PORT=3100
NODE_ENV=development

# Banco de Dados
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=senha
DB_NAME=atividades

# JWT
JWT_SECRET=uma_chave_secreta_segura
JWT_EXPIRATION=1d
```

## Instalação e Execução (Local)
1. Instale dependências:
   - `npm install`

2. Prepare o banco de dados (tabelas e admin padrão):
   - `npm run setup-db`
   - Credenciais do admin padrão: email `admin`, senha `admin` (altere após o primeiro login).
   - Setor padrão "Geral" é criado e vinculado ao admin.
   - Configuração de webhook padrão é criada (inativa, sem auto envio).

3. Execute em modo desenvolvimento (com nodemon):
   - `npm run dev`
   - Acesse `http://localhost:3100/`

4. Execução em produção:
   - `npm start`

## Scripts Disponíveis
- `npm run dev`: inicia o servidor com `nodemon` (usa `PORT`).
- `npm start`: inicia o servidor com `node`.
- `npm run setup-db`: cria/atualiza tabelas e usuário admin padrão.

## Seeds padrão e índices (setup-db)
- Cria setor padrão "Geral" e vincula o usuário admin.
- Cria configuração de webhook padrão (campos marcados, `active=false`, `auto_send=false`).
- Adiciona índices úteis em `activities`:
  - `idx_activities_date` (melhora filtros por data)
  - `idx_activities_responsible` (melhora filtros por responsável)

## Endpoints Principais (API)
- `POST /api/auth/login`: autenticação e obtenção de token.
- `POST /api/auth/change-password`: alteração de senha (precisa estar autenticado).
- `POST /api/auth/logout`: encerra a sessão atual.
- `GET /api/auth/status`: retorna estado atual da sessão.
- `GET /api/activities`: lista atividades (suporta filtros como status, responsável, datas, origem).
- `POST /api/activities`: cria uma nova atividade.
- `PUT /api/activities/:id`: atualiza uma atividade.
- `DELETE /api/activities/:id`: exclui uma atividade.
- `GET /api/activities/summary/dashboard`: dados de KPIs e gráficos do dashboard.
- `GET/POST /api/webhook/config`: leitura e gravação da configuração de webhook.
- `POST /api/webhook/test`: testa a entrega realizando POST real para a URL informada.
- `POST /api/webhook/send`: envia dados de uma atividade específica para o webhook ativo.
- `POST /api/reports/export`: exporta relatório (endpoint mock).
 - `GET /api/users`: lista usuários.
 - `POST /api/users`: cria usuário (por padrão, senha = nome, com `trim`).
 - `PUT /api/users/:id`: atualiza usuário.
 - `DELETE /api/users/:id`: exclui usuário.
 - `POST /api/users/:id/reset-password`: reseta a senha para o nome atual (com `trim`).

## Acesso à Aplicação
- Interface: `public/index.html`
- CSS: `public/css/styles.css`
- JS principal: `public/js/app.js`
 - JS de autenticação: `public/js/auth.js`

### Como realizar login
- Campo único: "Usuário ou Email".
- Senha padrão ao criar usuário sem senha: o próprio `name` (com `trim`).
- Após reset de senha via Configurações → Usuários, a senha volta a ser o `name` atual.

### Códigos de retorno comuns
- `200 OK`: credenciais válidas.
- `401 Unauthorized`: usuário não encontrado ou senha incorreta.
- `403 Forbidden`: usuário inativo (`active=false`) ou sem permissão (`can_login=false`).

### Dicas
- Copie o `name` exatamente como aparece na lista de usuários para evitar espaços invisíveis.
- Em caso de nomes duplicados, o login seleciona quem pode logar e está ativo; considere padronizar nomes únicos para usuários com acesso.

## Permissões e Escopo de Dados
- Perfis: `admin`, `edit` (editor), `view` (visualizador).
- Listagem (`GET /api/activities`):
  - `admin`: vê todas as atividades.
  - `edit`/`view`: vê somente atividades que criou ou pelas quais é responsável.
- Criação:
  - `view`: pode criar, e a atividade é atribuída automaticamente a si mesmo.
- Edição:
  - `view`: não pode editar.
  - `edit`: pode editar quando é criador ou responsável.

## Webhook (Opcional)
- Configure em "Configurações → Webhook" dentro da aplicação.
- Payload respeita os campos selecionados e inclui sempre: `id`, `due_date`, `created_at`, `updated_at`.
- Campos selecionáveis: `origin`, `activity`, `date`, `duration`, `status`, `priority`, `observation`, `responsible` (objeto `{ id, name }`).
- Headers: `Content-Type: application/json`, `X-Webhook-Source: atividades-app`, `X-Event: activity.created|activity.updated`.
- Timeout padrão: 10s. Respostas não-2xx e erros são logados sem bloquear a operação.

### Envio automático
- Com `active=true` e `auto_send=true`, o backend envia automaticamente no `POST /api/activities` (criação) e `PUT /api/activities/:id` (edição).
- Endpoints de apoio:
  - `POST /api/webhook/test`: POST real com payload simples `{ ping: 'ok', timestamp }` para validar conectividade.
  - `POST /api/webhook/send`: POST real de uma atividade específica (respeita campos selecionados).

---

# Execução com Docker

Você pode levantar toda a stack (app + MariaDB) usando Docker.

## Opção A: Docker Compose (Recomendado)
1. Crie (ou ajuste) um arquivo `.env` na raiz do projeto com as variáveis:
   ```
   # Porta do app
   PORT=3100

   # Banco usado pelo app (aponta para o serviço do compose)
   DB_HOST=db
   DB_PORT=3306
   DB_USER=appuser
   DB_PASSWORD=apppassword
   DB_NAME=atividades

   # JWT
   JWT_SECRET=uma_chave_secreta_segura
   JWT_EXPIRATION=1d
   ```

2. Suba os serviços:
   - `docker compose up -d`

3. Inicialize o banco (tabelas e admin):
   - `docker compose run --rm app npm run setup-db`

4. Acesse a aplicação:
   - `http://localhost:3100/`

O Compose utiliza:
- `mariadb` para o banco com volume persistente.
- `app` construído a partir deste repositório.

## Opção B: Docker puro
1. Build da imagem:
   - `docker build -t atividades-app .`

2. Suba um container MariaDB:
   - `docker run -d --name atividades-db -e MARIADB_ROOT_PASSWORD=senha -e MARIADB_DATABASE=atividades -e MARIADB_USER=appuser -e MARIADB_PASSWORD=apppassword -p 3306:3306 -v mariadb_data:/var/lib/mysql mariadb:10.6`

3. Execute o setup do banco na app (após o DB estar pronto):
   - `docker run --rm --name atividades-setup --env PORT=3100 --env DB_HOST=host.docker.internal --env DB_PORT=3306 --env DB_USER=appuser --env DB_PASSWORD=apppassword --env DB_NAME=atividades --env JWT_SECRET=uma_chave_secreta_segura --env JWT_EXPIRATION=1d atividades-app npm run setup-db`

4. Rode a aplicação:
   - `docker run -d --name atividades-app -p 3100:3100 --env PORT=3100 --env DB_HOST=host.docker.internal --env DB_PORT=3306 --env DB_USER=appuser --env DB_PASSWORD=apppassword --env DB_NAME=atividades --env JWT_SECRET=uma_chave_secreta_segura --env JWT_EXPIRATION=1d atividades-app`

Observação: Em macOS/Windows, `host.docker.internal` aponta para o host e permite que o container app acesse o DB rodando no host. Se o DB estiver em outro container, use o nome do container/rede correspondente.

## Estrutura dos Arquivos Docker
- `Dockerfile`: imagem da aplicação Node em produção.
- `docker-compose.yml`: orquestra app + MariaDB com variáveis e volumes.
- `.dockerignore`: evita copiar arquivos desnecessários para o build.

## Dicas
- Se o app subir antes do DB, use `docker compose run --rm app npm run setup-db` após o DB estar pronto.
- Para logs: `docker compose logs -f app` e `docker compose logs -f db`.
- Para recriar apenas o app: `docker compose up -d --build app`.

---

## Instalação via Easypanel

Você pode instalar a aplicação usando um Template JSON no Easypanel:

- Abra seu Easypanel → Templates → Create from JSON.
- Cole o conteúdo de `easypanel-template.json` (neste repositório).
- Preencha as variáveis solicitadas (senhas e nomes do banco).
- Crie os serviços: primeiro o `db` (MariaDB) e depois o `app`.
- Após criar, rode o comando de setup do banco no serviço `app`:
  - `npm run setup-db`

Observações:
- O serviço `app` realiza build a partir deste repositório via Dockerfile.
- A porta padrão exposta é `3100`.
- O serviço `app` depende do serviço `db` (MariaDB 10.6).

---

## Licença
Este projeto é disponibilizado para fins educacionais e internos. Ajuste conforme sua necessidade.