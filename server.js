const express = require('express');
const path = require('path');
const { router } = require('./src/api');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', router);

app.listen(PORT, () => {
  console.log(`\n  🔥 FB Warmer Dashboard rodando em http://localhost:${PORT}\n`);
});
