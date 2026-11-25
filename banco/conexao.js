
const mysql = require('mysql2/promise');

const conexao = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'adotapet',
  port: 3306
});

module.exports = conexao;
