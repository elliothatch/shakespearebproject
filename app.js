var express = require('express');
var bodyParser = require('body-parser');
var requestLib = require('request');
var mongo = require('mongodb').MongoClient;
var passport = require('passport');
var twitterStrategy = require('passport-twitter').Strategy;
var fs = require('fs');

var twitterConsumerKey  = "";
var twitterConsumerSecret = "";

fs.readFile("twitterConsumerKey.txt", {encoding : "utf-8"}, function(err, data) { if(!err) { twitterConsumerKey = data; } else { console.log(err.message); } } );

fs.readFile("twitterConsumerSecret.txt", {encoding : "utf-8"}, function(err, data) { if(!err) { twitterConsumerSecret = data; } else { console.log(err.message); } } );

// Connection URL
var mongoUrl = 'mongodb://localhost:27017/shakespeare';
// Use connect method to connect to the Server
mongo.connect(mongoUrl, function(err, db) {
  if(err != null)
	console.log("Failed to connect to MongoDB server: " + err);

  db.close();
});


var app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.listen(9000);

app.get('/recent-tweets', function(req, res)
{
	res.json( { tweets : [{text:'hello', link:'http://lhello'}, 
				{text:'one', link:'http://ltwo'},
				{text:'three',link:'http://lthree'},
				{text:'a', link:'http://la'},
				{text: 'b', link:'http://lb'}] });
});

