const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));

// Armazenamento em memória (em produção use um banco de dados)
let salas = [
    {
        id: 'sala1',
        nome: 'Chat Geral Anônimo',
        usuarios: 15,
        preview: 'Bem-vindo ao chat geral anônimo!',
        tempoAutoDestruicao: 0, // 0 significa infinito
        criador: null,
        fixa: true,
        mensagens: [
            {
                id: 'm1',
                remetente: 'Sistema',
                texto: 'Bem-vindo ao Chat Geral Anônimo. Esta sala tem tempo de destruição infinito. As mensagens aqui persistem para sempre.',
                tempo: new Date().toISOString(),
                sistema: true
            }
        ]
    },
    {
        id: 'sala2',
        nome: 'Discussões Livres',
        usuarios: 23,
        preview: 'Converse sobre qualquer coisa aqui...',
        tempoAutoDestruicao: 60, // 1 hora em minutos
        criador: null,
        fixa: false,
        mensagens: [
            {
                id: 'm1',
                remetente: 'Anônimo',
                texto: 'Alguém quer conversar sobre algo interessante?',
                tempo: new Date().toISOString()
            }
        ]
    },
    {
        id: 'sala3',
        nome: 'Confissões Anônimas',
        usuarios: 47,
        preview: 'Compartilhe seus segredos anonimamente...',
        tempoAutoDestruicao: 60, // 1 hora
        criador: null,
        fixa: false,
        mensagens: [
            {
                id: 'm1',
                remetente: 'Anônimo',
                texto: 'Às vezes é bom conversar com estranhos...',
                tempo: new Date().toISOString()
            }
        ]
    }
];

let salasUsuario = {};
let usuariosOnline = 28;

// Gerar ID único
function gerarIdUnico() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Gerar apelido aleatório
function gerarApelidoAleatorio() {
    const adjetivos = ['Misterioso', 'Silencioso', 'Oculto', 'Desconhecido', 'Anônimo', 'Secreto', 'Sombrio', 'Fantasma'];
    const substantivos = ['Estranho', 'Observador', 'Viajante', 'Visitante', 'Andarilho', 'Espectador', 'Fantasma', 'Entidade'];
    const adjetivoAleatorio = adjetivos[Math.floor(Math.random() * adjetivos.length)];
    const substantivoAleatorio = substantivos[Math.floor(Math.random() * substantivos.length)];
    const numeroAleatorio = Math.floor(Math.random() * 9000) + 1000;
    return `${adjetivoAleatorio}${substantivoAleatorio}${numeroAleatorio}`;
}

// Gerar nome aleatório para sala
function gerarNomeSalaAleatorio() {
    const prefixos = ['Privada', 'Secreta', 'Anônima', 'Oculta', 'Segura', 'Criptografada', 'Fantasma', 'Silenciosa'];
    const sufixos = ['Sala', 'Espaço', 'Lugar', 'Canal', 'Central', 'Zona', 'Canto', 'Lounge'];
    const prefixoAleatorio = prefixos[Math.floor(Math.random() * prefixos.length)];
    const sufixoAleatorio = sufixos[Math.floor(Math.random() * sufixos.length)];
    const idAleatorio = Math.floor(Math.random() * 9000) + 1000;
    return `${prefixoAleatorio} ${sufixoAleatorio} ${idAleatorio}`;
}

// Formatar tempo de auto-destruição
function formatarTempoAutoDestruicao(minutos) {
    if (minutos === 0) return 'infinito';
    if (minutos < 1) return `${Math.round(minutos * 60)} segundos`;
    if (minutos < 60) return `${minutos} minuto${minutos !== 1 ? 's' : ''}`;
    if (minutos < 1440) return `${Math.round(minutos / 60)} hora${Math.round(minutos / 60) !== 1 ? 's' : ''}`;
    return `${Math.round(minutos / 1440)} dia${Math.round(minutos / 1440) !== 1 ? 's' : ''}`;
}

// Rota principal - servir o arquivo HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API - Listar salas
app.get('/api/salas', (req, res) => {
    res.json({
        sucesso: true,
        salas: salas,
        usuariosOnline: usuariosOnline
    });
});

// API - Obter mensagens de uma sala
app.get('/api/salas/:id/mensagens', (req, res) => {
    const sala = salas.find(s => s.id === req.params.id);
    if (!sala) {
        return res.status(404).json({ 
            sucesso: false, 
            erro: 'Sala não encontrada' 
        });
    }
    res.json({
        sucesso: true,
        mensagens: sala.mensagens
    });
});

