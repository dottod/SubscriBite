const express = require('express');
const app = express();
const mysql = require('mysql');
const cors = require('cors');

var session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

app.use(cors());
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
    res.status(201).send({ val: 'Services started' });
});

app.post('/', (req, res) => {
    res.status(201).send({ val: 'Initialization of SubscriBite' });

});

app.post('/login', (req, res) => {
    const email_address = req.body.email_address;

    pool.query('SELECT * FROM users WHERE email_address = ?', [email_address], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal server error');
        } else {
            if (result.length === 0) {
                res.status(403).send('Email address is invalid');
            } else {
                // set session data for the user
                req.session.userId = result[0].id;
                req.session.email_address = result[0].email_address;
                req.session.location = result[0].loc_id;
                console.log(req.session);
                res.status(200).send('Log in successful');
            }
        }
    });
});

app.post('/register', (req, res) => {
    const { email_address, user_id } = req.body;
    pool.query('INSERT INTO `users` (`email_address`,`id`,`valid_user`) VALUES ( ?, ?,0)', [email_address, user_id], function (err, result) {

        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(409).send('User Is/Email Id is already registered');
            } else {
                console.log('An error occured.')
                res.status(500).send(err.toString());
            }
        }
        else {
            res.status(201).send('User successfully created');
        }
    });
});
app.post('/users/updateInfo', (req, res) => {
    const { user_id, first_name, last_name, phone_number, address, email_address } = req.body;
    let query = 'UPDATE users SET valid_user=1,';
    const values = [];

    if (first_name) {
        query += ' firstname = ?,';
        values.push(first_name);
    }

    if (last_name) {
        query += ' lastname = ?,';
        values.push(last_name);
    }

    if (phone_number) {
        query += ' phone_number = ?,';
        values.push(phone_number);
    }

    if (email_address) {
        query += ' email_address = ?,';
        values.push(email_address);
    }

    if (address) {
        query += ' address = ?,';
        values.push(address);
    }

    // Remove the trailing comma from the query
    query = query.slice(0, -1);

    query += ' WHERE id = ?';
    values.push(user_id);
    console.log(query);
    console.log(values);
    pool.query(query, values, function (err, result) {
        if (err) {
            if (err.code === 'ER_EMPTY_QUERY') {
                res.status(409).send('User does not exist');
            } else {
                console.log('An error occurred.');
                res.status(500).send(err.toString());
            }
        } else {
            console.log(result);
            console.log(result.affectedRows);
            if (result.length === 0 || result.affectedRows === 0) {
                res.status(403).send('User id is invalid');
            } else if (result.changedRows) {
                res.status(201).send('User Info Updated');
            } else {
                res.status(201).send('No changes were made');
            }
        }
    });
});


app.post('/users',(req,res)=>{
    const { user_id } = req.body;
    pool.query('SELECT * FROM users WHERE id = ?', [user_id], function (err, result) {
        if (err) {
            console.log('An error occured.')
            res.status(500).send(err.toString());
        } else {
            res.send(JSON.stringify(result));
        }
    });
}
);

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
app.post('/categories', (req, res) => {
    const { postal_code } = req.body;
    let params = [];
    let query = 'SELECT DISTINCT category FROM vw_product_geo_avail WHERE stock_avail > ?';

    if (postal_code) {
        query += ' AND postal_code = ?';
        params.push(0, postal_code);
    } else {
        params.push(0);
    }

    pool.query(query, params, (err, result) => {
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
app.post('/products', (req, res) => {
    const { category, postal_code } = req.body;
    let params = [];
    let query = 'SELECT * FROM vw_product_geo_avail WHERE 1 = 1';

    if (postal_code) {
        query += ' AND postal_code = ?';
        params.push(postal_code);
    }

    if (category) {
        query += ' AND category = ?';
        params.push(category);
    }

    query += ' AND stock_avail > ?';
    params.push(0);

    pool.query(query, params, (err, result) => {
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
                    unit: row.unit,
                    created_datetime: row.created_datetime
                };
            });
            res.status(200).json(products);
        }
    });
});


// Get product desription
app.post('/products/description', (req, res) => {
    const { id } = req.body;
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
                    unit: row.unit,
                    created_datetime: row.created_datetime
                };
            });
            res.status(200).json(product);
            // have to check if product id not present error would come or should i just add a check here for size of rows?
        }
    });
});


// get subscriptions:
app.post('/subscriptions/getSubscriptions', (req, res) => {
    const {user_id }= req.body;
    console.log(req.body,user_id)
    pool.query('select * from vw_subscriptions where  user_id = ?', [user_id], function (err, result) {
        if (err) {
            if (err.code === 'ENOENT') {
                res.status(409).send('No subscriptions found!');
            } else {
                console.log('An error occured.')
                res.status(500).send(err.toString());
            }
        }
        else {
            console.log(result);
            res.status(201).send(JSON.stringify(result));
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


app.post('/subscriptions/upcoming_orders', (req, res) => {
    const { user_id } = req.body;
    pool.query('select * from vw_upcoming_orders where user_id = ?', [user_id], function (err, result) {
        if (err) {
            if (err.code === 'ENOENT') {
                res.status(409).send('No subscriptions found!');
            } else {
                console.log('An error occured.')
                res.status(500).send(err.toString());
            }
        }
        else {
            let finalRes = {};
            for (let i in result) {
                let delivery_date = result[i].delivery_date.toISOString().substring(0, 10);
                if (finalRes[delivery_date] !== undefined) {
                    finalRes[delivery_date].push(result[i]);
                } else {
                    finalRes[delivery_date] = [result[i]];
                }
            }
            res.status(201).send(JSON.stringify(finalRes));
        }
    });
});

app.delete('/subscriptions', (req, res) => {
    const { sub_id } = req.body;
    pool.query('delete from upcoming_orders where subscription_id = ?', [sub_id], function (err, result) {
        if (err) {
                console.log('An error occured.')
                res.status(500).send(err.toString());
        }
    })
    pool.query('delete from subscriptions where id = ?', [sub_id], function (err, result) {
        if (err) {
                console.log('An error occured.')
                res.status(500).send(err.toString());
        }
        else {
            res.status(201).send(JSON.stringify("Success"));
        }
    });
});

app.post('/subscriptions/update_upcoming_orders', (req, res) => {
    const { data } = req.body;
    let completedQueries = 0;
    for (let i in data) {
        let { id, quantity, slot } = data[i];
        const sqlQuery = `
        Update upcoming_orders u set u.quantity= ?, u.slot = ? where id = ?`;

        pool.query(sqlQuery, [quantity, slot, id], function (err, result) {
            if (err) {
                if (err.code === 'ENOENT') {
                    res.status(409).send('No subscriptions found!');
                } else {
                    console.log('An error occurred.');
                    res.status(500).send(err.toString());
                }
            } else {
                completedQueries++;

                if (completedQueries === data.length) {
                    res.status(201).send(JSON.stringify('Success'));
                }
            }
        });
    }
});



app.listen(4000, () => {
    console.log('Acception connection at Port Number, 4000');
});
