-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 13/11/2026 às 12:56
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `adotapet`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `tb_animais`
--

CREATE TABLE `tb_animais` (
  `id_animal` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `nome` varchar(100) NOT NULL,
  `especie` varchar(50) NOT NULL,
  `idade` int(11) NOT NULL,
  `descricao` text DEFAULT NULL,
  `arquivo` varchar(255) NOT NULL,
  `data_cadastro` timestamp NOT NULL DEFAULT current_timestamp(),
  `status_adocao` enum('disponivel','em_processo','adotado') NOT NULL DEFAULT 'disponivel'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `tb_animais`
--

INSERT INTO `tb_animais` (`id_animal`, `id_usuario`, `nome`, `especie`, `idade`, `descricao`, `arquivo`, `data_cadastro`, `status_adocao`) VALUES
(9, 5, 'Tigresa', 'Gato', 0, 'A Tigresa é uma pequena exploradora cheia de charme e curiosidade. Ama caçar bolinhas de papel, escalar o sofá e, depois de gastar toda a bateria, capotar fazendo muito barulho de motorzinho no seu colo.\r\nJá sabe usar a caixinha de areia direitinho e se adapta muito bem a outros gatos. Como é filhote, precisa de um lar totalmente telado e seguro para crescer feliz e protegida.', '84159e22-9ace-4ce0-bee2-0b8099161241.jpg', '2026-11-13 03:11:39', 'disponivel'),
(10, 5, 'Bob', 'Cachorro', 4, 'O Bob é a definição perfeita de alegria e companheirismo. Com 4 anos, ele tem o equilíbrio ideal: adora brincar no parque e correr atrás de bolinhas, mas também sabe a hora de ficar quietinho deitado ao seu lado no fim do dia.\r\nÉ extremamente dócil, inteligente e faz amizade rápido com todo mundo, incluindo crianças e outros cães. Já está acostumado a passear na coleira e se adapta super bem tanto a casas quanto a apartamentos.', '0d6f0374-8ce6-46d7-a987-d7a1f92481c1.png', '2026-11-13 03:30:01', 'disponivel'),
(12, 6, 'Mel', 'Cachorro', 10, 'Após anos enfrentando as dificuldades das ruas, a Mel finalmente está segura e só sonha com uma caminha macia para chamar de sua. Aos 10 anos, ela é uma senhorinha extremamente doce, serena e grata por cada pequeno gesto de carinho.\r\nNão precisa de grandes agitações: seu programa favorito é tirar longos cochilos ao sol, fazer passeios curtos e bem tranquilos e ficar pertinho de quem cuida dela. Convive pacificamente com outros animais calmos e se adapta a qualquer ambiente acolhedor.', '0d2ff500-1642-41d2-bebb-7a97b896e840.jpg', '2026-11-13 03:38:34', 'disponivel'),
(13, 6, 'Luna', 'Cachorro', 5, 'A Luna é uma cachorrinha doce, alegre e super companheira. Comportada, adora passeios tranquilos e ama ficar pertinho ganhando carinho. Se dá bem com crianças e outros pets, adaptando-se fácil a casas ou apartamentos.', '9407b366-4686-4733-9478-40c9cc53354e.jpg', '2026-11-13 03:40:01', 'disponivel'),
(14, 6, 'Fera', 'Cachorro', 7, 'Não se deixe enganar pelo nome e pelo porte musculoso: o Fera é um verdadeiro bebê gigante que acha que cabe no colo. Aos 7 anos, ele tem uma energia tranquila e equilibrada, amando passeios calmos, brinquedos de roer e muito cafuné na barriga.\r\nÉ extremamente leal, obediente e amoroso com pessoas. Por ter muita força e personalidade, procura um tutor experiente que possa ser seu único pet da casa, garantindo passeios seguros com guia e peitoral adequados.', 'b8a1cb66-9ea8-41c9-81f3-fb68367a0d98.jpg', '2026-11-13 03:51:43', 'disponivel');

-- --------------------------------------------------------

--
-- Estrutura para tabela `tb_interesses`
--

CREATE TABLE `tb_interesses` (
  `id_interesse` int(11) NOT NULL,
  `id_animal` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `mensagem` text DEFAULT NULL,
  `status` enum('pendente','aceito','recusado') NOT NULL DEFAULT 'pendente',
  `data_solicitacao` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `tb_interesses`
--

INSERT INTO `tb_interesses` (`id_interesse`, `id_animal`, `id_usuario`, `mensagem`, `status`, `data_solicitacao`) VALUES
(8, 10, 6, 'Olá, tenho interesse.', 'recusado', '2026-11-13 03:58:03');

-- --------------------------------------------------------

--
-- Estrutura para tabela `tb_usuarios`
--

CREATE TABLE `tb_usuarios` (
  `id_usuario` int(11) NOT NULL,
  `nome` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `senha_hash` varchar(255) NOT NULL,
  `foto_perfil` varchar(255) NOT NULL,
  `data_cadastro` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `tb_usuarios`
--

INSERT INTO `tb_usuarios` (`id_usuario`, `nome`, `email`, `senha_hash`, `foto_perfil`, `data_cadastro`) VALUES
(5, 'Levi Silva', 'levi@teste.com', '$2b$10$u9Lf5rgKrtLIr/x1hBydFOsVwFKT3Vm52UqDEU5wh3JuCVAhqv0vy', 'be43d67d-d37b-44c3-8662-2a7ba6068a34.png', '2026-11-13 03:06:56'),
(6, 'Juliana', 'juliana@teste.com', '$2b$10$Ckw63F2//OD//n9KIUOYd.Xe.7Dc4H0EYnP3.clMiYPdNS5eCt/Xm', 'afedbed9-868e-4bdf-8685-9f2d7ad22ccc.png', '2026-11-13 03:34:40');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `tb_animais`
--
ALTER TABLE `tb_animais`
  ADD PRIMARY KEY (`id_animal`),
  ADD KEY `fk_animal_usuario` (`id_usuario`);

--
-- Índices de tabela `tb_interesses`
--
ALTER TABLE `tb_interesses`
  ADD PRIMARY KEY (`id_interesse`),
  ADD UNIQUE KEY `uq_interesse_animal_usuario` (`id_animal`,`id_usuario`),
  ADD KEY `fk_interesse_usuario` (`id_usuario`);

--
-- Índices de tabela `tb_usuarios`
--
ALTER TABLE `tb_usuarios`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `tb_animais`
--
ALTER TABLE `tb_animais`
  MODIFY `id_animal` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de tabela `tb_interesses`
--
ALTER TABLE `tb_interesses`
  MODIFY `id_interesse` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de tabela `tb_usuarios`
--
ALTER TABLE `tb_usuarios`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `tb_animais`
--
ALTER TABLE `tb_animais`
  ADD CONSTRAINT `fk_animal_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `tb_usuarios` (`id_usuario`);

--
-- Restrições para tabelas `tb_interesses`
--
ALTER TABLE `tb_interesses`
  ADD CONSTRAINT `fk_interesse_animal` FOREIGN KEY (`id_animal`) REFERENCES `tb_animais` (`id_animal`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_interesse_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `tb_usuarios` (`id_usuario`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
