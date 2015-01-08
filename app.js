var express = require('express');
var bodyParser = require('body-parser');
var mongo = require('mongodb').MongoClient;
var requestLib = require('request');
var OAuth = require('oauth').OAuth;
var fs = require('fs');

var twitterConsumerKey  = "";
var twitterConsumerSecret = "";

fs.readFile("twitterConsumerKey.txt", {encoding : "utf-8"}, 
		function(err, data) 
		{ 
		if(!err)
		{ 
			twitterConsumerKey = data; twitterConsumerKey = twitterConsumerKey.substring(0,twitterConsumerKey.length - 1);
			if(twitterConsumerSecret.length > 0)
				{ initOAuth(); } 
		}
		else
			{ console.log(err.message); } 
		}
	   );

fs.readFile("twitterConsumerSecret.txt", {encoding : "utf-8"}, 
		function(err, data) 
		{
		if(!err) 
		{ 
			twitterConsumerSecret = data; twitterConsumerSecret = twitterConsumerSecret.substring(0, twitterConsumerSecret.length - 1);
			if(twitterConsumerKey.length > 0)
				{ initOAuth(); }
		} 
		else
			{ console.log(err.message); } 
		}
);


var mongoUrl = 'mongodb://localhost:27017/shakespeare';
/*
// Use connect method to connect to the Server
mongo.connect(mongoUrl, function(err, db) {
if(err != null)
console.log("Failed to connect to MongoDB server: " + err);

db.close();
});
 */

var twitterOAuth;

function initOAuth()
{
	twitterOAuth = new OAuth(
			"http://twitter.com/oauth/request_token",
			"http://twitter.com/oauth/access_token", 
			twitterConsumerKey, twitterConsumerSecret, 
			"1.0A", null, "HMAC-SHA1"
			);
}

var app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.listen(9000);

app.get('/tweet', function(req, res) {
	mongo.connect(mongoUrl, function(err, db) 
	{
		if(err != null)
		{
			res.send("failed to connect to db");
			return;
		}
		var users = db.collection("users");
		users.findOne({ username : "shakespeareb2" }, function(dbErr, doc)
		{
			if(dbErr != null)
			{
				res.send("failed to find user");
				return;
			}
			var twitterAccessToken = doc.token;
			var twitterAccessTokenSecret = doc.tokenSecret;

			twitterOAuth.post(
				"https://api.twitter.com/1.1/statuses/update.json",
				twitterAccessToken, twitterAccessTokenSecret,
			{"status":"Hello World!"},
			function(error, data)
			{
				if(error) res.send(console.log(error));
				else res.send(data)
			});
		/*
		   var apiUrl = "https://api.twitter.com/1.1/statuses/update.json" + "?status=" + encodeURIComponent("hello world!");  
		   requestLib.post(
		   { url : apiUrl,
oauth : { consumer_key : twitterConsumerKey,
consumer_secret: twitterConsumerSecret,
token : userToken,
token_secret : userSecret }},
function (error, response, body)
{
if(!error && response.statusCode == 200)
{
res.send('tweeted: hello world: ' + body.screen_name + '/' + body.id_str);
}
else
{
res.send('failed to tweet' + JSON.stringify(body));
}
});*/
		});
	});
});

app.get('/recent-tweets', function(req, res)
{
	res.json( { tweets : [{text:'hello', link:'http://lhello'}, 
			{text:'one', link:'http://ltwo'},
			{text:'three',link:'http://lthree'},
			{text:'a', link:'http://la'},
			{text: 'b', link:'http://lb'}] });
});

app.post('/add-user', function(req, res)
{
	addTwitterUser(req.body.username, req.body.token, req.body.tokenSecret,
		function(err)
		{
		if(err != null)
		{
			console.log("Failed to add user " + req.body.username + ": " + err.messsage);
			res.status(500).send("Failed to add user");
		}
		else
		{
			console.log("Added user: " + req.body.username);
			res.status(201).send("success");
		}
		});

});

function addTwitterUser(username, token, tokenSecret, callback)
{
	mongo.connect(mongoUrl, function(err, db) {
	if(err != null)
	{
		callback(err);
		return;
	}
	var users = db.collection("users");
	users.update( { "username" : username }, { "username" : username, "token" : token, "tokenSecret" : tokenSecret }, { upsert : true },
		function(err, result)
		{
		if(err != null)
		{
			callback(err);
			return;
		}
		db.close();
		callback(null);
		});
	});
}

