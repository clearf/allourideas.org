$.ajaxSetup({
	timeout: 10000
});
FADE_TIME = 2000

$(document).ready(function() {
	// voting
  $('a.vote').live('click', function(e) {
		if ($(this).hasClass('loading')) {
			alert("One sec, we're loading the next pair...");
		} else {
			// visible if the users hasn't voted
			$('.click_to_vote').hide();

			$(this).addClass('checked');

			// prevent double clicking
			$('a.vote').addClass('loading');

			// store image location
			var x_click_offset = calculateClickOffset('x', e, $(this));
			var y_click_offset = calculateClickOffset('y', e, $(this));
			
			castVote($(this), x_click_offset, y_click_offset);
		}
		e.preventDefault();
  });

	// uploading a photo
	// uses ajaxupload.js (AjaxUpload throws an error if button isn't on page)
	var button = $('#choose_file');
	if (button.length != 0) {
		new AjaxUpload(button, {
	    action: button.attr('href'),
	    name: 'new_idea',
	    data: {
	      question_id : button.attr('question_id'),
	      authenticity_token: AUTH_TOKEN,
				locale: RAILS_LOCALE
	    },
	    autoSubmit: true,
	    responseType: false,
	    onChange: function(file, extension){
	      $('#photo_step_1').hide();
	      $('#photo_step_3').hide();
	      $('#photo_step_2').show();
	    },
	    onSubmit : function(file , ext){
	      // validate jpg, png, jpeg, or gif
	      if (! (ext && /^(jpg|png|jpeg|gif)$/i.test(ext))){
	        $('#photo_step_2').hide();
	        $('#photo_step_1').show();
	        $('#file_error').show();
	        return false;
	      }
	    },
	    onComplete : function(file){
	      $('#photo_step_1').hide();
	      $('#photo_step_2').hide();
	      $('#photo_step_3').show();
	    }
	  });
	};

	// can't decide submit (skip)
	$('#cant_decide_form').submit(function(e){
		submitCantDecide($(this));
		e.preventDefault();
	});

	// flag as inappropriate submit
	$('#flag_as_inappropriate_form').submit(function(e){
		submitFlag($(this));
		e.preventDefault();
	});

	// view ajax graph
	$('a.ajax_graph').live('click', function(e) {
		$('#graphs > li > a').removeClass('active');
		$(this).addClass('active');

		target = $('.target');
		target.html('<img src=/images/indicator.gif />')
		target.attr('id', $(this).attr('div_id'));

		if ($(this).attr('response_type') == 'script') {
			jQuery.get($(this).attr("href"), null, null, $(this).attr('response_type'));
		} else {
			// total hack for world map
			var iframe_html= "<iframe id='voter_map_iframe' src='" + $(this).attr('href') + "' onload='iframe_loaded();' width='100%' height='370px' frameborder=0 scrolling=no style='border:1px solid #666;'></iframe>"
			target.html(iframe_html);
			// jQuery.get($(this).attr("href"), function(data) {
			//   target.html(data);
			// });
		}

		e.preventDefault();
	});

	// toggle activation on admin
	$('input.activation').live('click', function(e) {
		toggleChoiceActivation($(this));
	});

	$('input.auto_activation').live('click', function(e) {
		toggleQuestionAutoActivation($(this));
	});
});

function submitCantDecide(form) {
	var VOTE_CAST_AT = new Date();
	var reason = $('input[name=cant_decide_reason]:checked').val();

	if (reasonValid(reason)) {
		clearImages();
		$('a.vote').addClass('loading');
		$('#cant_decide_options').dialog('close');
		$('input[name=cant_decide_reason]').attr('checked', false); // clear radio buttons
		$('input[name=reason_text]').val(''); // clear text box

		jQuery.ajax({
			type: 'POST',
			dataType: 'json',
		  url: form.attr('action'),
		  data: {
				cant_decide_reason: reason,
				prompt_id: $('#prompt_id').val(),
		    appearance_lookup: $('#appearance_lookup').val(),
				time_viewed: VOTE_CAST_AT - PAGE_LOADED_AT,
				authenticity_token: encodeURIComponent(AUTH_TOKEN),
				locale: RAILS_LOCALE
		  },
		  error: function(request, textStatus, errorThrown) {
				voteError(request, textStatus, errorThrown);
			},
		  success: function(data, textStatus, request) {
				loadNextPrompt(data);
				PAGE_LOADED_AT = new Date(); // reset the page load time
			}
		});
	}
}

