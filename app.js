
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const fs = require('fs/promises');
const fsSync = require('fs');

const conexao = require('./banco/conexao');
const verificarAutenticacao = require('./middlewares/autenticacao');
const { gerarToken, verificarToken } = require('./middlewares/csrf');
const validarImagem = require('./middlewares/validarImagem');

const app = express();
const PORTA = 3000;

const PASTA_UPLOADS = path.join(__dirname, 'public', 'uploads');
const ESPECIES_PERMITIDAS = ['Cachorro', 'Gato', 'Outro'];

// Verifica se um ID é um número inteiro positivo.
function idValido(id) {
  return Number.isSafeInteger(id) && id > 0;
}

// Exibe erros com o visual do AdotaPet.
function mostrarErro(res, status, mensagem) {
  return res.status(status).render('erro', { mensagem });
}

// Remove uma imagem, se ela existir.
async function removerImagem(caminho) {
  if (!caminho) return;

  try {
    await fs.unlink(caminho);
  } catch (erro) {
    if (erro.code !== 'ENOENT') {
      console.error('Erro ao remover imagem:', erro.message);
    }
  }
}

// Valida os dados enviados nos formulários de animais.
function validarDadosAnimal(body) {
  const { nome, especie, idade, descricao } = body;

  const nomeLimpo =
    typeof nome === 'string' ? nome.trim() : '';

  const idadeNumero = Number(idade);

  const descricaoValida =
    descricao === undefined || typeof descricao === 'string';

  const valido =
    nomeLimpo.length > 0 &&
    nomeLimpo.length <= 100 &&
    ESPECIES_PERMITIDAS.includes(especie) &&
    idade !== undefined &&
    idade !== '' &&
    Number.isInteger(idadeNumero) &&
    idadeNumero >= 0 &&
    idadeNumero <= 100 &&
    descricaoValida;

  return {
    valido,
    nome: nomeLimpo,
    especie,
    idade: idadeNumero,
    descricao:
      typeof descricao === 'string'
        ? descricao.trim() || null
        : null
  };
}

app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: true }));

if (!process.env.SESSION_SECRET) {
  throw new Error('Configure SESSION_SECRET no arquivo .env.');
}

// Configuração de sessões.
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false
  }
}));

// Disponibilizar usuário logado para as páginas EJS.
app.use((req, res, next) => {
  res.locals.usuarioLogado = req.session.usuario || null;
  next();
});

// Disponibilizar mensagens temporárias para as páginas EJS.
app.use((req, res, next) => {
  res.locals.aviso = req.session.aviso || null;

  // Remover o aviso para não aparecer novamente.
  delete req.session.aviso;

  next();
});

// Gerar token CSRF para os formulários.
app.use(gerarToken);

// Garantir que a pasta de uploads exista.
fsSync.mkdirSync(PASTA_UPLOADS, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PASTA_UPLOADS);
  },

  filename: (req, file, cb) => {
    const nome = crypto.randomUUID();

    const extensao = path.extname(file.originalname)
      .toLowerCase();

    cb(null, nome + extensao);
  }
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    const extensoesPermitidas = [
      '.jpg',
      '.jpeg',
      '.png',
      '.webp'
    ];

    const extensao = path.extname(file.originalname)
      .toLowerCase();

    if (
      tiposPermitidos.includes(file.mimetype) &&
      extensoesPermitidas.includes(extensao)
    ) {
      return cb(null, true);
    }

    cb(new Error('Formato de imagem não permitido.'));
  }
});

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/animais', async (req, res) => {
  try {
    const [animais] = await conexao.execute(`
      SELECT
        a.id_animal,
        a.id_usuario,
        a.nome,
        a.especie,
        a.idade,
        a.descricao,
        a.arquivo,
        a.status_adocao,
        u.nome AS responsavel
      FROM tb_animais a
      INNER JOIN tb_usuarios u
        ON a.id_usuario = u.id_usuario
      ORDER BY a.id_animal DESC
    `);

    res.render('animais', { animais });

  } catch (erro) {
    console.error('Erro ao listar animais:', erro.message);

    mostrarErro(res, 500, 'Erro ao carregar animais.');
  }
});

