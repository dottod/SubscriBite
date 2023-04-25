const express = require('express');
const app = express();
const mysql = require('mysql');
var session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create MySQL connection pool
const pool = mysql.createPool({
    host: '18.236.171.164',
    user: 'root',
    password: 'subscribed',
    database: 'subscribite',
    port: 3306
});


// setting up session middleware
const sessionStore = new MySQLStore({
    expiration: 86400000,
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
}, pool);

app.use(session({
    store: sessionStore,
    secret: 'subscribiteSecretKey',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // set to true for HTTPS
}));


app.get('/', (req, res) => {
    res.status(201).send({ val: 'Services started' });
});

app.post('/', (req, res) => {
    res.status(201).send({ val: 'Initialization of SubscriBite' });

});

app.post('/login', (req, res) => {
    const phone = req.body.phone_number;

    pool.query('SELECT * FROM users WHERE phone_number = ?', [phone], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal server error');
        } else {
            if (result.length === 0) {
                res.status(403).send('Phone number is invalid');
            } else {
                // set session data for the user
                req.session.userId = result[0].id;
                req.session.phone = result[0].phone_number;
                req.session.location = result[0].loc_id;
                console.log(req.session);
                res.status(200).send('Log in successful');
            }
        }
    });
});

app.post('/register', (req, res) => {
    const { firstname, lastname, phone_number, loc_id } = req.body;
    console.log(firstname,lastname,phone_number)
    pool.query('INSERT INTO `users` (`firstname`, `lastname`, `phone_number`, `loc_id`) VALUES (?, ?, ?, ?)', [firstname, lastname, phone_number, loc_id], function (err, result) {

        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(409).send('Phone number is already registered');
            } else {
                console.log('An error occured.')
                res.status(500).send(err.toString());
            }
        }
        else {
            req.session.userId = result.insertId;
            req.session.phone = phone_number;
            req.session.location = loc_id;
            console.log(req.session);
            res.status(201).send('User successfully created');
        }
    });
});

app.listen(4000, () => {
    console.log('Acception connection at Port Number, 4000');
});
