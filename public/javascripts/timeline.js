(function () {

// constants
var MAX_TEXT_LENGTH = 140;

// functions
function requestPong(id, callback) {
	$.post('/like', {
		id: id
	}, function (res) {
		if (res.success) {
			callback(res.numLiked);
		} else {
			alert(res.message);
		}
	});
}

function showAddevent(topic, column) {
	var $addevent = $(_.sprintf('.%scolumn .addevent', column));

	if ($addevent.is(':visible')) {
		$addevent.slideUp();
	} else {
		$('.addevent').hide();

		var today = new Date();
		$addevent.find('.topic').text(topic);
		$addevent.find('input[name="topic"]').val(topic);
		$addevent.find('input[name="year"]').val(today.getFullYear());
		$addevent.find('input[name="month"]').val(today.getMonth() + 1);
		$addevent.find('input[name="day"]').val(today.getDate());
		$addevent.find('.charleft').text(MAX_TEXT_LENGTH);

		$addevent.slideDown();
	}
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

$('.event .button-pong').click(function () {
	var $this = $(this);
	requestPong($this.attr('target_id'), function (numPonged) {
		$this.parents('.event').find('.like').text(numPonged);
	});

	// cancel event propagation
	if (!e) var e = window.event;
	e.cancelBubble = true;
	if (e.stopPropagation) e.stopPropagation();
});

$('.button-addevent').click(function () {
	var $this = $(this);
	var topic = $this.prev('.name').text();
	var column = $this.parent('.leftcolumn').size() ? 'left' : 'right';
	showAddevent(topic, column);
});

$('.addevent form').submit((function () {
	function getFormValue(form, name) {
		return form.children('*[name="'+name+'"]').val();
	}

	function getFormDate(form) {
		return _.sprintf('%04d-%02d-%02d',
			parseInt(getFormValue(form, 'year')),
			parseInt(getFormValue(form, 'month')),
			parseInt(getFormValue(form, 'day')));
	}

	function validate(data) {
		if (data.text.length > 140) {
			throw '140자가 넘는 글은 등록할 수 없습니다.';
		}
		if (data.link.length <= 0) {
			throw '링크(출처)는 반드시 입력해야 합니다';
		}
	}

	return function () {
		var form = $(this);

		var data = {
			'title': getFormValue(form, 'title'),
			'topic': getFormValue(form, 'topic'),
			'date': getFormDate(form),
			'text': getFormValue(form, 'text'),
			'link': getFormValue(form, 'link')
		};

		try {
			validate(data);
		} catch (message) {
			alert(message);
			return false;
		}

		$.post('/event', data, function (res) {
			if (res.success) {
				location.href = '/';
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

$('.img-close').click(function () {
	$(this).parents('.event-container').slideUp();
});

})();