function submitFlag(form) {
	var VOTE_CAST_AT = new Date();
	var reason = jQuery.trim($('#inappropriate_reason').val());
	$('#inappropriate_reason').val('');

 	if(!reason){
  	alert("Please include an explanation");
    return false;
 	} else {
		clearImages();
		$('a.vote').addClass('loading');
		$('#flag_as_inappropriate').dialog('close');

		jQuery.ajax({
			type: 'POST',
			dataType: 'json',
		  url: form.attr('action'),
		  data: {
				flag_reason: reason,
				side: $('#inappropriate_side').val(),
				prompt_id: $('#prompt_id').val(),
		    appearance_lookup: $('#appearance_lookup').val(),
				time_viewed: VOTE_CAST_AT - PAGE_LOADED_AT,
				authenticity_token: encodeURIComponent(AUTH_TOKEN),
				locale: RAILS_LOCALE
		  },
		  error: function(request, textStatus, errorThrown) {
				voteError(request, textStatus, errorThrown);
			},
		  success: function(data, textStatus, request) {
				loadNextPrompt(data);
				$('#item_count').text(
					decrement($('#item_count').text())
				);
				PAGE_LOADED_AT = new Date(); // reset the page load time
			}
		});
	}
}

function reasonValid(reason) {
	if (!reason) {
	  alert("Please select a reason");
	  return false;
	} else {
		if(reason == 'user_other'){
			user_text = jQuery.trim($('input[name=reason_text]').val());
	   	if(!user_text){
	    	alert("Please include an explanation");
	      return false;
	   	}
		}
		return true;
	}
}

function castVote(choice, x, y) {
	var VOTE_CAST_AT = new Date();

	// a/b test transition animation
	if (VOTE_CROSSFADE_TRANSITION) {
		clearImagesCrossfade();
	} else {
		clearImages();
	}


	jQuery.ajax({
		type: 'POST',
		dataType: 'json',
	  url: choice.attr('href'),
	  data: {
	  	authenticity_token: encodeURIComponent(AUTH_TOKEN),
			time_viewed: VOTE_CAST_AT - PAGE_LOADED_AT,
	    appearance_lookup: $('#appearance_lookup').val(),
			x_click_offset: x,
			y_click_offset: y
	  },
	  error: function(request, textStatus, errorThrown) {
			voteError(request, textStatus, errorThrown);
		},
	  success: function(data, textStatus, request) {
			preloadFuturePhotos(data);
			updateVotingHistory(data);

			// the ordering of these functions is important
			// because some rely on attrs of the a.vote
			// and others modify those attrs
			if (!VOTE_CROSSFADE_TRANSITION) { loadNextPrompt(data); };
			updateUrlsAndHiddenFields(data);
			if (VOTE_CROSSFADE_TRANSITION) { $('a.vote').removeClass('loading'); };
			incrementVoteCount();
			choice.removeClass('checked');
			PAGE_LOADED_AT = new Date(); // reset the page load time
		}
	});
}

function incrementVoteCount() {
	$('#votes_count').text(
		increment($('#votes_count').text())
	);
}

function toggleChoiceActivation(checkbox) {
	var span = checkbox.next()
	var label = checkbox.parents('label')
	span.text('...')

	jQuery.ajax({
		type: 'POST',
		dataType: 'json',
	  url: checkbox.attr('href'),
	  data: {
	  	authenticity_token: encodeURIComponent(AUTH_TOKEN)
	  },
	  error: function(request, textStatus, errorThrown) {
			voteError(request, textStatus, errorThrown);
		},
	  success: function(data, textStatus, request) {
			label.removeClass('Deactivated');
			span.text(data['verb']);
			label.addClass(data['verb']);
		}
	});
}

function toggleQuestionAutoActivation(checkbox) {
	var span = checkbox.next();
	var label = checkbox.parents('label');
	var saved_text = span.text();
	span.text('...');

	jQuery.ajax({
		type: 'POST',
		dataType: 'json',
	  url: checkbox.attr('href'),
	  data: {
	  	authenticity_token: encodeURIComponent(AUTH_TOKEN)
	  },
	  error: function(request, textStatus, errorThrown) {
			voteError(request, textStatus, errorThrown);
		},
	  success: function(data, textStatus, request) {
			span.text(saved_text);
		}
	});
}

