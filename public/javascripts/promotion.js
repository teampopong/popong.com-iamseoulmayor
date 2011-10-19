var scores = [];
var pledges = [];

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
		var question = $('#template-question').clone().removeAttr('id').attr('id', 'q'+idx);
		question.find('.category').text(item.category);

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

		$('#content').append(question);
	});

	///// event handlers /////
	$('.pledge').click(function (event) {
		var chosen = $(this).hasClass('left') ? -1 : 1;
		choose(chosen);

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

	$('.dot.prev').click(function (event) {
		to($(this).attr('idx'));
	});
});
