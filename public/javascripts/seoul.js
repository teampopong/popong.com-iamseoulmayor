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

	var timeline = Timeline('timeline', 800, 400);

	$.get('/event', function(events) {
		timeline.draw(events);
	});
});

})();
