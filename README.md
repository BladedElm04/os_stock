# OS Stock

MVP pessoal de ordens de serviço e controle de estoque para assistência técnica de eletrodomésticos.

## Stack
- React + TypeScript + Vite
- Supabase / PostgreSQL
- Docker para execução local
- Capacitor para APK Android (etapa posterior)

## Executar com Docker
```bash
docker compose up --build -d
```
Acesse http://localhost:8085

Parar:
```bash
docker compose down
```

## Executar sem Docker
Requer Node.js 20 ou 22:
```bash
npm install
npm run dev
```
Acesse http://localhost:5173

## Git
Extraia os arquivos na raiz do repositório `os_stock` e execute:
```bash
git add .
git commit -m "chore: iniciar estrutura do OS Stock"
git push origin main
```
Confira o nome da branch com `git branch --show-current`.

## Supabase
1. Crie um projeto Supabase.
2. Copie `.env.example` para `.env.local`.
3. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Configure políticas RLS para usuários autenticados lerem e alterarem os dados necessários.
5. Nunca coloque `service_role` no frontend, APK ou Git.

O app consulta ordens, clientes, equipamentos e peças no Supabase. Também permite cadastrar e editar clientes e peças, desativar cadastros preservando o histórico, cadastrar e listar equipamentos por cliente, consultar relatórios mensais de ordens por status e valores, configurar o nome do perfil, atualizar o status das ordens, editar diagnóstico/serviço/observações, registrar entradas/saídas de estoque e imprimir ordens de serviço ou salvá-las como PDF pelo navegador.
