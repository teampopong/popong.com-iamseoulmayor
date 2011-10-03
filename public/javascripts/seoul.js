(function () {

function getFormValue(form, name) {
	return form.children('*[name="'+name+'"]').val();
}

$(function () {
	var form = $('#submit form');
	form.submit(function () {
		var data = {
			/* FIXME: fill zero */
			'date': getFormValue(form, 'year') + '-' + getFormValue(form, 'month')
					+ '-' + getFormValue(form, 'day'),
			'text': getFormValue(form, 'text'),
			'link': getFormValue(form, 'link')
		};
		$.post('/event', data, function () {
			location.href = '/index.html';
		});
		return false;
	});

	var ltimeline = Timeline($('.leftcolumn .timeline').get(0), 359, 400, 'right');
	var rtimeline = Timeline($('.rightcolumn .timeline').get(0), 359, 400, 'left');

	$.get('/event', function(events) {
		ltimeline.draw(events);
		rtimeline.draw(events);
	});
});

})();
