(function () {

// functions
function requestPong(id, callback) {
	$.post('/like', {
		id: id
	}, function (data) {
		if (data.success) {
			callback(data.numLiked);
		} else {
			alert(data.message);
		}
	});
}

// events
$('.event').click(function () {
	// expand content
	var content = $('.content .text', this).toggleClass('expand');
	$('.content .text.expand').not(content).removeClass('expand');

	// show 'pong' button
	var pong = $('.extra .button-pong', this).toggleClass('hidden');
	$('.extra .button-pong:not(.hidden)').not(pong).addClass('hidden');
});

$('.event').hover(function () {
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
})();
