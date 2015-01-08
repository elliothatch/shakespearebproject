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
	tweetAllUsers();
	res.send("tweeted all users");
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

function tweetAllUsers()
{
	mongo.connect(mongoUrl, function(connectErr, db)
	{
		if(connectErr != null)
		{
			console.log(err.message);
			return;
		}
		var users = db.collection("users");
		var usersStream = users.find().stream();
		var doneInserting = false;
		var insertCount = 0;
		usersStream.on("end", function() {
			doneInserting = true;
		});

		usersStream.on("data", function(doc) {
			insertCount++;
			var tweet = generateShakespeareTweet();
			tweetOnBehalf(doc.token, doc.tokenSecret, tweet, function(tweetErr, data, res) {
				if(tweetErr)
					console.log("failed to tweet on behalf of user " + doc.username + ": " + tweetErr.message);
				else
				{	
					var tweets = db.collection("tweets");	
					tweets.insert( { "username" : doc.username, "tweet" : tweet, tweetId : JSON.parse(data).id_str }, function(insertErr, doc2)
						{
							if(insertErr)
								console.log("failed to insert tweet in db: ", insertErr.message);
							if(--insertCount === 0 && doneInserting)
								db.close();
						});
				}
			});
		});
	});
}
function tweetOnBehalf(accessToken, accessTokenSecret, tweet, callback)
{
	twitterOAuth.post("https://api.twitter.com/1.1/statuses/update.json",
			  accessToken,
			  accessTokenSecret,
			  { "status" : tweet },
			  callback);
}

function generateShakespeareTweet()
{
	var wordLengthCumulativeProbability = [0.0574574,0.199017852,0.37743256,
						0.548329383,0.689170805,0.794711216,
						0.868774145,0.918309833,0.95024724,
						0.970250957,0.98249012,0.989835177,
						0.994172152,0.996697803,0.998151198,
						0.998978925,0.999446045,0.999707541,
						0.999852876,0.999933131];
	var letters = "abcdefghijklmnopqrstuvwxyz";

        var statement = "";
        var currentWordLength = 0;
        for(var i = 0; i < 140; i++)
        {
                //word length distribution pulled from this article http://plus.maths.org/content/mystery-zipf
                //y = 0.11726*x^2.33*0.49^x where x is word length
                //I couldn't figure out the inverse of the integral of this function so I just did it numerically, even so, there's probably a better way to do this
                var addedSpace = false;
                if(currentWordLength > 0)
                {
                        var prob =  Math.random();
                        for(var j = 0; j < currentWordLength; j++)
                        {
                                if(prob < wordLengthCumulativeProbability[j])
                                {
                                        statement += " ";
                                        addedSpace = true;
                                        currentWordLength = 0;
                                        break;
                                }
                        }
                }
                if(!addedSpace)
                {
                        statement += letters.charAt(Math.floor(Math.random() * letters.length));
                        currentWordLength++;
                }
	}
	return statement;
}
