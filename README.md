# 🐾 AdotaPet

O **AdotaPet** é um sistema web desenvolvido para facilitar a divulgação de animais para adoção e conectar interessados aos responsáveis pelos anúncios.

## Tecnologias utilizadas

- **Backend:** Node.js e Express
- **Frontend:** HTML, CSS, JavaScript, EJS e Bootstrap
- **Banco de dados:** MariaDB
- **Bibliotecas:** mysql2, bcrypt, multer, express-session e dotenv

## Funcionalidades

- Cadastro e login de usuários com foto de perfil.
- Cadastro, edição e exclusão de animais.
- Listagem de animais com busca e filtros.
- Envio e gerenciamento de solicitações de adoção.
- Controle dos status: Disponível, Em processo e Adotado.
- Proteção de rotas e permissões dos usuários.

## Como executar

**1. Instale as dependências:**

```bash
npm install
```

**2. Configure o banco de dados:**

Inicie o MariaDB pelo XAMPP, crie um banco chamado `adotapet` e importe o arquivo `banco/adotapet.sql`.

**3. Configure o ambiente:**

Crie um arquivo `.env` na pasta principal:

```env
SESSION_SECRET=sua_chave_secreta
```

Confira também os dados de conexão em `banco/conexao.js`.

**4. Inicie o servidor:**

```bash
npm start
```

Acesse: **http://localhost:3000**

## Sobre o projeto

Projeto acadêmico desenvolvido para aplicar conhecimentos de desenvolvimento web Full Stack, operações CRUD, autenticação de usuários e integração com banco de dados relacional.