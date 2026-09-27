const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static uploaded files (candidate photos, party symbols)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic test route
app.get('/', (req, res) => {
  res.json({ message: 'Online Voting System API is running!' });
});

// Step 5: Test Route
app.get('/api/test', (req, res) => {
  res.json({ status: 'success', message: 'Backend server is running and ready!' });
});

// Step 6: Connect Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/elections', require('./routes/electionRoutes'));
app.use('/api/candidates', require('./routes/candidateRoutes'));
app.use('/api/votes', require('./routes/voteRoutes'));
app.use('/api/results', require('./routes/resultRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));

// Start Server only after testing MySQL Database connection
const startServer = async () => {
  try {
    const connection = await db.getConnection();
    console.log('Connected to MySQL Database successfully.');
    connection.release();

    const server = app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n======================================================`);
        console.error(`Port ${PORT} is already in use. Please stop the existing backend server before starting another instance.`);
        console.error(`======================================================\n`);
        process.exit(1);
      } else {
        console.error('Server error:', err.message);
        process.exit(1);
      }
    });
  } catch (dbError) {
    console.error(`\n======================================================`);
    console.error(`MySQL Database Connection Failed: ${dbError.message}`);
    console.error(`Please check if your database credentials are correct in the .env file`);
    console.error(`and that your MySQL Server is running.`);
    console.error(`======================================================\n`);
    process.exit(1);
  }
};

startServer();
