
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

var defaultDb = {
	nextId: 1,
	events: [],
	likes: []
};
var db = _.clone(defaultDb);

function getNextId() {
	return db.nextId++;
}

function getClientAddress(req) {
	return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
};

/**
 * asynchronously backup the db
 */
function backupDb() {
	_.each(db, function (table, name) {
		fs.writeFile(_.sprintf('db/%s.json', name),
				JSON.stringify(table),
				function (err) {
					if (err) {
						throw res;
					} else {
						console.log("[%s] %s saved.", ''+new Date(), name);
					}
				});
	});
}

// Routes

app.get('/', function(req, res) {
	res.redirect('/index.html', 303);
});

app.get('/admin', function(req, res){
	var backup = {};
	_.each(db, function (table, name) {
		try {
			backup[name] = JSON.parse(
					fs.readFileSync(_.sprintf('db/%s.json', name)));
		} catch (err) {
			backup[name] = typeof defaultDb[name] == 'object'
					? _.clone(defaultDb[name]) : defaultDb[name];
		}
	});

	res.render('admin', {
		title: '관리자',
		db: JSON.stringify(db, null, 2),
		backup: JSON.stringify(backup, null, 2)
	});
});

app.get('/event/:topic', function(req, res) {
	res.json(_.filter(db.events, function (event) {
		return event.topic == req.params.topic;
	}));
});

app.post('/event', function(req, res) {
	db.events.push({
		id: getNextId(),
		topic: req.body.topic,
		date: req.body.date,
		text: req.body.text,
		link: req.body.link
	});
	res.send();
});

app.get('/like/:id', function(req, res) {
	var numLiked = _.filter(db.likes, function (item) {
		return item.id == req.params.id;
	}).length;
	// TODO: cache the # and the cached date
	res.send(_.sprintf('%d', numLiked));
});

app.post('/like', function(req, res) {
	db.likes.push({
		id: req.body.id,
		regdate: (new Date()).getTime(),
		host: getClientAddress(req)
	});
	res.redirect('/admin');
});

app.get('/backup', function(req, res) {
	backupDb();
	res.redirect('/admin', 303);
});

app.post('/import', function(req, res) {
	if (req.body.db) {
		db = JSON.parse(req.body.db);
	}
	res.redirect('/admin', 303);
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
