(function () {

$(function () {
	var form = $('#submit form');

	function getFormValue(name) {
		return form.children('*[name="'+name+'"]').val();
	}

	function getFormDate() {
		return _.sprintf('%04d-%02d-%02d', parseInt(getFormValue('year')),
				parseInt(getFormValue('month')), parseInt(getFormValue('day')));
	}

	form.submit(function () {
		var data = {
			'date': getFormDate(),
			'text': getFormValue('text'),
			'link': getFormValue('link')
		};
		$.post('/event', data, function () {
			location.href = '/index.html';
		});
		return false;
	});

	var ltimeline = Timeline($('.leftcolumn .timeline').get(0), 341, 'right');
	var rtimeline = Timeline($('.rightcolumn .timeline').get(0), 341, 'left');

	$.get('/event', function(events) {
		ltimeline.draw(events);
		rtimeline.draw(events);
	});
});

})();