app.get('/cadastro', (req, res) => {
  res.render('cadastro');
});

app.post(
  '/cadastro',
  upload.single('foto'),
  verificarToken,
  validarImagem,
  async (req, res) => {
    let cadastroConcluido = false;

    try {
      const { nome, email, senha } = req.body;

      const nomeLimpo =
        typeof nome === 'string' ? nome.trim() : '';

      const emailLimpo =
        typeof email === 'string'
          ? email.trim().toLowerCase()
          : '';

      // Validar dados do cadastro.
      if (
        !nomeLimpo ||
        nomeLimpo.length > 100 ||
        !emailLimpo ||
        emailLimpo.length > 150 ||
        typeof senha !== 'string' ||
        !senha ||
        !req.file
      ) {
        req.session.aviso = {
          tipo: 'warning',
          texto: 'Preencha corretamente todos os campos.'
        };

        return res.redirect(303, '/cadastro');
      }

      // Gerar hash da senha.
      const senhaHash = await bcrypt.hash(senha, 10);

      // Inserir usuário no banco.
      await conexao.execute(
        `INSERT INTO tb_usuarios
          (nome, email, senha_hash, foto_perfil)
         VALUES (?, ?, ?, ?)`,
        [
          nomeLimpo,
          emailLimpo,
          senhaHash,
          req.file.filename
        ]
      );

      cadastroConcluido = true;

      req.session.aviso = {
        tipo: 'success',
        texto: 'Cadastro realizado com sucesso! Agora você pode entrar.'
      };

      return res.redirect(303, '/login');

    } catch (erro) {
      // Tratar e-mail duplicado.
      if (erro.code === 'ER_DUP_ENTRY') {
        req.session.aviso = {
          tipo: 'danger',
          texto: 'Este e-mail já está cadastrado. Tente outro.'
        };

        return res.redirect(303, '/cadastro');
      }

      console.error('Erro no cadastro:', erro.message);

      return mostrarErro(
        res,
        500,
        'Erro ao cadastrar usuário.'
      );

    } finally {
      // Evitar manter imagens de cadastros não concluídos.
      if (!cadastroConcluido && req.file) {
        await removerImagem(req.file.path);
      }
    }
  }
);

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', verificarToken, async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Validar campos.
    if (
      typeof email !== 'string' ||
      typeof senha !== 'string' ||
      !email.trim() ||
      !senha
    ) {
      req.session.aviso = {
        tipo: 'warning',
        texto: 'Informe seu e-mail e sua senha.'
      };

      return res.redirect(303, '/login');
    }

    // Buscar usuário pelo e-mail.
    const [usuarios] = await conexao.execute(
      `SELECT
         id_usuario,
         nome,
         email,
         senha_hash,
         foto_perfil
       FROM tb_usuarios
       WHERE email = ?`,
      [email.trim().toLowerCase()]
    );

    // Verificar se o usuário existe.
    if (usuarios.length === 0) {
      req.session.aviso = {
        tipo: 'danger',
        texto: 'E-mail ou senha inválidos. Tente novamente.'
      };

      return res.redirect(303, '/login');
    }

    const usuario = usuarios[0];

    // Conferir senha.
    const senhaValida = await bcrypt.compare(
      senha,
      usuario.senha_hash
    );

    if (!senhaValida) {
      req.session.aviso = {
        tipo: 'danger',
        texto: 'E-mail ou senha inválidos. Tente novamente.'
      };

      return res.redirect(303, '/login');
    }

    // Regenerar a sessão após autenticação.
    req.session.regenerate((erro) => {
      if (erro) {
        console.error('Erro na sessão:', erro.message);

        return mostrarErro(
          res,
          500,
          'Erro ao iniciar sessão.'
        );
      }

      // Armazenar dados do usuário autenticado.
      req.session.usuario = {
        id: usuario.id_usuario,
        nome: usuario.nome,
        foto: usuario.foto_perfil
      };

      // Renovar o token CSRF.
      req.session.csrfToken =
        crypto.randomBytes(32).toString('hex');

      req.session.save((erro) => {
        if (erro) {
          console.error('Erro ao salvar sessão:', erro.message);

          return mostrarErro(
            res,
            500,
            'Erro ao iniciar sessão.'
          );
        }

        res.redirect('/');
      });
    });

  } catch (erro) {
    console.error('Erro no login:', erro.message);

    mostrarErro(res, 500, 'Erro ao realizar login.');
  }
});

