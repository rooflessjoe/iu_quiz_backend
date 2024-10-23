//QUIZ APIs für die Abfrage und das hinzufügen von neuen Fragen

const quiz = express();

quiz.use(cors({ origin: 'https://rooflessjoe.github.io' }));

quiz.get('/api/quiz_abrufen', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM quiz');  // Hier muss noch festgelegt werden, dass nur das abgefragte Quiz geladen wird!!!
      res.json(result.rows);  // Rückgabe der Daten als JSON
    } catch (err) {
      console.error(err);
      res.status(500).send('Fehler beim Abrufen der Daten'); //Catch eines Fehlers beim Abruf der Daten
    }
  });

quiz.post('/api/quiz_erstellen', async (req, res) => {
    const { frage, antwort } = req.body;

    // SQL-Query zum Einfügen eines neuen Users
    const query = 'INSERT INTO quiz (frage, antwort) VALUES ($1, $2) RETURNING *';

    try {
        const result = await pool.query(query, [frage, antwort]);
        res.status(201).json({
            message: 'Neue Quiz Frage erfolgreich hinzugefügt',
            user: result.rows[0],  // Der neu eingefügte User wird zurückgegeben
        });
    } catch (error) {
        console.error('Fehler beim Hinzufügen der neuen Quiz Frage', error);

        // Überprüfe, ob der Fehler auf einen bereits existierenden User (z.B. gleiche E-Mail) hinweist
        if (error.code === '23505') {
            res.status(409).json({ message: 'Quiz Frage bereits vorhanden' });
        } else {
            res.status(500).json({ message: 'Serverfehler' });
        }
    }
});