// API - Enviar mensagem
app.post('/api/salas/:id/mensagens', (req, res) => {
    const { remetente, texto } = req.body;
    const sala = salas.find(s => s.id === req.params.id);
    
    if (!sala) {
        return res.status(404).json({ 
            sucesso: false, 
            erro: 'Sala não encontrada' 
        });
    }

    if (!texto || texto.trim() === '') {
        return res.status(400).json({ 
            sucesso: false, 
            erro: 'Texto da mensagem não pode estar vazio' 
        });
    }

    const mensagem = {
        id: 'msg_' + Date.now(),
        remetente: remetente || 'Anônimo',
        texto: texto.trim(),
        tempo: new Date().toISOString()
    };

    sala.mensagens.push(mensagem);
    sala.preview = mensagem.texto.length > 50 ? 
        mensagem.texto.substring(0, 50) + '...' : 
        mensagem.texto;

    // Simular resposta automática ocasionalmente
    if (Math.random() < 0.3) { // 30% de chance
        setTimeout(() => {
            const respostas = [
                "Interessante...",
                "Concordo com você",
                "Nunca pensei nisso",
                "Hmm, entendo",
                "Você tem um ponto",
                "Isso é verdade",
                "Por favor continue",
                "Gosto do que você disse",
                "Conte-me mais",
                "Isso é fascinante"
            ];
            const usuariosFalsos = ['Anônimo', 'Estranho', 'Alguém', 'Desconhecido', 'UsuárioMisterioso'];
            
            const respostaAutomatica = {
                id: 'msg_' + Date.now(),
                remetente: usuariosFalsos[Math.floor(Math.random() * usuariosFalsos.length)],
                texto: respostas[Math.floor(Math.random() * respostas.length)],
                tempo: new Date().toISOString()
            };
            
            const salaAtual = salas.find(s => s.id === req.params.id);
            if (salaAtual) {
                salaAtual.mensagens.push(respostaAutomatica);
            }
        }, 2000 + Math.random() * 5000);
    }

    res.json({
        sucesso: true,
        mensagem: mensagem
    });
});

// API - Criar nova sala
app.post('/api/salas', (req, res) => {
    const { nome, tempoAutoDestruicao, criador } = req.body;
    
    if (!nome || nome.trim() === '') {
        return res.status(400).json({ 
            sucesso: false, 
            erro: 'Nome da sala não pode estar vazio' 
        });
    }

    const novaSala = {
        id: 'sala_' + Date.now(),
        nome: nome.trim(),
        usuarios: 1,
        preview: 'Nova sala criada. Seja o primeiro a enviar uma mensagem!',
        tempoAutoDestruicao: tempoAutoDestruicao || 360, // Padrão 6 horas
        criador: criador || 'Anônimo',
        fixa: false,
        mensagens: [
            {
                id: 'msg_1',
                remetente: 'Sistema',
                texto: `Sala criada. ${tempoAutoDestruicao === 0 ? 
                    'Esta sala tem tempo de destruição infinito.' : 
                    `Esta sala será automaticamente deletada após ${formatarTempoAutoDestruicao(tempoAutoDestruicao)} de inatividade.`
                }`,
                tempo: new Date().toISOString(),
                sistema: true
            }
        ]
    };

    salas.unshift(novaSala);
    
    if (criador) {
        salasUsuario[criador] = novaSala.id;
    }

    res.json({
        sucesso: true,
        sala: novaSala
    });
});

// API - Deletar sala
app.delete('/api/salas/:id', (req, res) => {
    const { criador } = req.body;
    const sala = salas.find(s => s.id === req.params.id);

    if (!sala) {
        return res.status(404).json({ 
            sucesso: false, 
            erro: 'Sala não encontrada' 
        });
    }

    if (sala.fixa) {
        return res.status(403).json({ 
            sucesso: false, 
            erro: 'Não é possível deletar salas oficiais' 
        });
    }

    if (sala.criador !== criador) {
        return res.status(403).json({ 
            sucesso: false, 
            erro: 'Apenas o criador pode deletar esta sala' 
        });
    }

    salas = salas.filter(s => s.id !== req.params.id);
    delete salasUsuario[criador];

    res.json({
        sucesso: true,
        mensagem: 'Sala deletada com sucesso'
    });
});

// API - Health check
app.get('/api/health', (req, res) => {
    res.json({
        sucesso: true,
        mensagem: 'Servidor funcionando corretamente',
        timestamp: new Date().toISOString(),
        salasAtivas: salas.length,
        usuariosOnline: usuariosOnline
    });
});

// API - Gerar apelido
app.get('/api/gerar-apelido', (req, res) => {
    res.json({
        sucesso: true,
        apelido: gerarApelidoAleatorio()
    });
});

// API - Gerar nome de sala
app.get('/api/gerar-nome-sala', (req, res) => {
    res.json({
        sucesso: true,
        nomeSala: gerarNomeSalaAleatorio()
    });
});

// Limpeza de salas expiradas
setInterval(() => {
    const agora = Date.now();
    salas = salas.filter(sala => {
        if (sala.fixa || sala.tempoAutoDestruicao === 0) return true;

        const ultimaMensagem = sala.mensagens[sala.mensagens.length - 1];
        if (!ultimaMensagem) return true;

        const ultimaAtividade = new Date(ultimaMensagem.tempo).getTime();
        const tempoExpiracao = ultimaAtividade + (sala.tempoAutoDestruicao * 60 * 1000);

        return agora < tempoExpiracao;
    });
}, 60000); // Verificar a cada minuto

// Atualizar contagem de usuários online
setInterval(() => {
    const variacao = Math.floor(Math.random() * 7) - 3; // -3 a +3
    usuariosOnline = Math.max(10, 28 + variacao);
}, 30000);

// Inicializar servidor
const PORTA = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORTA, () => {
        console.log(`🚀 Servidor AnonChat rodando na porta ${PORTA}`);
        console.log(`📧 Ambiente: ${process.env.NODE_ENV || 'desenvolvimento'}`);
        console.log(`👥 Usuários online simulados: ${usuariosOnline}`);
        console.log(`💬 Salas ativas: ${salas.length}`);
    });
}

module.exports = app;