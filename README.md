# OS Stock

MVP pessoal de ordens de serviço e controle de estoque para assistência técnica de eletrodomésticos.

## Stack
- React + TypeScript + Vite
- Supabase / PostgreSQL (integração na próxima etapa)
- Docker para execução local
- Capacitor para APK Android (etapa posterior)

## Executar com Docker
```bash
docker compose up --build -d
```
Acesse http://localhost:8080

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
3. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Configure RLS antes de armazenar dados reais.
5. Nunca coloque `service_role` no frontend, APK ou Git.

A tela atual usa dados de demonstração em memória. Ainda não grava ordens nem estoque no banco; isso será feito junto com as migrations e políticas RLS na próxima etapa.
