const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const { garantirSeedInicial } = require('./database/seed');
const swaggerDocument = require('./swagger');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const professorRoutes = require('./routes/professorRoutes');
const responsavelRoutes = require('./routes/responsavelRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Garante banco SQLite inicializado e populado com dados de demonstração
garantirSeedInicial(false);

// Documentação OpenAPI / Swagger
app.get('/api/openapi.json', (_req, res) => res.json(swaggerDocument));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    sistema: 'EduLL-Kfka - Acompanhamento Acadêmico Bimestral (Ensino Fundamental)',
    timestamp: new Date().toISOString(),
  });
});

// Rotas dos 3 Módulos e Autenticação
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/professor', professorRoutes);
app.use('/api/responsavel', responsavelRoutes);

// Servir Frontend React (build de produção em frontend/dist se existir)
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================================`);
    console.log(`EduLL-Kfka Backend + Portal Web rodando em: http://localhost:${PORT}`);
    console.log(`Documentação Interativa OpenAPI/Swagger:    http://localhost:${PORT}/api/docs`);
    console.log(`====================================================================`);
  });
}

module.exports = app;
