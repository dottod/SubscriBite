const express = require('express');
const app = express();


app.get('/',(req,res)=>{
    res.status(201).send({val:'CI/CD Pipeline Deployed.'});
});

app.post('/',(req,res)=>{
    res.status(201).send({val:'Initialization of SubscriBite'});

});

app.listen(4000,()=>{
    console.log('Acception connection at Port Number, 4000');
});
