
const crypto = require('crypto');
const fs = require('fs/promises');

function gerarToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  res.locals.csrfToken = req.session.csrfToken;
  next();
}

async function verificarToken(req, res, next) {
  const tokenRecebido = req.body?._csrf;
  const tokenSessao = req.session.csrfToken;

  let tokenValido = false;

  if (
    typeof tokenRecebido === 'string' &&
    typeof tokenSessao === 'string'
  ) {
    const recebido = Buffer.from(tokenRecebido, 'utf8');
    const esperado = Buffer.from(tokenSessao, 'utf8');

    tokenValido =
      recebido.length === esperado.length &&
      crypto.timingSafeEqual(recebido, esperado);
  }

  if (!tokenValido) {
    // Se o Multer já recebeu um arquivo, removê-lo
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (erro) {
        console.error(
          'Erro ao remover upload rejeitado:',
          erro.message
        );
      }
    }

    return res.status(403).render('erro', {
      mensagem: 'Sua sessão de segurança é inválida ou expirou. Atualize a página e tente novamente.'
    });
  }

  next();
}

module.exports = {
  gerarToken,
  verificarToken
};
