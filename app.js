
/**
 * Module dependencies.
 */

var express = require('express');
var _ = require('underscore');
_.mixin(require('underscore.string'));
var fs = require('fs');
var assert = require('assert');
var connect = require('connect');
require('express-namespace');

var app = module.exports = express.createServer();
var MemoryStore = connect.session.MemoryStore;
var debug = false;

// Configuration

app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser());
	// session longs for 24 hours
	app.use(express.session({ secret: 'keyboard cat',
		store: new MemoryStore({ maxAge: 1000*60*60*24 })}));
	app.use(express.static(__dirname + '/public'));
	app.use(app.router);
});

app.configure('development', function(){
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
	debug = true;
});

app.configure('production', function(){
	app.use(express.errorHandler()); 
	debug = false;
});

// Code

var VALIDATE_CYCLE = 25; // like 캐시 validation 주기
var BACKUP_CYCLE = 1;
var MAX_TEXT_LENGTH = 140;
try {
	var MASTER_PASSWD = _(fs.readFileSync('master_passwd', 'utf-8')).trim();
} catch (e) {
	console.error('A master password is required. Create "./master_passwd" file.');
	process.exit(1);
}

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

function getEvent(id) {
	return _.detect(db.events, function (item) {
		return item.id == id && !item.deleted;
	});
}

function getEventsByTopic(topic) {
	return _.filter(db.events, function (event) {
		return event.topic == topic && !event.deleted;
	});
}

