
/**
 * Module dependencies.
 */

var express = require('express');
var _ = require('underscore');
_.mixin(require('underscore.string'));
var fs = require('fs');
var connect = require('connect');

var app = module.exports = express.createServer();
var MemoryStore = connect.session.MemoryStore;

// Configuration

app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser());
	// session longs for two weeks
	app.use(express.session({ secret: 'keyboard cat',
		store: new MemoryStore({ maxAge: 1000*60*60*24*7*2 })}));
	app.use(express.static(__dirname + '/public'));
	app.use(app.router);
});

app.configure('development', function(){
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
	app.use(express.errorHandler()); 
});

// Code

var VALIDATE_CYCLE = 25; // like 캐시 validation 주기
var BACKUP_CYCLE = 1;
var MAX_TEXT_LENGTH = 140;

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

var getSortedEventsByTopic = (function () {
	var sortedEventsList = [];

	return function (topic) {
		var sortedEvents = sortedEventsList[topic];

		// 캐시 생성 이후에 변하지 않았으면
		if (sortedEvents && sortedEvents.nextIdWhenLastSorted == db.nextId) {
			return sortedEvents.events;

		// 새로 캐시를 생성해야 한다면
		} else {
			sortedEvents = _.sortBy(getEventsByTopic(topic), function (event) {
				return -(new Date(event.date)).getTime();
			});

			sortedEventsList[topic] = {
				events: sortedEvents,
				nextIdWhenLastSorted: db.nextId
			};

			return sortedEvents;
		}
	};
})();

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

var updateCount = (function () {
	var backupCount = 0,
		nextBackupCount = 0;

	return function (num) {
		num = num || 1;
		backupCount += num;
		if (backupCount >= nextBackupCount) {
			backupDb();
			nextBackupCount = backupCount + BACKUP_CYCLE;
		}
	};
})();

function validateEvent(event) {
	if (_.isUndefined(event.text) || event.text.length > 140) {
		throw '140자가 넘는 글은 등록할 수 없습니다.';
	}
	if (_.isUndefined(event.link) || event.link.length <= 0) {
		throw '링크(출처)는 반드시 입력해야 합니다';
	}
}

function getAbsoluteUrl(link) {
	if (_.startsWith(link, 'http://') || _.startsWith(link, 'https://')) {
		return link;
	} else {
		return 'http://' + link;
	}
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

app.get('/(event/:id)?', function(req, res) {
	res.render('index', {
		title: '나는 서울 시장이다!',
		style: '/stylesheets/style.css',
		jsfiles: ['/javascripts/jquery-1.6.2.min.js'
			, '/javascripts/underscore.string.js'
			, '/javascripts/timeline.js'
			, 'http://platform.twitter.com/widgets.js'],
		left_events: getSortedEventsByTopic('나경원'),
		right_events: getSortedEventsByTopic('박원순'),
		event_id: req.params.id || ''
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
	try {
		validateEvent(req.body);
	} catch (message) {
		res.json({
			success: 0,
			message: message
		});
		return;
	}

	db.events.push({
		id: getNextId(),
		title: req.body.title,
		topic: req.body.topic,
		date: req.body.date,
		text: req.body.text,
		link: getAbsoluteUrl(req.body.link),
		like: 0
	});
	updateCount(5);

	res.json({
		success: 1
	});
});

app.post('/like', function(req, res) {
	if (_.isUndefined(req.session.liked)) {
		req.session.liked = {};
	}

	// 이미 추천한 이슈
	if (req.session.liked[req.body.id]) {
		res.json({
			success: 0,
			message: '이미 추천했습니다'
		});
		return;
	}

	db.likes.push({
		id: req.body.id,
		regdate: (new Date()).getTime(),
		host: getClientAddress(req)
	});
	updateCount();

	// 세션에 추천 정보 기록
	req.session.liked[req.body.id] = true;

	res.json({
		success: 1,
		numLiked: getNumLiked(req.body.id)
	});
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
