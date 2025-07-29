import express from 'express';
import cors from 'cors';
import path from 'path';
import './database';

import translationsRouter from './api/translations';
import historyRouter from './api/history';

const app = express();

app.use('/api/translations', translationsRouter);
app.use('/api/history', historyRouter);
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
