const express = require('express');
const bodyParser = require("body-parser");
const Joi = require('@hapi/joi');
const assert = require('assert');
const db = require("./db");
const collection = "singers";
const app = express();

// schema used for data validation for our document
const schema = Joi.object().keys({
    id: Joi.number().integer().required().min(1).max(1000),
    artistname : Joi.string().required()
});

// parses json data sent to us by the user 
app.use(bodyParser.json());

// serve static html file to user
app.get('/',(res)=>{
    res.send("welcome");
});

// read
app.get('/singers',(req,res)=>{
    // get all documents within our collection
    // send back to user as json
    db.getDB().collection(collection).aggregate(
        [ { "$lookup": 
              {
                  "from": "instruments",
                  "localField" : "id",
                  "foreignField": "artist_id",
                  "as": "band_members"
              }
          }
        ],
        (err, cursor) => {
          assert.equal(err, null);
  
          cursor.toArray(function(err, results) {
            if (err) {
                res.status(400).send({'error': err})
            }
            if (results === undefined || results.length === 0) {
                res.status(400).send({'error':'No documents in database'})
            } else {
                res.status(200).send(results)
            }
          });
        }
    );
});

// get by Id
app.get('/singer/:id', (req, res) => {
    let id = req.params.id
    db.getDB().collection(collection).aggregate(
        [ { "$lookup": 
              {
                  "from": "instruments",
                  "localField" : "id",
                  "foreignField": "artist_id",
                  "as": "band_members"
              }
          },
          { "$match" : 
              { 
                  "_id" : db.getPrimaryKey(id)
              } 
          }
        ],
        (err, cursor) => {
          assert.equal(err, null);
  
          cursor.toArray(function(err, result) {
            if (err) {
                res.status(400).send({'error': err})
            }
            if (result === undefined) {
                res.status(400).send({'error':'No documents in database'})
            } else {
                res.status(200).send(result)
            }
          });
        }
    );
})

//create
app.post('/singer',(req,res,next)=>{
    // Document to be inserted
    const userInput = req.body;

    // Validate document
    // If document is invalid pass to error middleware
    // else insert document within collection
    Joi.validate(userInput,schema,(err,result)=>{
        if(err){
            const error = new Error("Invalid Input");
            error.status = 400;
            next(error);
        }
        else{
            db.getDB().collection(collection).insertOne(userInput,(err,result)=>{
                if(err){
                    const error = new Error("Failed to insert Document");
                    error.status = 400;
                    next(error);
                }
                else
                    res.status(200).send({result : result, document : result.ops[0], msg : "Successfully inserted Data!!!",error : null});
            });
        }
    })    
});

// update
app.patch('/singer/:id',(req,res)=>{
    // Primary Key of Document we wish to update
    const id = req.params.id;
    // Document used to update
    const userInput = req.body;
    // Find Document By ID and Update
    db.getDB().collection(collection).findOneAndUpdate({_id : db.getPrimaryKey(id)},{$set : userInput},{returnOriginal : false},(err,result)=>{
        if (err) {
            res.status(400).send({'error': err})
        }
        else{
            res.status(200).send(result);
        }      
    });
});

//delete
app.delete('/singer/:id',(req,res)=>{
    // Primary Key of Document
    const id = req.params.id;
    // Find Document By ID and delete document from record
    db.getDB().collection(collection).findOneAndDelete({_id : db.getPrimaryKey(id)},(err,result)=>{
        if (err) {
            res.status(400).send({'error': err})
        }
        else{
            res.status(200).send(result);
        } 
    });
});

// Middleware for handling Error
// Sends Error Response Back to User
app.use((err,req,res,next)=>{
    res.status(err.status).json({
        error : {
            message : err.message
        }
    });
})


db.connect((err)=>{
    // If err unable to connect to database
    // End application
    if(err){
        console.log('unable to connect to database');
        process.exit(1);
    }
    // Successfully connected to database
    // Start up our Express Application
    // And listen for Request
    else{
        app.listen(3000,()=>{
            console.log('connected to database, app listening on port 3000');
        });
    }
});