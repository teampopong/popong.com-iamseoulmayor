
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

var VALIDATE_CYCLE = 25; // like 캐시 validation 주기

var defaultDb = {
	nextId: 1,
	events: [],
	likes: []
};
var db = getBackupDb();

function getNextId() {
	return db.nextId++;
}

function getClientAddress(req) {
	return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
}

function getEventsByTopic(topic) {
	return _.filter(db.events, function (event) {
		return event.topic == topic;
	});
}

function validateNumLiked(event) {
	var expectedNumLiked = _.filter(db.likes, function (item) {
		return item.id == event.id;
	}).length;

	if (expectedNumLiked !== event.like) {
		console.warn('Like count for #%d does not match: '
			+ 'expected: %d, actual: %d'
			, event.id, expectedNumLiked, event.like);

		// assume that expected one is always right
		event.like = expectedNumLiked;
	}
}

function getNumLiked(id) {
	var event = _.detect(db.events, function (item) {
		return item.id == id;
	});
	event.like = (event.like || 0) + 1;

	// occationally validate
	if (event.like % VALIDATE_CYCLE === 0) {
		_.delay(validateNumLiked, 0, event);
	}

	return event.like;
}

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

function getBackupDb() {
	var backup = {};
	_.each(defaultDb, function (table, name) {
		try {
			backup[name] = JSON.parse(
					fs.readFileSync(_.sprintf('db/%s.json', name)));
		} catch (err) {
			backup[name] = typeof defaultDb[name] == 'object'
					? _.clone(defaultDb[name]) : defaultDb[name];
		}
	});
	return backup;
}

// Routes

app.get('/', function(req, res) {
	res.render('index', {
		title: '나는 서울 시장이다!',
		style: '/stylesheets/style.css',
		left_events: getEventsByTopic('나경원'),
		right_events: getEventsByTopic('박원순')
	});
});

app.get('/admin', function(req, res){
	var backup = getBackupDb();

	res.render('admin', {
		title: '관리자',
		style: '/stylesheets/admin.css',
		db: JSON.stringify(db, null, 2),
		backup: JSON.stringify(backup, null, 2)
	});
});

app.post('/event', function(req, res) {
	// TODO: insert title field
	db.events.push({
		id: getNextId(),
		topic: req.body.topic,
		date: req.body.date,
		text: req.body.text,
		link: req.body.link,
		like: 0
	});
	res.send();
});

app.post('/like', function(req, res) {
	// TODO: 중복 추천 체크
	db.likes.push({
		id: req.body.id,
		regdate: (new Date()).getTime(),
		host: getClientAddress(req)
	});
	res.send(''+getNumLiked(req.body.id));
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
