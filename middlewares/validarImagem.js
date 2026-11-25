
const fs = require('fs/promises');
const path = require('path');

async function validarImagem(req, res, next) {
  // Alguns formulários permitem manter a imagem anterior
  if (!req.file) {
    return next();
  }

  try {
    const arquivo = await fs.open(req.file.path, 'r');

    let bytes;

    try {
      const buffer = Buffer.alloc(12);
      const { bytesRead } = await arquivo.read(buffer, 0, 12, 0);
      bytes = buffer.subarray(0, bytesRead);
    } finally {
      await arquivo.close();
    }

    const extensao = path.extname(req.file.filename).toLowerCase();

    // Assinatura JPEG: FF D8 FF
    const jpeg =
      bytes.length >= 3 &&
      bytes.subarray(0, 3).equals(
        Buffer.from([0xFF, 0xD8, 0xFF])
      );

    // Assinatura PNG
    const png =
      bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
      );

    // Assinatura WebP: RIFF .... WEBP
    const webp =
      bytes.length >= 12 &&
      bytes.toString('ascii', 0, 4) === 'RIFF' &&
      bytes.toString('ascii', 8, 12) === 'WEBP';

    const formatoValido =
      (jpeg && ['.jpg', '.jpeg'].includes(extensao)) ||
      (png && extensao === '.png') ||
      (webp && extensao === '.webp');

    if (!formatoValido) {
      await fs.unlink(req.file.path);

      return res.status(400).render('erro', {
        mensagem: 'Arquivo inválido. Envie uma imagem JPG, PNG ou WebP.'
      });
    }

    next();

  } catch (erro) {
    console.error('Erro ao validar imagem:', erro.message);

    await fs.unlink(req.file.path).catch(console.error);

    return res.status(500).render('erro', {
      mensagem: 'Não foi possível validar a imagem. Tente novamente.'
    });

  }
}

module.exports = validarImagem;
