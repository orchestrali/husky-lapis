(function($) {

$.fn.centre = function() {
	return this.each(function() {
		var elem = $(this);
		elem.css({position: 'absolute',
			left: Math.max(0, (window.innerWidth - elem.outerWidth()) / 2),
			top: Math.max(0, (window.innerHeight - elem.outerHeight()) / 2)});
	});
};

})(jQuery);