const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const connection = require('./db');
const path = require('path');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;

app.use(cookieParser());
app.use(cors({
  origin: true, 
  credentials: true 
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

const JWT_SECRET = 'esto-es-una-contraseña-segura';
const intentosLogin = {};

function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Acceso denegado' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (!roles.includes(req.user.rol)) return res.status(403).json({ error: 'No autorizado' });
    next();
  };
}

app.post('/api/usuarios', authenticateToken, requireRole('admin'), async (req, res) => {
  const { usuario, password, rol } = req.body;
  if (!usuario || !password || !rol) return res.status(400).json({ error: 'Faltan datos' });

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    connection.query(
      'INSERT INTO usuarios (usuario, password, rol) VALUES (?, ?, ?)',
      [usuario, hashedPassword, rol],
      (err) => {
        if (err) return res.status(500).json({ error: 'Error al registrar' });
        res.json({ mensaje: 'Usuario registrado con éxito' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/login', (req, res) => {
  const { usuario, password } = req.body;

  if (intentosLogin[usuario] && intentosLogin[usuario].intentos >= 3) {
    const tiempoBloqueo = 60 * 1000;
    const transcurrido = Date.now() - intentosLogin[usuario].ultimoIntento;

    if (transcurrido < tiempoBloqueo) {
      const faltan = Math.ceil((tiempoBloqueo - transcurrido) / 1000);
      return res.status(429).json({ error: `Demasiados intentos. Bloqueado por ${faltan} segundos.` });
    } else {
      delete intentosLogin[usuario];
    }
  }

  connection.query(
    'SELECT id, usuario, password, rol FROM usuarios WHERE usuario = ?',
    [usuario],
    async (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error en BD' });
      if (rows.length === 0) return res.status(401).json({ error: 'Credenciales inválidas' });

      const u = rows[0];
      const esValida = await bcrypt.compare(password, u.password);

      if (!esValida) {
        if (!intentosLogin[usuario]) {
          intentosLogin[usuario] = { intentos: 1, ultimoIntento: Date.now() };
        } else {
          intentosLogin[usuario].intentos++;
          intentosLogin[usuario].ultimoIntento = Date.now();
        }
        const restantes = 3 - intentosLogin[usuario].intentos;
        return res.status(401).json({ 
          error: restantes > 0 ? `Credenciales inválidas. Intentos restantes: ${restantes}` : 'Cuenta bloqueada temporalmente.' 
        });
      }

      delete intentosLogin[usuario];

      const token = jwt.sign(
        { id: u.id, usuario: u.usuario, rol: u.rol },
        JWT_SECRET,
        { expiresIn: '2h' }
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        maxAge: 7200000,
        sameSite: 'lax'
      });

      res.json({ usuario: u.usuario, rol: u.rol });
    }
  );
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ mensaje: 'Sesión cerrada' });
});

app.get('/api/proyectos', authenticateToken, requireRole('admin', 'invitado'), (req, res) => {
  const query = `
    SELECT proyectos.*, responsables.nombre AS responsable_nombre 
    FROM proyectos 
    LEFT JOIN responsables ON proyectos.responsable = responsables.id 
    ORDER BY proyectos.fecha DESC`;
  
  connection.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener proyectos' });
    res.json(results);
  });
});

app.post('/api/proyectos', authenticateToken, requireRole('admin'), (req, res) => {
  const { nombre, descripcion, fecha, prioridad, responsable } = req.body;
  if (!nombre || !fecha || !prioridad || !responsable) return res.status(400).json({ error: 'Faltan datos' });
  
  const query = 'INSERT INTO proyectos (nombre, descripcion, fecha, prioridad, responsable) VALUES (?, ?, ?, ?,?)';
  connection.query(query, [nombre, descripcion, fecha, prioridad, responsable], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al crear proyecto' });
    res.json({ mensaje: 'Proyecto creado', id: result.insertId });
  });
});

app.put('/api/proyectos/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, fecha, prioridad, responsable } = req.body;
  const query = 'UPDATE proyectos SET nombre=?, descripcion=?, fecha=?, prioridad=?, responsable=? WHERE id=?';
  connection.query(query, [nombre, descripcion, fecha, prioridad, responsable, id], (err) => {
    if (err) return res.status(500).json({ error: 'Error al actualizar' });
    res.json({ mensaje: 'Proyecto actualizado' });
  });
});

app.delete('/api/proyectos/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  connection.query('DELETE FROM proyectos WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: 'Error al eliminar' });
    res.json({ mensaje: 'Proyecto eliminado' });
  });
});

app.get('/api/responsables', authenticateToken, (req, res) => {
  connection.query('SELECT id, nombre, puesto FROM responsables', (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener responsables' });
    res.json(results);
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'portada.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});