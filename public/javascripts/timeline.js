(function () {

// constants
var MAX_TEXT_LENGTH = 140;
var HEIGHT_MEMBER_PANEL;

// http://stackoverflow.com/questions/901115/get-query-string-values-in-javascript/901144#901144
function getParameterByName(name){
	name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
	var regexS = "[\\?&]" + name + "=([^&#]*)";
	var regex = new RegExp(regexS);
	var results = regex.exec(window.location.href);

	if(results == null) {
		return "";
	} else {
		return decodeURIComponent(results[1].replace(/\+/g, " "));
	}
}

// functions
function stopPropagation(e) {
	e = e || window.event;
	e.cancelBubble = true;
	if (e.stopPropagation) e.stopPropagation();
}

function sortEventsByLikeScore() {

	function _sortEventsByLikeScore(container, events) {
		var sortedEvents = events.toArray().sort(function (ev1, ev2) {
			var like1 = parseInt($('.like', ev1).text()),
				like2 = parseInt($('.like', ev2).text());
			var date1 = $('.date', ev1).text(),
				date2 = $('.date', ev2).text();
			return (like1 != like2) ? (like2 - like1) : (date2 - date1);
		});
		$(sortedEvents).appendTo(container);
	}

	_sortEventsByLikeScore($('.timeline-left .timeline-events'), $('.timeline-left .event-container'));
	_sortEventsByLikeScore($('.timeline-right .timeline-events'), $('.timeline-right .event-container'));
}

function requestPong(id, callback) {
	$.post('/iamseoulmayor/like', {
		id: id
	}, function (res) {
		if (res.success) {
			callback(res.numLiked);
		} else {
			alert(res.message);
		}
	});
}

function requestDeleteEvent(id, passwd, callback) {
	$.post('/iamseoulmayor/event', {
		_method: 'delete',
		id: id,
		passwd: passwd
	}, function (res) {
		if (res.success) {
			callback();
		} else {
			alert(res.message);
		}
	});
}

function hideAddevents() {
	$('.form-addevent').slideUp();
	$('.button-addevent').slideDown();
}

function expandEvent(event) {
	$(event).toggleClass('expand');
	$('.event').not(event).removeClass('expand');
}

function scrollTo(top, immediate, callback) {
	if (immediate && immediate instanceof Function) {
		callback = immediate;
		immediate = false;
	}
	immediate = immediate || false;
	callback = callback || (function () {});

	if (immediate) {
		$('body,html').scrollTop(top - HEIGHT_MEMBER_PANEL);
		callback();
	} else {
		$('body,html').animate({
			scrollTop: top - HEIGHT_MEMBER_PANEL
		}, 300, callback);
	}
}

function resizeMemberPanel() {
	HEIGHT_MEMBER_PANEL = $('#member-panel').height();
	$('#spaceholder').css('height', HEIGHT_MEMBER_PANEL+'px');

	var menu = $('#menu');
	menu.css('top', HEIGHT_MEMBER_PANEL+'px');
	if (!menu.is(':visible')) {
		menu.fadeIn();
	}
}

function resizeProfileImage() {
	var windowHeight = $(window).height();
	if (windowHeight > 800) {
		$('#member-panel img.photo').removeClass('small');
	} else {
		$('#member-panel img.photo').addClass('small');
	}
	resizeMemberPanel();
}

function focusEvent(event_id) {
	if (event_id.length) {
		var sel = _.sprintf('.event-container[event_id="%s"]', event_id);
		var $event = $(sel);
		if ($event.size() > 0) {
			scrollTo($event.offset().top, true, function () {
				expandEvent($event.children('.event'));
			});
		}
	}
}

// on DOM load
$(function () {
	resizeProfileImage();
	if (getParameterByName('sortby') === 'like') {
		sortEventsByLikeScore();
	}
});

function showNewFeatureNotice() {
	var promotionOffset = $('.button-promotion').offset();
	var tooltip = $('#tooltip-promotion');
	tooltip.css('top', promotionOffset.top - tooltip.height()/2)
		.css('left', promotionOffset.left - tooltip.width() - 10)
		.fadeIn()
		.click(function (event) {
			stopPropagation(event);
			tooltip.hide();
		});
	setTimeout(function () {
		tooltip.fadeOut();
	}, 3000);
}

// on full load
$(window).load(function () {
	// load parameters passed
	var params = {};
	$('#params *[name]').each(function () {
		var $this = $(this);
		params[$this.attr('name')] = $this.val();
	});

	if (params.event_id) {
		focusEvent(params.event_id);
	} else if (window.location.hash) {
		scrollTo($(window.location.hash).offset().top, true);
	} else {
		scrollTo($('#timeline-panel').offset().top, true);
	}

	showNewFeatureNotice();
});

// events

$('.event').click(function () {
	expandEvent(this);
});

$('.event').not('.timeline-addevent .event').hover(function () {
	$(this).prev('.prong').addClass('hover');
}, function () {
	$(this).prev('.prong').removeClass('hover');
});

$('.button-pong').click(function (evt) {
	stopPropagation(evt);

	var $this = $(this);
	requestPong($this.attr('target_id'), function (numPonged) {
		$this.parents('.event,.pledge').find('.like').text(numPonged);
	});
});

$('.button-addevent').click(function () {

	function setDate() {
		var today = new Date();
		form.find('input[name="year"]').val(today.getFullYear());
		form.find('input[name="month"]').val(today.getMonth() + 1);
		form.find('input[name="day"]').val(today.getDate());
	}

	var button = $(this),
		form = $(this).parent().children('.form-addevent');

	hideAddevents();
	setDate();
	button.slideUp();
	form.slideDown();
});

$('.timeline-addevent form').submit((function () {
	function getFormValue(form, name) {
		return form.children('*[name="'+name+'"]').val();
	}

	function getFormDate(form) {
		return _.sprintf('%04d-%02d-%02d',
			parseInt(getFormValue(form, 'year'), 10),
			parseInt(getFormValue(form, 'month'), 10),
			parseInt(getFormValue(form, 'day'), 10));
	}

	function validate(data) {
		if (data.text.length > 140) {
			throw '140자가 넘는 글은 등록할 수 없습니다.';
		}
		if (data.link.length === 0) {
			throw '링크(출처)는 반드시 입력해야 합니다';
		}
		if (data.passwd.length == 0) {
			throw '비밀번호는 반드시 입력해야 합니다.';
		}
		if (data.passwd.length < 4) {
			throw '비밀번호는 4자 이상 입력해야 합니다.';
		}
	}

	return function () {
		var form = $(this);

		var data = {
			'title': getFormValue(form, 'title'),
			'topic': getFormValue(form, 'topic'),
			'date': getFormDate(form),
			'text': getFormValue(form, 'text'),
			'link': getFormValue(form, 'link'),
			'passwd': getFormValue(form, 'passwd')
		};

		try {
			validate(data);
		} catch (message) {
			alert(message);
			return false;
		}

		$.post('/iamseoulmayor/event', data, function (res) {
			if (res.success) {
				location.href = _.sprintf('/iamseoulmayor/event/%s', res.event_id);
			} else {
				alert(res.message || '');
			}
		});

		return false;
	};
})());

$('.timeline-addevent textarea[name="text"]').keyup(function () {
	var $this = $(this),
		len = $(this).val().length,
		lenleft = MAX_TEXT_LENGTH - len,
		$charleft = $this.siblings('.charleft');

	$charleft.text(lenleft);
	if (lenleft < 0) {
		$charleft.addClass('exceed');
	} else {
		$charleft.removeClass('exceed');
	}
});

$('.timeline-addevent .close').click(function (evt) {
	stopPropagation(evt);
	hideAddevents();
});

$('.event-container[event_id] .close').click(function (evt) {
	stopPropagation(evt);

	var passwd = prompt('이슈를 등록할 때 사용한 비밀번호를 입력해 주세요.');
	if (!passwd) {
		return;
	}

	var container = $(this).parents('.event-container'),
		id = container.attr('event_id');

	requestDeleteEvent(id, passwd, function () {
		alert('이슈를 삭제했습니다.');
		container.slideUp(function () {
			container.remove();
		});
	});
});

$('#menu a').click(function (evt) {
	stopPropagation(evt);

	var target = $(this).attr('href'),
		$target = $(target);

	if ($target.size()) {
		scrollTo($target.offset().top);
	}
});

$('.button-twitter').click(function (evt) {
	stopPropagation(evt);

	var id = $(this).parents('.event-container').attr('event_id');
	var name = $(this).parents('.timeline').attr('topic');
	var title = $(this).parents('.event').find('.title').text();

	var url = 'http://twitter.com/share'
			+ '?url=http%3A%2F%2Fwww.popong.com%2Fiamseoulmayor%2Fevent%2F'+id
			+ '&via=PopongC&text=나는 서울 시장이다!::'+name
			+ ', "'+title
			+ '" #popong';
	var w = window.open(url, "twitter", "width=600, height=255, menubar=0");
	w.focus();

	return false;
});

$('.button-facebook').click(function (evt) {
	stopPropagation(evt);

	// TODO: refactoring
	var id = $(this).parents('.event-container').attr('event_id');
	var name = $(this).parents('.timeline').attr('topic');
	var title = $(this).parents('.event').find('.title').text();
	var text = $(this).parents('.event').find('.text').text();
	var image = 'http://www.popong.com'
		+ ($(this).parents('.leftcolumn').size()
			? $('#member-panel .photo').first().attr('src')
			: $('#member-panel .photo').last().attr('src'));

	var url = 'http://www.facebook.com/sharer/sharer.php?s=100'
		+ '&p[url]=http%3A%2F%2Fwww.popong.com%2Fiamseoulmayor%2Fevent%2F'+id
		+ '&p[title]='+title
		+ '&p[summary]='+text
		+ '&p[images][0]='+image;
	var w = window.open(url, "Facebook", "width=600, height=400, menubar=0");
	w.focus();

	return false;
});

// pong 지수 설명
var tooltipPongTimer;
$('.like, .button-pong').mouseover(function (evt) {
	clearTimeout(tooltipPongTimer);

	$(this).addClass('hover');

	var tooltip = $('#tooltip-pong');
	tooltip.css('top', evt.pageY - tooltip.height() + 10);
	tooltip.css('left', evt.pageX + 10);

	if (!tooltip.is(':visible')) {
		tooltip.fadeIn('fast');
	}

}).mouseout(function () {
	var $this = $(this);
	clearTimeout(tooltipPongTimer);

	function hideTooltipPong() {
		if (!$this.hasClass('hover')) {
			$('#tooltip-pong').hide();
		} else {
			tooltipPongTimer = setTimeout(hideTooltipPong, 50);
		}
	}

	$this.removeClass('hover');

	tooltipPongTimer = setTimeout(hideTooltipPong, 50);
});

$('.like, .button-pong, #tooltip-pong').mousemove(function (evt) {
	var tooltip = $('#tooltip-pong');
	tooltip.css('top', evt.pageY - tooltip.height() + 10);
	tooltip.css('left', evt.pageX + 10);
});

$('#button-recruit').click(function (evt) {
	stopPropagation(evt);
	window.open($(this).attr('href'), 'we-need-designer', "width=1020, height=420, menubar=0");
	return false;
});

$('.button-promotion').click(function (evt) {
	stopPropagation(evt);
	window.open($(this).attr('href'), 'promotion', "width=1020, height=600, menubar=0");
	return false;
});

var resizeTimer;
$(window).resize(function () {
	clearTimeout(resizeTimer);
	resizeTimer = setTimeout(resizeProfileImage, 100);
});

})();