function calculateClickOffset(axis, e, choice) {
	var offset = $(choice).find('img').offset();

	// if there is any border on the image
	// you need to subtract it from the offset here (ie 3 px)
	if (axis == 'x') {
		return (e.pageX - offset.left - 3);
	} else {
		return (e.pageY - offset.top - 3);
	}
}

function updateVotingHistory(data) {
	var winner = data['voted_prompt_winner'];
	updateVisitorVotes(data['visitor_votes']);

	$('#your_votes').prepend("\
		<li>\
			<img src='" + $('.left').attr('thumb') + "' class='" + (winner == 'left' ? 'winner' : 'loser') + "'/>\
			<img src='" + $('.right').attr('thumb') + "' class='" + (winner == 'right' ? 'winner' : 'loser') + "'/>\
			<!-- <span class='timeago' title='" + data['voted_at'] + "'>" + data['voted_at'] + "</span> -->\
		</li>\
		");
	$('#your_votes').children(":first").effect("highlight", {}, 3000);
	$(".timeago").timeago();
}

function updateVisitorVotes(number_of_votes) {
	// update vote count
	$('#visitor_votes').text(number_of_votes);

	// your voteS unless you've only voted once
	(number_of_votes == 1) ? $('#s').hide() : $('#s').show();
}


function loadNextPrompt(data) {
	jQuery.each(['left', 'right'], function(index, side) {
		var current_table = $('a.vote.' + side + ' > table.current');

		// change photos
		current_table.html("<tr><td><img style='display:none;' src='" + data['new' + side + '_photo'] + "'/></td></tr>");

		// fade in photo
		current_table.find('img').fadeIn(FADE_TIME, function() {
			// allow voting after fully faded in
			$('a.vote.' + side).removeClass('loading');
		});
	});
}

// a variation of the clearImages method being a/b tested
function clearImagesCrossfade() {
	jQuery.each(['left', 'right'], function(index, side) {
		// current table
		var link = $('a.vote.' + side);
		var current_table = $('a.vote.' + side + ' > table');
		var current_image = current_table.find('img');

		// duplicate the table holding the image
		// add the class 'fade' to it and remove 'current'
		$('a.vote.' + side).prepend($('a.vote.' + side).html());
		var fade_table = $('a.vote.' + side + ' > table:first');
		fade_table.removeClass('current').addClass('fade');

		// switch the current_tables img to the next photo
		current_image.attr('src', link.attr('future_photo'));

		// fade out and remove the fade_table
		fade_table.animate({opacity: 0}, FADE_TIME, function() {
			fade_table.remove();
		});
	});
}

function preloadFuturePhotos(data) {
	jQuery.preLoadImages(data["future_left_photo"]);
	jQuery.preLoadImages(data["future_right_photo"]);
}

function updateUrlsAndHiddenFields(data) {
	jQuery.each(['left', 'right'], function(index, side) {
		// change photo thumb
		$('a.vote.' + side).attr('thumb', data['new' + side + '_photo_thumb']);
		// change future photo
		$('a.vote.' + side).attr('future_photo', data['future_' + side + '_photo']);
		// change href url
		$('a.vote.' + side).attr('href', data['new' + side + '_url']);
	});

	// change appearance_lookup and prompt_id hidden fields
	$('#appearance_lookup').val(data['appearance_lookup']);
	$('#prompt_id').val(data['prompt_id']);

	// change urls for inappropriate and skip forms
	$('#flag_as_inappropriate_form').attr('action', data['flag_url']);
	$('#cant_decide_form').attr('action', data['skip_url']);
}

function voteError(request, textStatus, errorThrown) {
	alert(textStatus);
}

function increment(number){
	return parseInt(number) + 1;
}

function decrement(number){
	return parseInt(number) - 1;
}

function clearImages() {
	$('a.vote.right > table').find('img').fadeOut(FADE_TIME, function() {
		$(this).remove();
	});
	
	$('a.vote.left > table').find('img').fadeOut(FADE_TIME, function() {
		$(this).remove();
	});
}

(function($) {
  var cache = [];
  // Arguments are image paths relative to the current page.
  $.preLoadImages = function() {
    var args_len = arguments.length;
    for (var i = args_len; i--;) {
      var cacheImage = document.createElement('img');
      cacheImage.src = arguments[i];
      cache.push(cacheImage);
    }
  }
})(jQuery)

