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
    const { firstname, lastname, phone_number, loc_id, user_id } = req.body;
    console.log(firstname, lastname, phone_number)
    pool.query('INSERT INTO `users` (`firstname`, `lastname`, `phone_number`, `loc_id`,`id`,`valid_user`) VALUES (?, ?, ?, ?, ?,0)', [firstname, lastname, phone_number, loc_id, user_id], function (err, result) {

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
app.post('/makeValid', (req, res) => {
    const { user_id } = req.body;
    pool.query('Update `users` SET valid_user = 1 WHERE id = ? ', [user_id], function (err, result) {
        if (err) {
            if (err.code === 'ER_EMPTY_QUERY') {
                res.status(409).send('User does not exist');
            } else {
                console.log('An error occured.')
                res.status(500).send(err.toString());
            }
        } else {
            console.log(result);
            console.log(result.affectedRows);
            if (result.length === 0 || result.affectedRows === 0) {
                res.status(403).send('User id is invalid');
            }
            else if (result.changedRows)
                res.status(201).send('User is Validated');
            else
                res.status(201).send('No changes were made');
        }
    });
});
app.post('/isRegistered', (req, res) => {
    const { user_id } = req.body;
    pool.query('SELECT valid_user FROM users WHERE id = ?', [user_id], function (err, result) {
        if (err) {
            console.log('An error occured.')
            res.status(500).send(err.toString());
        } else {
            console.log(result);
            console.log(result.changedRows);
            if (result.length === 0 || result[0].valid_user === null) {
                res.status(403).send('User id is not invalid');
            }
            else if (result[0].valid_user == 1) {
                res.status(201).send('User is Registered');
            }
            else {
                res.status(201).send('User is not Registered');
            }
        }
    });
});
//Get all product Categories
app.get('/categories', (req, res) => {
    const { postal_code } = req.query;
    pool.query('SELECT DISTINCT category FROM vw_product_geo_avail WHERE postal_code = ? AND stock_avail > ?', [postal_code, 0], (err, result) => {
        if (err) {
            console.log('An error occurred.');
            res.status(500).send(err.toString());
        } else {
            const categories = result.map(obj => obj.category);
            console.log(categories);
            res.status(201);
            res.send(JSON.stringify(categories));
        }
    });
});
//Get all products
app.get('/products', (req, res) => {
    const { category, postal_code } = req.query;

    pool.query('SELECT * FROM vw_product_geo_avail WHERE postal_code = ? AND category = ? AND stock_avail > ? ', [postal_code, category, 0], (err, result) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.status(409).send('Category is not present');
            } else {
                console.log('An error occurred.');
                res.status(500).send(err.toString());
            }
        } else {
            console.log(result);
            const products = result.map(row => {
                return {
                    id: row.id,
                    name: row.name,
                    category: row.category,
                    price: row.price,
                    description: row.description,
                    img_url: row.img_url,
                    created_datetime: row.created_datetime
                };
            });
            res.status(200).json(products);
        }
    });
});
// Get product desription
app.get('/productDescription', (req, res) => {
    const { id } = req.query;
    pool.query('SELECT * FROM products WHERE id = ?', [id], (err, result) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.status(409).send('Product is not present');
            } else {
                console.log('An error occurred.');
                res.status(500).send(err.toString());
            }
        } else {
            const product = result.map(row => {
                return {
                    id: row.id,
                    name: row.name,
                    category: row.category,
                    price: row.price,
                    description: row.description,
                    img_url: row.img_url,
                    created_datetime: row.created_datetime
                };
            });
            res.status(200).json(product);
            // have to check if product id not present error would come or should i just add a check here for size of rows?
        }
    });
});


// get subscriptions:
app.get('/subscriptions/getSubscriptions', (req, res) => {
    const { userId, slot } = req.body;
    pool.query('select item_id,user_id,sub_start_date,sub_end_date,freq,quantity,slot from subscriptions where is_active=1 and user_id = ?', [userId], function (err, result) {

        if (err) {
            if (err.code === 'ENOENT') {
                res.status(409).send('No subscriptions found!');
            } else {
                console.log('An error occured.')
                res.status(500).send(err.toString());
            }
        }
        else {
            res.status(201).send(JSON.stringify(result.rows));
        }
    });
});

app.post('/subscriptions/subscribe', (req, res) => {
    const { user_id, slot, sub_start_date, sub_end_date, freq, quantity, item_id } = req.body;
    pool.query('INSERT INTO `subscriptions` (`user_id`, `item_id`, `sub_start_date`, `sub_end_date`,`freq`,`quantity`,`slot`,`is_active` ) VALUES (?, ?, ?, ?,?, ?, ?, 1) ON DUPLICATE KEY UPDATE sub_end_date= VALUES(sub_end_date),quantity = VALUES(quantity),freq = VALUES(freq) ', [user_id, item_id, sub_start_date, sub_end_date, freq, quantity, slot], function (err, result) {

        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(409).send('A subscription for same Item and Slot already exist, update the subscription slot!');
            } else {
                console.log('An error occured.')
                res.status(500).send(err.toString());
            }
        }
        else {
            res.status(201).send('Subscription added/updated successfuly.');
        }
    });
});


app.get('/subscriptions/upcoming_orders', (req, res) => {
    const { userId, slot } = req.body;

    pool.query('select * from vw_upcoming_orders where user_id = ?', [userId], function (err, result) {
        if (err) {
            if (err.code === 'ENOENT') {
                res.status(409).send('No subscriptions found!');
            }else
            {
                console.log('An error occured.')
                res.status(500).send(err.toString());
            }
        }
        else {
            let finalRes = {}
            for(let i in result){
                val = result[i]
                if (finalRes[val.delivery_date]){
                    finalRes[val.delivery_date.toISOString().substring(0,10)].push(val)
                }else{
                    finalRes[val.delivery_date.toISOString().substring(0,10)]=[val]
                }
            }
            console.log(finalRes)
            res.status(201).send(JSON.stringify(finalRes));
        }
    });
});

app.listen(4000, () => {
    console.log('Acception connection at Port Number, 4000');
});
