/**
 * Express router providing quiz related routes
 * @module Quiz
 * @requires module:JWT-Authentification
 * @requires module:PostgreSQL
 */

//Benötigte Module
const express = require('express');
const pool = require('../components/pool');
const { authenticateToken }  = require('../components/auth.js');
//const queries = require('../components/queries.json');

/**
 * Express router to mount quiz related functions on
 * @type {object}
 * @const
 * @namespace quizRouter
 */
const router = express.Router();

/**
 * Route serving the list of available quizes
 * @name get/quiz_list
 * @async
 * @function
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object}
 * @memberof module:Quiz~quizRouter
 * @inner
 */
router.get('/api/quiz_list', authenticateToken, async (req, res)  => {
  let client;
  try {
    client = await pool.connect(); // Verbindung reservieren
    const result = await pool.query(global.queries.quiz_list);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Fehler beim Abrufen der Daten');
  } finally {
    if (client) {
      client.release(); // Verbindung freigeben
    }
  }
});

/**
 * Route serving the list of questions in the selected quiz
 * @name get/quiz
 * @async
 * @function
 * @param {String} path - Needed Structure /api/quiz?quizID=[int]&quizName=[String]
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object}
 * @memberof module:Quiz~quizRouter
 * @inner
 */
router.get('/api/quiz', authenticateToken, async (req, res)  => {
  let client;
  try {
    client = await pool.connect(); // Verbindung reservieren
    const questions = await pool.query(global.queries.question_list2, [req.query.quizID]);
    const answers = await pool.query(global.queries.answer_list3);
    res.json({
      questions: questions.rows,
      answers: answers.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Fehler beim Abrufen der Daten');
  } finally {
    if (client) {
      client.release(); // Verbindung freigeben
    }
  }
});

/**
 * Route serving the right answer to a question
 * @name get/answer
 * @async
 * @function
 * @param {String} path - Needed Structure /api/quiz?quizID=[int]&quizName=[String]&questionID=[int]
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object}
 * @memberof module:Quiz~quizRouter
 * @inner
 */
router.post('/api/answer', authenticateToken, async (req, res) => {
  const { question, answer } = req.body;
  let client;
  try {
    client = await pool.connect(); // Verbindung reservieren
    const result = await pool.query(global.queries.answer_valid2, [question, answer]);
    res.json(result.rows[0].valid);
  } catch (err) {
    console.error(err);
    res.status(500).send('Fehler beim Abrufen der Daten');
  } finally {
    if (client) {
      client.release(); // Verbindung freigeben
    }
  }
});

router.post('/api/create', authenticateToken, async (req, res) => {
  const { quiz_name, question, answers } = req.body

  try{
    await pool.query('BEGIN')
    const result = await pool.query(global.queries.get_quiz_id, [quiz_name]);

    const quiz_id = result.rows[0].quiz_id;
    console.log(quiz_id);

    const result2 = await pool.query(global.queries.save_question_return_id, [question, quiz_id]);
    const question_id = result2.rows[0].question_id;
    console.log(question_id);

    for (const ans of answers){
      await pool.query(global.queries.save_answers, [question_id, ans.answer, ans.valid])
    }

    await pool.query('COMMIT')
    console.log('Saved:', question_id);
    return res.status(201).json({
      success: true,
      question_id: question_id,
      message: 'Frage erfolgreich gespeichert!'
    })
  }catch(err){
    console.error(err);
  }
})

module.exports = router;