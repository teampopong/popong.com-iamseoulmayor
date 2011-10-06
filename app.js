
/**
 * Module dependencies.
 */

var express = require('express');
var _ = require('underscore');
_.mixin(require('underscore.string'));
var fs = require('fs');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
	app.use(express.errorHandler()); 
});

// Code

var events = [];

var getNextId = (function () {
	var nextId = 1;
	return function () {
		return nextId++;
	};
})();

// Routes

app.get('/', function(req, res) {
	res.redirect('/index.html', 303);
});

app.get('/admin', function(req, res){
	var backupedEvents;
	try {
		backupedEvents = fs.readFileSync('events.json');
	} catch (err) {
		backupedEvents = '';
	}

	res.render('admin', {
		title: '관리자', events: JSON.stringify(events),
		backupedEvents: backupedEvents
	});
});

app.get('/event/:topic', function(req, res) {
	res.json(_.filter(events, function (event) {
		return event.topic == req.params.topic;
	}));
});

app.post('/event', function(req, res) {
	events.push({
		id: getNextId(),
		topic: req.body.topic, date: req.body.date,
		text: req.body.text, link: req.body.link
	});
	res.send();
});

app.get('/backup', function(req, res) {
	// TODO: multiple backup targets
	fs.writeFile('events.json',
			JSON.stringify(events),
			function (err) {
		if (err) {
			throw res;
		} else {
			console.log(_.sprintf("[%s] events saved.", ''+new Date()));
			res.redirect('/admin', 303);
		}
	});
});

app.post('/import', function(req, res) {
	// TODO: multiple import targets
	if (req.body.events) {
		events = JSON.parse(req.body.events);
	}
	res.redirect('/admin', 303);
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