app.post('/logout', verificarToken, (req, res) => {
  req.session.destroy((erro) => {
    if (erro) {
      console.error('Erro no logout:', erro.message);

      return mostrarErro(
        res,
        500,
        'Erro ao sair da conta.'
      );
    }

    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

app.get(
  '/animais/novo',
  verificarAutenticacao,
  (req, res) => {
    res.render('novoAnimal');
  }
);

app.post(
  '/animais',
  verificarAutenticacao,
  upload.single('arquivo'),
  verificarToken,
  validarImagem,
  async (req, res) => {
    let cadastroConcluido = false;

    try {
      const dados = validarDadosAnimal(req.body);

      // Validar campos e imagem.
      if (!dados.valido || !req.file) {
        return mostrarErro(
          res,
          400,
          'Dados do animal inválidos.'
        );
      }

      // Salvar animal no banco.
      await conexao.execute(
        `INSERT INTO tb_animais
          (id_usuario, nome, especie, idade, descricao, arquivo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          req.session.usuario.id,
          dados.nome,
          dados.especie,
          dados.idade,
          dados.descricao,
          req.file.filename
        ]
      );

      cadastroConcluido = true;

      req.session.aviso = {
        tipo: 'success',
        texto: 'Animal cadastrado com sucesso!'
      };

      res.redirect(303, '/animais');

    } catch (erro) {
      console.error(
        'Erro ao cadastrar animal:',
        erro.message
      );

      mostrarErro(res, 500, 'Erro ao cadastrar animal.');

    } finally {
      // Limpar upload se o cadastro falhar.
      if (!cadastroConcluido && req.file) {
        await removerImagem(req.file.path);
      }
    }
  }
);

app.get(
  '/animais/:id/editar',
  verificarAutenticacao,
  async (req, res) => {
    try {
      const idAnimal = Number(req.params.id);
      const idUsuario = req.session.usuario.id;

      if (!idValido(idAnimal)) {
        return mostrarErro(
          res,
          404,
          'Animal não encontrado.'
        );
      }

      // Buscar apenas animais pertencentes ao usuário.
      const [animais] = await conexao.execute(
        `SELECT
           id_animal,
           nome,
           especie,
           idade,
           descricao,
           arquivo
         FROM tb_animais
         WHERE id_animal = ?
           AND id_usuario = ?`,
        [idAnimal, idUsuario]
      );

      if (animais.length === 0) {
        return mostrarErro(
          res,
          404,
          'Animal não encontrado ou sem permissão para editar.'
        );
      }

      res.render('editarAnimal', {
        animal: animais[0]
      });

    } catch (erro) {
      console.error('Erro ao abrir edição:', erro.message);

      mostrarErro(res, 500, 'Erro ao carregar animal.');
    }
  }
);

app.post(
  '/animais/:id/editar',
  verificarAutenticacao,
  upload.single('arquivo'),
  verificarToken,
  validarImagem,
  async (req, res) => {
    let atualizacaoConcluida = false;

    try {
      const idAnimal = Number(req.params.id);
      const idUsuario = req.session.usuario.id;
      const dados = validarDadosAnimal(req.body);

      // Verificar dados recebidos.
      if (!idValido(idAnimal) || !dados.valido) {
        if (!idValido(idAnimal)) {
          return mostrarErro(
            res,
            404,
            'Animal não encontrado.'
          );
        }

        req.session.aviso = {
          tipo: 'danger',
          texto: 'Não foi possível salvar. Verifique os dados informados.'
        };

        return res.redirect(
          303,
          `/animais/${idAnimal}/editar`
        );
      }

      // Buscar foto atual e verificar responsável.
      const [animais] = await conexao.execute(
        `SELECT arquivo
         FROM tb_animais
         WHERE id_animal = ?
           AND id_usuario = ?`,
        [idAnimal, idUsuario]
      );

      if (animais.length === 0) {
        return mostrarErro(
          res,
          404,
          'Animal não encontrado ou sem permissão.'
        );
      }

      const fotoAnterior = animais[0].arquivo;

      // Manter a foto atual caso nenhuma nova seja enviada.
      const novoArquivo = req.file
        ? req.file.filename
        : fotoAnterior;

      // Atualizar dados do animal.
      const [resultado] = await conexao.execute(
        `UPDATE tb_animais
         SET nome = ?,
             especie = ?,
             idade = ?,
             descricao = ?,
             arquivo = ?
         WHERE id_animal = ?
           AND id_usuario = ?`,
        [
          dados.nome,
          dados.especie,
          dados.idade,
          dados.descricao,
          novoArquivo,
          idAnimal,
          idUsuario
        ]
      );

      if (resultado.affectedRows === 0) {
        return mostrarErro(
          res,
          404,
          'Animal não encontrado ou sem permissão.'
        );
      }

      atualizacaoConcluida = true;

      // Excluir foto anterior após confirmar a alteração.
      if (req.file && fotoAnterior !== novoArquivo) {
        await removerImagem(
          path.join(PASTA_UPLOADS, fotoAnterior)
        );
      }

      req.session.aviso = {
        tipo: 'success',
        texto: 'Informações do animal atualizadas com sucesso!'
      };

      res.redirect(303, '/animais');

    } catch (erro) {
      console.error('Erro ao editar animal:', erro.message);

      mostrarErro(res, 500, 'Erro ao editar animal.');

    } finally {
      // Limpar upload novo se a edição não for concluída.
      if (!atualizacaoConcluida && req.file) {
        await removerImagem(req.file.path);
      }
    }
  }
);

app.post(
  '/animais/:id/excluir',
  verificarAutenticacao,
  verificarToken,
  async (req, res) => {
    try {
      const idAnimal = Number(req.params.id);
      const idUsuario = req.session.usuario.id;

      if (!idValido(idAnimal)) {
        return mostrarErro(
          res,
          404,
          'Animal não encontrado.'
        );
      }

      // Buscar o animal e verificar responsável.
      const [animais] = await conexao.execute(
        `SELECT arquivo
         FROM tb_animais
         WHERE id_animal = ?
           AND id_usuario = ?`,
        [idAnimal, idUsuario]
      );

      if (animais.length === 0) {
        return mostrarErro(
          res,
          404,
          'Animal não encontrado ou sem permissão.'
        );
      }

      // Excluir registro.
      const [resultado] = await conexao.execute(
        `DELETE FROM tb_animais
         WHERE id_animal = ?
           AND id_usuario = ?`,
        [idAnimal, idUsuario]
      );

      if (resultado.affectedRows === 0) {
        return mostrarErro(
          res,
          404,
          'Animal não encontrado ou sem permissão.'
        );
      }

      // Remover imagem do animal excluído.
      await removerImagem(
        path.join(PASTA_UPLOADS, animais[0].arquivo)
      );

      req.session.aviso = {
        tipo: 'success',
        texto: 'Animal excluído com sucesso!'
      };

      res.redirect(303, '/animais');

    } catch (erro) {
      console.error('Erro ao excluir animal:', erro.message);

      mostrarErro(res, 500, 'Erro ao excluir animal.');
    }
  }
);

app.get('/animais/:id', async (req, res) => {
  try {
    const idAnimal = Number(req.params.id);

    if (!idValido(idAnimal)) {
      return mostrarErro(
        res,
        404,
        'Animal não encontrado.'
      );
    }

    // Buscar animal e responsável.
    const [animais] = await conexao.execute(
      `SELECT
         a.id_animal,
         a.id_usuario,
         a.nome,
         a.especie,
         a.idade,
         a.descricao,
         a.arquivo,
         a.status_adocao,
         u.nome AS responsavel
       FROM tb_animais a
       INNER JOIN tb_usuarios u
         ON a.id_usuario = u.id_usuario
       WHERE a.id_animal = ?`,
      [idAnimal]
    );

    if (animais.length === 0) {
      return mostrarErro(
        res,
        404,
        'Animal não encontrado.'
      );
    }

    let interesseExistente = null;

    // Verificar interesse anterior do usuário logado.
    if (req.session.usuario) {
      const [interesses] = await conexao.execute(
        `SELECT id_interesse, status
         FROM tb_interesses
         WHERE id_animal = ?
           AND id_usuario = ?`,
        [
          idAnimal,
          req.session.usuario.id
        ]
      );

      interesseExistente = interesses[0] || null;
    }

    res.render('detalhesAnimal', {
      animal: animais[0],
      interesseExistente
    });

  } catch (erro) {
    console.error(
      'Erro ao carregar animal:',
      erro.message
    );

    mostrarErro(
      res,
      500,
      'Erro ao carregar detalhes do animal.'
    );
  }
});

app.post(
  '/animais/:id/interesse',
  verificarAutenticacao,
  verificarToken,
  async (req, res) => {
    let transacao;
    let iniciada = false;

    try {
      const idAnimal = Number(req.params.id);
      const idUsuario = req.session.usuario.id;
      const mensagem = req.body.mensagem;

      // Validar ID.
      if (!idValido(idAnimal)) {
        return mostrarErro(
          res,
          404,
          'Animal não encontrado.'
        );
      }

      // Validar mensagem.
      if (
        mensagem !== undefined &&
        (
          typeof mensagem !== 'string' ||
          mensagem.length > 1000
        )
      ) {
        return mostrarErro(
          res,
          400,
          'Mensagem inválida.'
        );
      }

      // Iniciar transação.
      transacao = await conexao.getConnection();

      await transacao.beginTransaction();
      iniciada = true;

      // Bloquear animal durante a verificação.
      const [animais] = await transacao.execute(
        `SELECT id_usuario, status_adocao
         FROM tb_animais
         WHERE id_animal = ?
         FOR UPDATE`,
        [idAnimal]
      );

      if (animais.length === 0) {
        await transacao.rollback();
        iniciada = false;

        return mostrarErro(
          res,
          404,
          'Animal não encontrado.'
        );
      }

      // Impedir interesse no próprio anúncio.
      if (animais[0].id_usuario === idUsuario) {
        await transacao.rollback();
        iniciada = false;

        return mostrarErro(
          res,
          403,
          'Você não pode demonstrar interesse no próprio animal.'
        );
      }

      // Impedir interesse em animal indisponível.
      if (animais[0].status_adocao !== 'disponivel') {
        await transacao.rollback();
        iniciada = false;

        return mostrarErro(
          res,
          409,
          'Este animal não está disponível para novas solicitações.'
        );
      }

      // Registrar a solicitação.
      await transacao.execute(
        `INSERT INTO tb_interesses
          (id_animal, id_usuario, mensagem)
         VALUES (?, ?, ?)`,
        [
          idAnimal,
          idUsuario,
          mensagem?.trim() || null
        ]
      );

      // Confirmar transação.
      await transacao.commit();
      iniciada = false;

      req.session.aviso = {
        tipo: 'success',
        texto: 'Sua solicitação de interesse foi enviada com sucesso!'
      };

      res.redirect(303, `/animais/${idAnimal}`);

    } catch (erro) {
      if (transacao && iniciada) {
        await transacao.rollback().catch(console.error);
      }

      // Tratar solicitação duplicada.
      if (erro.code === 'ER_DUP_ENTRY') {
        return mostrarErro(
          res,
          409,
          'Você já demonstrou interesse neste animal.'
        );
      }

      console.error(
        'Erro ao registrar interesse:',
        erro.message
      );

      mostrarErro(
        res,
        500,
        'Erro ao enviar solicitação.'
      );

    } finally {
      // Devolver conexão ao pool.
      if (transacao) {
        transacao.release();
      }
    }
  }
);

app.get(
  '/solicitacoes',
  verificarAutenticacao,
  async (req, res) => {
    try {
      const [solicitacoes] = await conexao.execute(
        `SELECT
           i.id_interesse,
           i.mensagem,
           i.status,
           i.data_solicitacao,
           a.id_animal,
           a.nome AS nome_animal,
           a.arquivo,
           u.nome AS interessado
         FROM tb_interesses i
         INNER JOIN tb_animais a
           ON i.id_animal = a.id_animal
         INNER JOIN tb_usuarios u
           ON i.id_usuario = u.id_usuario
         WHERE a.id_usuario = ?
         ORDER BY
           i.data_solicitacao DESC,
           i.id_interesse DESC`,
        [req.session.usuario.id]
      );

      res.render('solicitacoes', {
        solicitacoes
      });

    } catch (erro) {
      console.error(
        'Erro ao listar solicitações:',
        erro.message
      );

      mostrarErro(
        res,
        500,
        'Erro ao carregar solicitações.'
      );
    }
  }
);

app.post(
  '/solicitacoes/:id/responder',
  verificarAutenticacao,
  verificarToken,
  async (req, res) => {
    let transacao;
    let iniciada = false;

    try {
      const idInteresse = Number(req.params.id);
      const idUsuario = req.session.usuario.id;
      const { status } = req.body;

      if (!idValido(idInteresse)) {
        return mostrarErro(
          res,
          404,
          'Solicitação não encontrada.'
        );
      }

      // Permitir somente os status esperados.
      if (!['aceito', 'recusado'].includes(status)) {
        return mostrarErro(
          res,
          400,
          'Resposta inválida.'
        );
      }

      transacao = await conexao.getConnection();

      await transacao.beginTransaction();
      iniciada = true;

      // Localizar animal associado à solicitação.
      const [registros] = await transacao.execute(
        `SELECT i.id_interesse, a.id_animal
         FROM tb_interesses i
         INNER JOIN tb_animais a
           ON a.id_animal = i.id_animal
         WHERE i.id_interesse = ?
           AND a.id_usuario = ?`,
        [
          idInteresse,
          idUsuario
        ]
      );

      if (registros.length === 0) {
        await transacao.rollback();
        iniciada = false;

        return mostrarErro(
          res,
          404,
          'Solicitação não encontrada.'
        );
      }

      const idAnimal = registros[0].id_animal;

      // Bloquear o animal primeiro.
      const [animais] = await transacao.execute(
        `SELECT status_adocao
         FROM tb_animais
         WHERE id_animal = ?
           AND id_usuario = ?
         FOR UPDATE`,
        [
          idAnimal,
          idUsuario
        ]
      );

      if (animais.length === 0) {
        await transacao.rollback();
        iniciada = false;

        return mostrarErro(
          res,
          404,
          'Animal não encontrado.'
        );
      }

      // Bloquear a solicitação escolhida.
      const [solicitacoes] = await transacao.execute(
        `SELECT status
         FROM tb_interesses
         WHERE id_interesse = ?
           AND id_animal = ?
         FOR UPDATE`,
        [
          idInteresse,
          idAnimal
        ]
      );

      if (
        solicitacoes.length === 0 ||
        solicitacoes[0].status !== 'pendente'
      ) {
        await transacao.rollback();
        iniciada = false;

        return mostrarErro(
          res,
          409,
          'Solicitação já respondida ou indisponível.'
        );
      }

      // Impedir aceitação quando o animal não está disponível.
      if (
        status === 'aceito' &&
        animais[0].status_adocao !== 'disponivel'
      ) {
        await transacao.rollback();
        iniciada = false;

        return mostrarErro(
          res,
          409,
          'Este animal não está disponível para adoção.'
        );
      }

      // Atualizar solicitação selecionada.
      await transacao.execute(
        `UPDATE tb_interesses
         SET status = ?
         WHERE id_interesse = ?
           AND status = 'pendente'`,
        [
          status,
          idInteresse
        ]
      );

      if (status === 'aceito') {
        // Colocar animal em processo de adoção.
        await transacao.execute(
          `UPDATE tb_animais
           SET status_adocao = 'em_processo'
           WHERE id_animal = ?
             AND status_adocao = 'disponivel'`,
          [idAnimal]
        );

        // Recusar outras solicitações pendentes.
        await transacao.execute(
          `UPDATE tb_interesses
           SET status = 'recusado'
           WHERE id_animal = ?
             AND id_interesse <> ?
             AND status = 'pendente'`,
          [
            idAnimal,
            idInteresse
          ]
        );
      }

      await transacao.commit();
      iniciada = false;

      req.session.aviso = {
        tipo: 'success',
        texto: status === 'aceito'
          ? 'Solicitação aceita! O animal está em processo de adoção.'
          : 'Solicitação recusada com sucesso.'
      };

      res.redirect(303, '/solicitacoes');

    } catch (erro) {
      if (transacao && iniciada) {
        await transacao.rollback().catch(console.error);
      }

      console.error(
        'Erro ao responder solicitação:',
        erro.message
      );

      mostrarErro(
        res,
        500,
        'Erro ao responder solicitação.'
      );

    } finally {
      if (transacao) {
        transacao.release();
      }
    }
  }
);

app.get(
  '/meus-interesses',
  verificarAutenticacao,
  async (req, res) => {
    try {
      const [interesses] = await conexao.execute(
        `SELECT
           i.id_interesse,
           i.mensagem,
           i.status,
           i.data_solicitacao,
           a.id_animal,
           a.nome AS nome_animal,
           a.arquivo,
           u.nome AS responsavel,
           CASE
             WHEN i.status = 'aceito' THEN u.email
             ELSE NULL
           END AS email_responsavel
         FROM tb_interesses i
         INNER JOIN tb_animais a
           ON i.id_animal = a.id_animal
         INNER JOIN tb_usuarios u
           ON a.id_usuario = u.id_usuario
         WHERE i.id_usuario = ?
         ORDER BY
           i.data_solicitacao DESC,
           i.id_interesse DESC`,
        [req.session.usuario.id]
      );

      res.render('meusInteresses', {
        interesses
      });

    } catch (erro) {
      console.error(
        'Erro ao listar interesses:',
        erro.message
      );

      mostrarErro(
        res,
        500,
        'Erro ao carregar interesses.'
      );
    }
  }
);

app.post(
  '/animais/:id/concluir-adocao',
  verificarAutenticacao,
  verificarToken,
  async (req, res) => {
    try {
      const idAnimal = Number(req.params.id);
      const idUsuario = req.session.usuario.id;

      if (!idValido(idAnimal)) {
        return mostrarErro(
          res,
          404,
          'Animal não encontrado.'
        );
      }

      // Só permite concluir a adoção de um animal
      // em processo e pertencente ao usuário logado.
      const [resultado] = await conexao.execute(
        `UPDATE tb_animais
         SET status_adocao = 'adotado'
         WHERE id_animal = ?
           AND id_usuario = ?
           AND status_adocao = 'em_processo'`,
        [
          idAnimal,
          idUsuario
        ]
      );

      if (resultado.affectedRows === 0) {
        return mostrarErro(
          res,
          409,
          'Não foi possível concluir esta adoção.'
        );
      }

      req.session.aviso = {
        tipo: 'success',
        texto: 'Adoção concluída com sucesso! Este animal encontrou um novo lar.'
      };

      res.redirect(303, `/animais/${idAnimal}`);

    } catch (erro) {
      console.error(
        'Erro ao concluir adoção:',
        erro.message
      );

      mostrarErro(
        res,
        500,
        'Erro ao concluir adoção.'
      );
    }
  }
);

app.use((erro, req, res, next) => {
  // Erros gerados pelo Multer.
  if (erro instanceof multer.MulterError) {
    return mostrarErro(
      res,
      400,
      'Erro no upload: ' + erro.message
    );
  }

  // Formato de arquivo rejeitado.
  if (erro.message === 'Formato de imagem não permitido.') {
    return mostrarErro(
      res,
      400,
      'Formato de imagem não permitido.'
    );
  }

  console.error('Erro na requisição:', erro.message);

  mostrarErro(
    res,
    500,
    'Não foi possível concluir a operação.'
  );
});

app.listen(PORTA, () => {
  console.log(
    `Servidor rodando em http://localhost:${PORTA}`
  );
});
