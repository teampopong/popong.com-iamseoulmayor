var scores = [];
var pledges = [];

function randInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getCurrentQuestion() {
	return $('.question:visible');
}

function getCurrentPageNo() {
	return parseInt(getCurrentQuestion().attr('id').substr(1));
}

function showStart() {
	$('.question').hide();
	$('#result').hide();
	$('#start').fadeIn();
}

function showResult() {
	var left = _.filter(scores, function(x){ return x < 0; }).length,
		right = _.filter(scores, function(x){ return x > 0; }).length;

	var resultIndicator = $('.result-indicator').empty();
	_(left).times(function () {
		var rect = $('<div class="rect left">&nbsp;</div>').appendTo(resultIndicator);
	});
	_(right).times(function () {
		var rect = $('<div class="rect right">&nbsp;</div>').appendTo(resultIndicator);
	});

	$('.result-name')
		.text(left > right ? '나경원' : '박원순')
		.removeClass('left right')
		.addClass(left > right ? 'left' : 'right');

	$('.result-photo').attr('src', left > right
		? '/images/_EB_82_98_EA_B2_BD_EC_9B_90.jpg'
		: '/images/_EB_B0_95_EC_9B_90_EC_88_9C.jpg');

	getCurrentQuestion().hide();
	$('#result').fadeIn();
}

function to(pageNo) {
	$('#start').hide();
	$('#result').hide();
	getCurrentQuestion().hide();
	$('#q'+pageNo).fadeIn();
}

function prev() {
	var currentPageNo = getCurrentPageNo();
	if (currentPageNo > 0) {
		to(currentPageNo - 1);
	} else {
		alert('뒤로 갈 수 없습니다!');
	}
}

function next() {
	var currentPageNo = getCurrentPageNo();
	if (currentPageNo < pledges.length - 1) {
		to(currentPageNo + 1);
	} else {
		$.get('/promotion_log.html', {
			categories: JSON.stringify(_.pluck(pledges, 'category')),
			scores: JSON.stringify(scores)
		}, function () {});
		showResult();
	}
}

function choose(score) {
	var idx = parseInt(getCurrentQuestion().attr('id').substr(1));
	scores[idx] = score;
}

$.getJSON('/pledges.json', function (pledges) {
	pledges = _.shuffle(pledges);
	window.pledges = pledges;

	$.each(pledges, function (idx, item) {
		// NOTE: IE6/7에서 실제 문서에 속하지 않은 DOM element를
		// append하지 못하는 버그가 있어서 다소 더럽게 workaround.
		$('#content').append('<div></div>');
		var question = $('#content').children('div').last();
		question
			.addClass('question')
			.html($('#template-question').html())
			.attr('id', 'q'+idx);
		question.find('.category').text(item.category);

		// 1/2의 확률로 좌우를 바꿈
		var swap = randInt(0, 1) == 1;
		if (swap) {
			var t;
			t = item[0], item[0] = item[1], item[1] = t;
		}

		question.find('.pledge.left').attr('score', swap ? 1 : -1);
		question.find('.pledge.right').attr('score', swap ? -1 : 1);

		// pledges of 나경원
		var left_pledges = _.shuffle(item[0]).slice(0, 2);
		var left_ul = question.find('.pledge.left ul');
		$.each(left_pledges, function (idx, item) {
			left_ul.append('<li>'+item+'</li>');
		});

		// pledges of 박원순
		var right_pledges = _.shuffle(item[1]).slice(0, 2);
		var right_ul = question.find('.pledge.right ul');
		$.each(right_pledges, function (idx, item) {
			right_ul.append('<li>'+item+'</li>');
		});

		// position indicator
		var positionIndicator = question.find('.position-indicator');
		for (var i = 0; i < pledges.length; i++) {
			var dot = $('<div class="dot">&nbsp;</div>').appendTo(positionIndicator);
			dot.attr('idx', i);
			if (i < idx) {
				dot.addClass('prev');
			} else if (i == idx) {
				dot.addClass('now');
			}
		}
	});

	///// event handlers /////
	$('.pledge').click(function (event) {
		var score = parseInt($(this).attr('score'));
		choose(score);

		next();
	});

	$('.button-start').click(function (event) {
		to(0);
	});

	$('.button-back').click(function (event) {
		prev();
	});

	$('.button-home').click(function (event) {
		showStart();
	});

	$('.button-retry').click(function (event) {
		location.reload();
	});

	$('.button-share-twitter').click(function (event) {
		var name = $('.result-name').text();
		var url = 'http://twitter.com/share'
			+ '?url=http%3A%2F%2Fwww.popong.com%2Fpromotion.html'
			+ '&via=PopongC&text=' + encodeURI('애정선거가 정해준 나에게 맞는 서울시장 후보는 ')
	  		+ encodeURI(name) + encodeURI('입니다! 당신도 한 번 해보세요!') + ' %23PopongC';
		var w = window.open(url, "twitter", "width=600, height=255, menubar=0");
		w.focus();
	});

	$('.button-share-fb').click(function (event) {
		var name = $('.result-name').text();
		var img = $('.result-photo').attr('src');
		var url = 'http://www.facebook.com/sharer/sharer.php?s=100'
			+ '&p[url]=http%3A%2F%2Fwww.popong.com%2Fpromotion.html'
			+ '&p[title]=' + encodeURI('나는 서울 시장이다! 내 성향에 맞는 후보는?')
			+ '&p[summary]=' + encodeURI('애정선거가 정해준 나에게 맞는 서울시장 후보는 ')
			+ encodeURI(name) + encodeURI('입니다! 당신도 한 번 해보세요!')
			+ '&p[images][0]=http%3A%2F%2Fwww.popong.com'+img;
		var w = window.open(url, "Facebook", "width=600, height=400, menubar=0");
		w.focus();
	});

	$('.dot.prev').click(function (event) {
		to($(this).attr('idx'));
	});
});