function getDateRepr(date) {
	assert.ok(date instanceof Date);
	return _.sprintf("%04d%02d%02d", date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

var getPledges = (function () {
	var pledges;

	function setupPledges() {
		_.each(['나경원', '박원순'], function (name) {
			_.each(['일자리', '교육', '시정', '주택', '경제', '여성,보육',
				'복지', '안전', '소상공인', '참여,소통'], function (domain) {

				var newid = getNextId();
				db.events.push({
					id: name+'_'+domain,
					topic: '공약',
					like: 0
				});
			});
		});
	}

	return function () {
		if (_.isUndefined(pledges)) {
			if (!getEventsByTopic('공약').length) {
				setupPledges();
			}

			pledges = _(db.events).chain()
				.filter(function (event) {
					return event.topic == '공약';
				})
				.groupBy(function (event) {
					return event.id;
				}).value();
			_.each(pledges, function (pledge, id) {
				pledges[id] = pledge[0];
			});
		}

		return pledges;
	}
})();

var getSortedEventsByTopic = (function () {
	var sortedEventsSet = {'date': [], 'like': []};
	var prevSortBy = null;

	return function (topic, sortBy) {
		// TODO: MongoDB 등의 데이터베이스 사용하기 (JSON 인터페이스라 비교적 쉽게 쓸 수 있을... 듯?)
		//       현재는 데이터량이 작아서 상관 없겠지만, 메모리에 sort 방식에 따른 중복 copy를 들고 있는 비효율성 문제가 있음.
		var sortedEvents = sortedEventsSet[sortBy][topic];

		// 캐시 사용 가능 여부 체크
		if (!debug && sortedEvents && sortedEvents.nextIdWhenLastSorted == db.nextId) {

			return sortedEvents.events;

		} else {
			sortedEvents = getEventsByTopic(topic);
			sortedEvents.sort(function (ev1, ev2) {
				// 날짜의 대소관계만 비교하기 위해 YYYYMMDD 형태의 숫자로 변환
				var date1 = parseInt(getDateRepr(new Date(ev1.date)));
				var date2 = parseInt(getDateRepr(new Date(ev2.date)));
				if (sortBy == 'date') {  // 날짜를 우선 정렬
					return (date1 != date2) ? (date2 - date1) : (ev2.id - ev1.id);
				} else {  // like를 우선 정렬
					return (ev1.like != ev2.like) ? (ev2.like - ev1.like) : (date2 - date1);
				}
				return 0;
			});

			sortedEventsSet[sortBy][topic] = {
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
	var event = getEvent(id);
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

	function validateDate(date) {
		var t = date.split(/-/g);
		var currentYear = (new Date()).getFullYear();

		if (t.length !== 3) {
			throw '잘못된 날짜 형식입니다.';
		}
		if (t[0] < 1900 || t[0] > currentYear) {
			throw _.sprintf('%d년부터 %d년 사이를 입력해 주세요.', 1900, currentYear);
		}
		if (t[1] < 1 || t[1] > 12) {
			throw '1월부터 12월 사이를 입력해 주세요.';
		}
		if (t[2] < 1 || t[2] > 31) {
			throw '1일부터 31일 사이를 입력해 주세요.';
		}
	}

	if (_.isUndefined(event.text) || event.text.length > 140) {
		throw '140자가 넘는 글은 등록할 수 없습니다.';
	}
	if (_.isUndefined(event.link) || event.link.length == 0) {
		throw '링크(출처)는 반드시 입력해야 합니다.';
	}
	// TODO: check URL format
	if (_.isUndefined(event.passwd) || event.passwd.length == 0) {
		throw '비밀번호는 반드시 입력해야 합니다.';
	}
	if (event.passwd.length < 4) {
		throw '비밀번호는 4자 이상 입력해야 합니다.';
	}
	if (_.isUndefined(event.date)) {
		throw '날짜는 반드시 입력해야 합니다.';
	}

	validateDate(event.date);
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
	try {
		assert.ok(fs.statSync('db/').isDirectory());
	} catch (err) {
		fs.mkdirSync('db/', 0755);
	}
	console.log('saving database...');
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
	console.log('retrieving database...');
	_.each(defaultDb, function (table, name) {
		try {
			backup[name] = JSON.parse(
					fs.readFileSync(_.sprintf('db/%s.json', name, 'utf-8')));
		} catch (err) {
			backup[name] = typeof defaultDb[name] == 'object'
					? _.clone(defaultDb[name]) : defaultDb[name];
		}
	});
	return backup;
}

// Routes

app.get('/(event/:id)?', function(req, res) {
    var sortBy = req.param('sortby', 'date');
    if (!(sortBy == 'date' || sortBy == 'like')) {
        res.send('Invalid parameters.', 400);
        return;
    }
    res.render('index', {
        title: '나는 서울 시장이다!',
        style: '/iamseoulmayor/stylesheets/style.css',
        jsfiles: ['/iamseoulmayor/javascripts/jquery-1.6.2.min.js'
            , '/iamseoulmayor/javascripts/underscore.string.js'
            , '/iamseoulmayor/javascripts/timeline.js'],
        left_events: getSortedEventsByTopic('나경원', sortBy),
        right_events: getSortedEventsByTopic('박원순', sortBy),
        pledges: getPledges(),
        event_id: req.params.id || '',
        sort_by: sortBy,
        query_string: req.query  // redirection 처리할 때 parameter 보존용
    });
});

app.namespace('/admin', function () {
    app.get('/', function(req, res){
        res.render('admin_notlogged');
    });

    app.post('/', function (req, res) {
        if (req.body.key == MASTER_PASSWD) {
            var backup = getBackupDb();

            res.render('admin', {
                title: '관리자',
                style: '/iamseoulmayor/stylesheets/admin.css',
                key: req.body.key,
                db: JSON.stringify(db, null, 2),
                backup: JSON.stringify(backup, null, 2)
            });
        } else {
            res.redirect('/admin');
        }
    });

    app.post('/backup', function(req, res) {
        if (req.body.key == MASTER_PASSWD) {
            backupDb();
        }
        res.redirect('/admin', 303);
    });

    app.post('/import', function(req, res) {
        if (req.body.db && req.body.key == MASTER_PASSWD) {
            console.log('importing database...');
            db = JSON.parse(req.body.db);
        }
        res.redirect('/admin', 303);
    });
});

app.post('/event', function(req, res) { // AJAX handler
    res.json(expired()); return;

    try {
        validateEvent(req.body);
    } catch (message) {
        res.json({
            success: 0,
            message: message
        });
        return;
    }

    var newid = getNextId();
    db.events.push({
        id: newid,
        title: req.body.title,
        topic: req.body.topic,
        date: req.body.date,
        text: req.body.text,
        passwd: req.body.passwd,
        link: getAbsoluteUrl(req.body.link),
        like: 0
    });
    updateCount(5);

    if (req.isXMLHttpRequest) {
        res.json({
            success: 1,
            event_id: newid
        });
    } else {
        res.redirect('/' + req.query);
    }
});

app.del('/event', function(req, res) { // AJAX handler
    var event = getEvent(req.body.id);
    if (!event) {
        res.json({
            success: 0,
            message: '잘못된 이벤트 ID입니다.'
        });
        return;
    }
    if (req.body.passwd != event.passwd
        && req.body.passwd != MASTER_PASSWD) {
        res.json({
            success: 0,
            message: '비밀번호가 잘못되었습니다.'
        });
        return;
    }

    event.deleted = 1;
    getNextId(); // to clear sortedEvents cache
    updateCount(5);

    res.json({
        success: 1
    });
});

app.post('/like', function(req, res) { // AJAX handler
    res.json(expired()); return;

    if (_.isUndefined(req.session.liked)) {
        req.session.liked = {};
    }

    if (!getEvent(req.body.id)) {
        res.json({
            success: 0,
            message: '잘못된 이벤트입니다.'
        });
        return;
    }

    // 이미 추천한 이슈
    if (req.session.liked[req.body.id]) {
        res.json({
            success: 0,
            message: '1일 1PONG!\n내일 다시 PONG해주세요~! :D'
        });
        return;
    }

    db.likes.push({
        id: req.body.id,
        regdate: (new Date()).getTime(),
        host: getClientAddress(req)
    });
    updateCount();
    // XXX: 원래는 like가 증가해도 sortedEvent 캐시를 지워야 하지만
    // 현재 클라이언트 JavaScript로 정렬 처리 중.
    // 클라이언트에 큰 부하가 되지 않으니,
    // 서버 부하를 줄이기 위해 cache 클리어하지 않음

    // 세션에 추천 정보 기록
    req.session.liked[req.body.id] = true;

    res.json({
        success: 1,
        numLiked: getNumLiked(req.body.id)
    });
});

function expired() {
    return {
        success: 0,
        message: '선거 기간이 지났습니다. 이용해 주셔서 감사합니다.^^'
    };
}

var port = 3000;
if (process.argv.length > 2) {
	port = parseInt(process.argv[2]);
}
app.listen(port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
