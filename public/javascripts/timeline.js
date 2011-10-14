(function () {

// constants
var MAX_TEXT_LENGTH = 140;

// functions
function stopPropagation(e) {
	e = e || window.event;
	e.cancelBubble = true;
	if (e.stopPropagation) e.stopPropagation();
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

function showAddevent(topic, column) {
	var $addevent = $(_.sprintf('.%scolumn .addevent', column)),
		form = $addevent.find('.form-addevent'),
		button = $addevent.find('.button-addevent');

	hideAddevent();

	var today = new Date();
	form.find('.topic').text(topic);
	form.find('input[name="topic"]').val(topic);
	form.find('input[name="year"]').val(today.getFullYear());
	form.find('input[name="month"]').val(today.getMonth() + 1);
	form.find('input[name="day"]').val(today.getDate());
	form.find('.charleft').text(MAX_TEXT_LENGTH);

	button.hide();
	form.slideDown();
}

function hideAddevent() {
	$('.form-addevent').slideUp();
	$('.button-addevent').slideDown();
}

function focusEvent(event_id) {
	if (event_id.length) {
		var sel = _.sprintf('.event-container[event_id="%s"]', event_id);
		var $event = $(sel);
		$('body').animate({
			scrollTop: $event.offset().top
		}, 300, function () {
			expandEvent.apply($event.children('.event'));
		});
	}
}

function expandEvent() {
	var $this = $(this);
	$this.toggleClass('expand');
	$('.event').not(this).removeClass('expand');
}

// on load

$(function () {
	// load parameters passed
	var params = {};
	$('#params *[name]').each(function () {
		var $this = $(this);
		params[$this.attr('name')] = $this.val();
	});

	focusEvent(params.event_id);
});

// events
$('.event').click(function () {
	expandEvent.apply(this);
});

$('.event').not('.addevent .event').hover(function () {
	$(this).prev('.prong').children('.prong-lt').addClass('hover');
}, function () {
	$(this).prev('.prong').children('.prong-lt').removeClass('hover');
});

$('.event .button-pong').click(function (evt) {
	stopPropagation(evt);

	var $this = $(this);
	requestPong($this.attr('target_id'), function (numPonged) {
		$this.parents('.event').find('.like').text(numPonged);
	});
});

$('.button-addevent').click(function () {
	var $this = $(this);
	var topic = $this.parents('.member_panel').find('.name').attr('topic');
	var column = $this.parents('.leftcolumn').size() ? 'left' : 'right';
	showAddevent(topic, column);
});

$('.addevent form').submit((function () {
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

$('.addevent textarea[name="text"]').keyup(function () {
	var $this = $(this),
		len = $(this).val().length,
		lenleft = MAX_TEXT_LENGTH - len,
		$charleft = $this.next('.charleft');

	$charleft.text(lenleft);
	if (lenleft < 0) {
		$charleft.addClass('exceed');
	} else {
		$charleft.removeClass('exceed');
	}
});

$('.profile .img-close').click(function (evt) {
	stopPropagation(evt);

	$(this).parents('.event-container').slideUp();
});

$('.addevent .img-close').click(function (evt) {
	stopPropagation(evt);

	hideAddevent();
});

$('.event-container[event_id] .img-close').click(function (evt) {
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

$('.show-profile').click(function (evt) {
	stopPropagation(evt);
	$(this).parents('.member_panel').find('.profile').slideToggle();
});

$('.show-pledges').click(function (evt) {
	stopPropagation(evt);
	alert('준비 중입니다.');
});

$('.button-twitter').click(function (evt) {
	stopPropagation(evt);

	var id = $(this).parents('.event-container').attr('event_id');
	var name = $(this).parents('.member_panel').find('.name').attr('topic');
	var title = $(this).parents('.event').find('.title').text();

	var url = 'http://twitter.com/share'
			+ '?url=http%3A%2F%2Fwww.popong.com%2Fiamseoulmayor%2Fevent%2F'+id
			+ '&via=PopongC&text=나는 서울 시장이다!::'+name
			+ ', "'+title
			+ '" #popong';
	var w = window.open(url, "twitter", "width=600, height=255, menubar=0");
	w.focus();
});

$('.button-facebook').click(function (evt) {
	stopPropagation(evt);

	var id = $(this).parents('.event-container').attr('event_id');
	var url = 'http://www.facebook.com/sharer/sharer.php?u=http%3A%2F%2Fwww.popong.com%2Fiamseoulmayor%2Fevent%2F'+id;
	var w = window.open(url, "Facebook", "width=600, height=400, menubar=0");
	w.focus();
});

// pong 지수 설명
$('.like, .button-pong').mouseover(function (evt) {
	$(this).addClass('hover');
	var tooltip = $('#tooltip-pong');
	tooltip.css('top', evt.pageY - tooltip.height() + 10);
	tooltip.css('left', evt.pageX + 10);
	if (!tooltip.is(':visible')) {
		tooltip.fadeIn('fast');
	}
}).mouseout(function () {
	var $this = $(this);
	$this.removeClass('hover');
	var tooltip = $('#tooltip-pong');
	setTimeout(function () {
		if (!$this.hasClass('hover')) {
			$('#tooltip-pong').hide();
		}
	}, 20);
});

$('.like, .button-pong, #tooltip-pong').mousemove(function (evt) {
	var tooltip = $('#tooltip-pong');
	tooltip.css('top', evt.pageY - tooltip.height() + 10);
	tooltip.css('left', evt.pageX + 10);
});

})();
