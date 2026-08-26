const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Servir archivos estáticos del build de Vite
app.use(express.static(path.join(__dirname, 'dist')));

// Para React Router — todas las rutas apuntan al index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Dashboard corriendo en puerto ${PORT}`);
});
