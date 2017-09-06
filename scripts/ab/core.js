var DT = {},
    task = {};

$(function () {
    //do we have IE here!?
    if (navigator.userAgent.match(/msie/i) || navigator.userAgent.match(/trident/i)) {
        $("html").addClass("ie");
    }


    //hints
    $('[rel=popover]').popover({ 'trigger': 'manual' });
    if ($('[hints]').length && help) {
        $('#helpButton').css({ "display": "block" });

        /**********help-button**********/
        $('#helpButton').click(function () {
            openHints();
            return false;
        });

        /*********resize_window********/
        var onResize = function (e) {
            $.each($('[hints]'), function (index) {
                setHelperLayerPosition($('.hints-helperLayer').get(index), $(this).get(0));
            });
        };

        /********help-open-hints********/
        function openHints() {
            $('body').append('<div id="overlay" class="modal-backdrop in"></div>');
            $('#overlay').click(function () {
                closeHints();
            });

            $.each($('[hints]'), function (index) {
                $('body').append("<div class='hints-helperLayer'></div>");

                setHelperLayerPosition($('.hints-helperLayer').get(index), $(this).get(0));
                if (window.attachEvent) {           ////resize window
                    window.attachEvent('onresize', onResize);
                }
                else if (window.addEventListener) {
                    window.addEventListener('resize', onResize);
                }

                $(this).css({ "z-index": "1021", "position": "relative" });

                var options = (allOptions[$(this).attr("hints")]) ? allOptions[$(this).attr("hints")] : {};  //get options
                options.trigger = "hover";  // add a trigger
                $(this).popover(options);
            });
        }

        /*******help-close-hints********/
        function closeHints() {
            $('.hints-helperLayer').remove();
            $('[hints]').popover('destroy');
            $('#overlay').remove();

            if (window.detachEvent) {
                window.detachEvent('onresize', onResize);
            }
            else if (window.removeEventListener) {
                window.removeEventListener('resize', onResize);
            }
        }

        /********get-size-of-DOM********/
        function getOffset(element) {
            var elementPosition = {};
            elementPosition.width = element.offsetWidth;
            elementPosition.height = element.offsetHeight;
            var _x = 0;
            var _y = 0;
            while (element && !isNaN(element.offsetLeft) && !isNaN(element.offsetTop)) {
                _x += element.offsetLeft;
                _y += element.offsetTop;
                element = element.offsetParent;
            }
            elementPosition.top = _y;
            elementPosition.left = _x;

            return elementPosition;
        };

        /*******set-LayerPosition*******/
        function setHelperLayerPosition(helperLayer, element) {
            var elementPosition = getOffset(element),
                widthHeightPadding = 10;

            helperLayer.setAttribute('style', 'width: ' + (elementPosition.width + widthHeightPadding) + 'px; ' +
                'height:' + (elementPosition.height + widthHeightPadding) + 'px; ' +
                'top:' + (elementPosition.top - 5) + 'px;' +
                'left: ' + (elementPosition.left - 5) + 'px;');
        }


    }

    //tooltips
    $('body').tooltip({
        selector: '[data-toggle="tooltip"]',
        trigger: 'hover'
    });

});


//---------------------utils functions---------------------

var ActionsHandler = function (e) {

    e.stopPropagation();

    var $span = $(this),
        span_params = {},
        actions = posted_actions = [],
        $loader = $('<div class="loadFacebookG" style="visibility: visible; position: absolute;"><div class="loadFacebookC"><div id="blockG_1" class="facebook_blockG"></div><div id="blockG_2" class="facebook_blockG"></div><div id="blockG_3" class="facebook_blockG"></div></div></div>');
        
    if($span.attr('aria-describedby') && $('#'+$span.attr('aria-describedby')).length){
        $span.tooltip('hide');
    }

    var SingleActionCallback = function(data){
            if (data.error){
                ShowAlert('danger', data.error in tfu_js ? tfu_js[data.error] : data.error);
            } else {
                task = data;
            }                
        }

    var AllActionsCallback = function(data){
            if(task.t_id){
                if(typeof $modal !== 'undefined' && ($modal.data('bs.modal') || {isShown: false}).isShown){
                    $modal.find('button.main-button').removeAttr('disabled');
                    $modal.modal('hide');
                    UpdateTaskUI(task);
                    if (typeof e.data.pageCallback === "function") {
                        e.data.pageCallback();
                    }
                } else {
                    $loader.remove();
                    UpdateTaskUI(task);
                    $span.css({ 'visibility': 'visible' });
                }
            } else if(task.deleted) {
                window.location.href = 'index.php';
            } else { //error occured :(
                if(typeof $modal !== 'undefined' && ($modal.data('bs.modal') || {isShown: false}).isShown){
                    $modal.find('button.main-button').removeAttr('disabled');
                    $modal.modal('hide');
                }                
            }
        }

    //prepare data-.. params of the span
    $.each(this.attributes, function() {
        if(this.specified && this.name.indexOf('data-') === 0) {
            span_params[this.name.substr(5)] = this.value;
        }
    });

    if(span_params.direct_action === '1'){ //action without modal form

        $loader.css({
            height: $span.outerHeight() + 'px',
            top: '0',
            left: 'calc(50% - 16px)',
        });
        $span.css({ 'visibility': 'hidden' }).append($loader);

        span_params.actions.split(/[\s,]+/).forEach(function(action) {
            posted_actions.push(
                $.post("ajax_" + action + ".php", span_params, SingleActionCallback, "json")
            );
        });
        posted_actions.push( (function () {
            var dfd = $.Deferred();
            setTimeout(function () { dfd.resolve(); }, 800);
            return dfd.promise();
        })() );

        //when all actions finish, update UI or redirect
        Promise.all(posted_actions).then(
            AllActionsCallback,
            function (error) { console.log(error); }
        );


    } else { //load modal form for the action

        $.get(
            "ajax_get_modal_form.php",
            span_params,
            function (html) {

                if(html === 'no task found'){
                    ShowAlert('danger', 'no task found' in tfu_js ? tfu_js['no task found'] : 'no task found');
                    return;
                }

                $modal = $(html);
                $modal.modal();

                //-------------------custom modal handlers-----------------
                //show resp. select when status = work
                if($('input[name="actions[]"][value="task_status_change"]').length){
                    var UpdateWorkerSelect = function(){
                        if($modal.find('#t_status').val() === 'work'){
                            $modal.find('#w_id').closest('.form-group').show();
                            $modal.find('input[name="actions[]"][value="task_worker_change"]').removeAttr('disabled');
                        } else {
                            $modal.find('#w_id').closest('.form-group').hide();
                            $modal.find('input[name="actions[]"][value="task_worker_change"]').attr('disabled', 'disabled');
                        }
                    }
                    UpdateWorkerSelect();
                    $modal.on('change', '#t_status', UpdateWorkerSelect);
                }

                //tags
                if($('input[name="actions[]"][value="task_tags_change"]').length){
                    AttachTagsEventsHandlers( $modal );
                }

                //-------------------main modal handlers-------------------
                //prevent modal close when action in progress
                $modal.on('hide.bs.modal', function (e) {
                    if($modal.find('button.main-button[disabled]').length){
                        e.preventDefault();
                    }
                });

                //remove modal when hidden
                $modal.on('hidden.bs.modal', function (e) {
                    $modal.remove().data('bs.modal', null);
                });
                
                //parse form and send to actions ajax-files!
                $modal.on('click', 'button.main-button', function () {

                    $(this).attr('disabled', 'disabled');
                    var form_params = $modal.find('form').serializeArray().reduce(
                            function (a, x) {
                                a[x.name] = x.value;
                                return a;
                            },
                            {}
                        );
                    delete form_params['actions[]'];

                    $modal.find('input[name="actions[]"]:not([disabled])').each(function() {
                        posted_actions.push(
                            $.post( "ajax_" + $(this).val() + ".php", form_params, SingleActionCallback, "json")
                        );
                    });

                    //when all actions finish, update UI or redirect
                    Promise.all(posted_actions).then(
                        AllActionsCallback,
                        function (error) { console.log(error); }
                    );

                });

            }
        );

    }
    
}


//updates task fields and UI according to new data and policy
function UpdateTaskUI(task) {
    var t_id = task.t_id,
        policy = task.policy,
        isTable = ($.fn.dataTable && $.fn.dataTable.isDataTable(DT)),
        row = isTable ? DT.row('#'+t_id).data() : {},        
        HTML_draft_icon = '<span class="glyphicon glyphicon-hourglass active-ico"></span>';
        HTML_eye_icon = '<span class="glyphicon glyphicon-eye-close active-ico"></span>';
        HTML_fire_icon = '<span class="glyphicon glyphicon-fire active-ico"></span>';
        HTML_ready_icon = '<i class="fa fa-circle"></i>';
    
    //icon: draft
    var colname = 'task_title';
    if(colname in row){ //table
        var $container = $('<div>' + row[colname] + '</div>');
        if(task.t_draft) {
            if(!$container.find('.glyphicon-hourglass').length){
                $container.find('a:first, span.t_tm_count_block').last().after(HTML_draft_icon);
            }
        } else {
            $container.find('.glyphicon-hourglass').remove();
        }
        row[colname] = $container.html();
    } else { //task page
        var $t_draft = $('#' + t_id + '_t_draft');
        if($t_draft.length){
            if(policy.task_t_draft_edit){
                $t_draft.attr('data-active', 1);
                task.t_draft ? $t_draft.addClass('active-ico') : $t_draft.removeClass('active-ico');
                $t_draft.show();
            } else {
                $t_draft.hide();
            }
        }
    }

    //icon: eye
    var colname = 'task_title';
    if(colname in row){ //table
        var $container = $('<div>' + row[colname] + '</div>');
        if(task.t_eye) {
            if(!$container.find('.glyphicon-eye-close').length){
                $container.find('a:first, span.t_tm_count_block, span.glyphicon-hourglass').last().after(HTML_eye_icon);
            }
        } else {
            $container.find('.glyphicon-eye-close').remove();
        }
        row[colname] = $container.html();
    } else { //task page
        var $t_eye = $('#' + t_id + '_t_eye'); 
        if($t_eye.length){
            if(policy.task_t_eye_see){
                $t_eye.attr('data-active', policy.task_t_eye_edit);
                if(task.t_eye){
                    $t_eye.addClass('active-ico');
                    $('.message-wrap').addClass('message-wrap-task-eye');
                    $('.message-eye').addClass('task-eye-active-ico');
                } else {
                    $t_eye.removeClass('active-ico');
                    $('.message-wrap').removeClass('message-wrap-task-eye');
                    $('.message-eye').removeClass('task-eye-active-ico');
                }
                $t_eye.show();
            } else {
                $t_eye.fadeOut('slow');
            }
        }
    }

    //icon: fire
    var colname = 'task_title';
    if(colname in row){//table
        var $container = $('<div>' + row[colname] + '</div>');
        if(task.t_fire) {
            if(!$container.find('.glyphicon-fire').length){
                $container.find('a:first, span.t_tm_count_block, span.glyphicon-hourglass, span.glyphicon-eye-close').last().after(HTML_fire_icon);
            }
        } else {
            $container.find('.glyphicon-fire').remove();
        }
        row[colname] = $container.html();
    } else {
        var $t_fire = $('#' + t_id + '_t_fire'); 
        if($t_fire.length){
            $t_fire.attr('data-active', policy.task_t_fire_edit);
            task.t_fire ? $t_fire.addClass('active-ico') : $t_fire.removeClass('active-ico');
            $t_fire.show();
        }
    }

    //icon: important
    var colname = 'task_title';
    if(colname in row){ //table
        var $container = $('<div>' + row[colname] + '</div>');
        if(task.t_important) {
            if(!$container.find('span.bold').length){
                $container.find('a:first, span.t_tm_count_block').wrapInner('<span class="bold"></span>');
            }
        } else {
            $container.find('span.bold').contents().unwrap();
        }
        row[colname] = $container.html();
    } else { //task page
        var $t_important = $('#' + t_id + '_t_important'); 
        if($t_important.length){
            $t_important.attr('data-active', policy.task_t_important_edit);
            task.t_important ? $t_important.addClass('active-ico') : $t_important.removeClass('active-ico');
            $t_important.show();
        }
    }

    //task_ready
    var colname = 'task_title';
    if(colname in row){ //table
        var $container = $('<div>' + row[colname] + '</div>');
        if(task.t_ready) {
            if(!$container.find('.fa-circle').length){
                $container.find('a:first, span.t_tm_count_block, span.glyphicon-hourglass, span.glyphicon-eye-close, span.glyphicon-fire').last().after(HTML_ready_icon);
            }
        } else {
            $container.find('.fa-circle').remove();
        }
        row[colname] = $container.html();
    } else { //task page
        var $task_ready = $('#task_ready'); 
        if($task_ready.length){
            policy.task_ready_set && task.u_role !== 'developer' ? $task_ready.show() : $task_ready.hide();
        }
    }


    if(!isTable){

        //task_ready_developer (task page only)
        var $task_ready_developer = $('#task_ready_developer'); 
        if($task_ready_developer.length){
            policy.task_ready_set && task.u_role === 'developer' ? $task_ready_developer.show() : $task_ready_developer.fadeOut('slow');
        }

        //task_ready_cancel (task page only)
        var $task_ready_cancel = $('#task_ready_cancel'); 
        if($task_ready_cancel.length){
            policy.task_ready_cancel ? $task_ready_cancel.parent().show() : $task_ready_cancel.parent().hide();
        }

        //task_delete (task page only)
        var $task_delete = $('#task_delete'); 
        if($task_delete.length){
            policy.task_delete ? $task_delete.show() : $task_delete.fadeOut('slow');
        }

        //date of creation (task page only)
        var id = '#' + t_id + '_t_created';
        if($(id).length){
            var $el = $(id).clone(),
                title = task.t_created;

            $el.html(title);
            UpdateUIField(id, null, $el);
        }

        //date of update (task page only)
        var id = '#' + t_id + '_t_updated';
        if($(id).length){
            var $el = $(id).clone(),
                title = task.t_updated;

            $el.html(title);
            UpdateUIField(id, null, $el);
        }

    }

    //status (task page or in tables)
    var id = '#' + t_id + '_t_status',
        colname = 'task_status';

    if(colname in row || $(id).length){
        var $el = colname in row ? $('<div>' + row[colname] + '</div>').find(id) : $(id).clone(),
            title = task.t_status_title;

        $el.attr({
            'data-t_status': task.t_status,
            'style': task.t_status_style,
            'data-w_id': task.resp_id,
            'data-active': (policy.task_allowed_statuses.length > 0 ? 1 : 0)
        });

        if(!(colname in row) && task.t_ready && policy.task_ready_see){
            title += '<i class="fa fa-circle"></i>';
            $el.attr('data-toggle', "tooltip");
            $el.attr('data-placement', "bottom");
            $el.attr('data-original-title', tfu_js['need checking']);
        }

        $el.html(title);
        
        UpdateUIField(id, colname, $el);
    }

    //responsible (task page or in tables)
    var id = '#' + t_id + '_t_worker_id',
        colname = 'task_responsible';

    if(colname in row || $(id).length){
        var $el = colname in row ? $('<div>' + row[colname] + '</div>').find(id) : $(id).clone(),
            title = colname in row ? task.resp_name : task.resp_name_extented;

        $el.attr({
            'data-w_id': task.resp_id,
            'data-active': policy.task_assign
        }).html(title);
        
        UpdateUIField(id, colname, $el);
    }

    //tags (task page or in tables)
    var id = '#' + t_id + '_t_tags',
        colname = 'task_title';

    if(colname in row || $(id).length){
        var $el = colname in row ? $('<div>' + row[colname] + '</div>').find(id) : $(id).clone(),
            title = task.t_tags;

        title === '&nbsp;&mdash;&nbsp;' ? $el.addClass('empty-tags') : $el.removeClass('empty-tags');
        $el.attr({ 'data-active': policy.task_tags_edit }).html(title);
        
        (function (id, colname, $el) {
            var fade = ($(id).length && $(id).html() !== '' && $(id).html() !== $el.html() ? [$(id)[0]] : []);
            $(fade).fadeOut('slow').promise().done( function () {
                if(colname && colname in row){
                    DT.cell('#'+t_id, colname+':name').data( $el.parent().html() );
                } else {
                    $(id).replaceWith( $el[0].outerHTML );
                }
                $(fade).fadeIn('fast');
            });
        })(id, colname, $el);
    }

    //hours (task page or in tables)
    var twh_id = '#' + t_id + '_twh_amount_sum',
        tch_id = '#' + t_id + '_tch_amount_sum',
        colname = 'task_hours',
        separator_id = '#' + t_id + '_hours_separator';

    var Populate = function (type, $el, html) {
            task.t_hours_check && type === 'worker' ? $el.addClass('red') : $el.removeClass('red');
            $el.attr({
                'data-original-title': task[ type+'_hours_tooltip' ],
                'data-active': policy[ 'task_'+type+'_hours_edit' ]
            });
            $el.html(html);
        };

    if(colname in row){ //table

        var $container = $('<div>' + row[colname] + '</div>'),
            $separator = $container.find(separator_id),
            fade =[];

        if(policy.task_worker_hours_see){
            Populate( 'worker', $container.find(twh_id), task.twh_amount_sum );
        } else {
            $container.find(twh_id).html('');
        }

        if($separator.length){
            if(policy.task_worker_hours_see && policy.task_client_hours_see){
                $separator.html('&nbsp;/&nbsp;'); 
            } else {
                $separator.html('');
            }
        }

        if(policy.task_client_hours_see){
            Populate( 'client', $container.find(tch_id), task.tch_amount_sum );
        } else {
            $container.find(tch_id).html('');
        }

        if($(twh_id).length && $(twh_id).html() !== '' && $(twh_id).html() !== task.twh_amount_sum){
            fade.push($(twh_id)[0]);
        }
        if($(tch_id).length && $(tch_id).html() !== '' && $(tch_id).html() !== task.tch_amount_sum){
            fade.push($(tch_id)[0]);
        }

        $(fade).fadeOut('slow').promise().done( function () {
            DT.cell('#'+t_id, colname+':name').data( $container.html() );
            $(fade).fadeIn('fast');
        });

    } else if ($(twh_id).length || $(tch_id).length) { //task page

        if($(twh_id).length){
            var $t_twh_amount_sum = $(twh_id);
            if(policy.task_worker_hours_see){
                if($t_twh_amount_sum.html() === '' || $t_twh_amount_sum.html() === task.twh_amount_sum){
                    Populate( 'worker', $t_twh_amount_sum, task.twh_amount_sum );
                    $t_twh_amount_sum.show();
                } else {
                    $t_twh_amount_sum.fadeOut('slow', function () {
                        Populate( 'worker', $t_twh_amount_sum, task.twh_amount_sum );
                        $t_twh_amount_sum.fadeIn('fast');
                    });
                }
            } else {
                $t_twh_amount_sum.fadeOut('slow');
            }
        }

        if($(separator_id).length){
            if(policy.task_worker_hours_see && policy.task_client_hours_see){
                $(separator_id).html('&nbsp;/&nbsp;');
            } else {
                $(separator_id).html('');
            }
        }

        if($(tch_id).length){
            var $t_tch_amount_sum = $(tch_id);
            if(policy.task_client_hours_see){
                if($t_tch_amount_sum.html() === '' || $t_tch_amount_sum.html() === task.tch_amount_sum){
                    Populate( 'client', $t_tch_amount_sum, task.tch_amount_sum );
                    $t_tch_amount_sum.show();
                } else {
                    $t_tch_amount_sum.fadeOut('slow', function () {
                        Populate( 'client', $t_tch_amount_sum, task.tch_amount_sum );
                        $t_tch_amount_sum.fadeIn('fast');
                    });
                }
            } else {
                $t_tch_amount_sum.fadeOut('slow');
            }
        }

    }

    //--------
    function UpdateUIField(id, colname, $el){
        var fade = ($(id).length && $(id).html() !== '' && $(id).html() !== $el.html() ? [$(id)[0]] : []);
        $(fade).fadeOut('slow').promise().done( function () {
            if(colname && colname in row){
                if($el.siblings('.sortdata').length){
                    $el.siblings('.sortdata').text($el.html());
                    DT.cell('#'+t_id, colname+':name').data( $el.siblings('.sortdata')[0].outerHTML + $el[0].outerHTML );
               } else {
                    DT.cell('#'+t_id, colname+':name').data( $el[0].outerHTML );
               }
            } else {
                $(id).replaceWith( $el[0].outerHTML );
            }
            $(fade).fadeIn('fast');
        });
    }
    //--------

}

//tags events handlers
function AttachTagsEventsHandlers($modal){
    var $form = $modal.find('form'),
        project_tags = $form.find('input[name="project_tags"]').val().split(/\s*,\s*/),
        $untouch = $form.find('input[name="untouch_tags"]'),
        untouch_tags = $untouch.val().split(/\s*,\s*/),
        $input = $form.find('input[name="t_tags"]'),
        task_tags = $input.val().split(/\s*,\s*/),
        $container = $('<div></div');

    !project_tags[0].length && project_tags.splice(0, 1);
    !untouch_tags[0].length && untouch_tags.splice(0, 1);
    !task_tags[0].length && task_tags.splice(0, 1);

    $form.prepend($container);
    $container.html( GetTagsHTML() );

    //add tag
    $form.on('change', '#add_tag', function(){
        var tag = $(this).val();
        if(tag === '#!?newtag?!#'){
            $('.new-tag-input').html('<input class="form-control" type="text" name="new_tag" id="new_tag_input">'); 
            $('.new-tag-button').html('<span class="btn btn-xs btn-primary" id="new_tag_button">' + tfu_js['create'] +'</span>');
            $('#new_tag_input').focus();
        } else {
            task_tags.push( tag );
            $input.val(task_tags.join(', '));
            $container.find('.tags-container').fadeOut('fast', function () {
                $container.html( GetTagsHTML() );
            });
        }
    });

    //create tag
    $form.on('click', '#new_tag_button', function(){
        var $new_tag = $('#new_tag_input');
        if(!$new_tag.val().length){
            $new_tag.wrap('<div class="has-error"></div>');
            $('<span id="helpTag" class="help-block" style="line-height: 1.2;">' + tfu_js['no empty tag'] + '</span>').insertAfter( $new_tag );
        } else if($new_tag.val().indexOf(',') > -1){
            $new_tag.wrap('<div class="has-error"></div>');
            $('<span id="helpTag" class="help-block" style="line-height: 1.2;">' + tfu_js['no comma in tag'] + '</span>').insertAfter( $new_tag );
        } else {
            task_tags.push( $new_tag.val() );
            $input.val(task_tags.join(', '));
            $container.find('.tags-container').fadeOut('fast', function () {
                $container.html( GetTagsHTML() );
            });
        }
    });
    $form.on('keydown', '#new_tag_input', function (e) {
        if (e.which === 13) {  //enter
            e.preventDefault();
            e.stopPropagation();
            $('#new_tag_button').trigger(
                $.Event('click', { which: 1 })
            );
        }
    });

    //remove tags
    $form.on({
            mouseenter: function() {
                $(this).find('.glyphicon-remove').show();
            },
            mouseleave: function() {
                $(this).find('.glyphicon-remove').hide();
            }
    }, '.task-tag:not(.inactive):not(.disabled)');
    $form.on('click', '.glyphicon-remove', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var tag = $(this).parent().attr('data-tag'),
            i = task_tags.indexOf(tag);
        if (i > -1) {
            task_tags.splice(i, 1);
            $input.val(task_tags.join(', '));
            $container.find('.tags-container').fadeOut('fast', function () {
                $container.html( GetTagsHTML() );
           });
        }
        return;
    });
    
    //inactive rectangle
    $form.on('click', '.task-tag:not(.disabled)', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var $tag = $(this),
            tag = $tag.attr('data-tag');
        if($tag.hasClass('inactive')){
            var i = untouch_tags.indexOf(tag);
            if (i > -1) {
                untouch_tags.splice(i, 1);
                $untouch.val(untouch_tags.join(', '));
            }
            $tag.removeClass('inactive');
            $tag.find('.glyphicon-remove').show();
        } else {
            untouch_tags.push(tag);
            $untouch.val(untouch_tags.join(', '));
            $tag.find('.glyphicon-remove').hide();
            $tag.addClass('inactive');
        }
    });
    
    //tags renderer
    function GetTagsHTML(){
        var HTML = '';
        HTML += '<div class="form-group main-form-group">';
        HTML += '<div class="col-sm-5">';
        HTML += '<select class="form-control" id="add_tag" name="add_tag">';
        HTML += '<option value="">' + tfu_js['add tag'] + '</option>';
        if(project_tags.length){
            project_tags.sort().forEach(function (tag, i, project_tags) {
                if(task_tags.indexOf(tag) < 0){
                    HTML += '<option value="' + tag + '">' + tag + '</option>';
                }
            });
        }
        HTML += '<option value="#!?newtag?!#" style="font-weight: bold;">' + tfu_js['new tag'] + '</option>';
        HTML += '</select>';
        HTML += '</div>';        
        HTML += '<div class="col-sm-5 new-tag-input"></div>';
        HTML += '<div class="col-sm-2 new-tag-button"></div>';
        HTML += '</div>';        

        HTML += '<div class="form-group tags-container">';
        var tag_HTML = left_HTML = right_HTML = '';
        task_tags.sort().forEach(function (tag, i, task_tags) {
            tag_HTML = '<div class="task-tag brlong' + (untouch_tags.indexOf(tag) > -1 ? ' inactive' : '') + '" data-tag="'+tag+'">' + tag ;
            tag_HTML += '<span class="glyphicon glyphicon-remove" aria-label="Del"></span>';
            tag_HTML += '</div>';
            if(i*2 < task_tags.length){
                left_HTML += tag_HTML;
            } else {
                right_HTML += tag_HTML;
            }
        });
        HTML += '<div class="col-sm-6">' + left_HTML + '</div>';
        HTML += '<div class="col-sm-6">' + right_HTML + '</div>';
        HTML += '</div>';

        return HTML;
    }
}

//s3 file uploader
function s3Uploader(params) {

    var form = new FormData();
    form.append('AWSAccessKeyId', AWS_ACCESS_KEY);
    form.append('acl', 'public-read');
    form.append('key', params.key);
    form.append('Content-Type', params.content_type);
    form.append('Content-Disposition', "attachment; filename*=UTF-8''" + encodeRFC5987ValueChars(params.content_disposition));
    form.append('policy', params.policy);
    form.append('signature', params.signature);
    form.append('file', params.file);

    var request = new XMLHttpRequest();
    request.upload.addEventListener("progress", function (e) {
        if (e.lengthComputable) {
            var progress = (e.loaded * 100) / e.total;
            if (params.onprogress instanceof Function) {
                params.onprogress.call(this, Math.round(progress));
            }
        }
    }, false);

    var promise = new Promise(function (resolve, reject) {

        request.onload = function () {
            if (/^2[0-9].*$/.test(request.status)) {
                resolve(params.key);
            } else {
                reject(Error('File didn\'t load successfully! :( Error - ' + request.statusText));
            }
        };

        request.onerror = function () {
            reject(Error('There was a network error.'));
        };

        request.onabort = function () {
            resolve('abort');
        };

    });

    promise.abort = function () {
        request.abort();
    };

    request.open('POST', AWS_S3_ENDPOINT, true);
    request.send(form);

    return promise;
}


function GetSize(bytes) {
    if (bytes < 1024) { return bytes + ' b.'; }
    else if (bytes < 1048576) { return (bytes / 1024).toFixed(2) + ' Kb.'; }
    else if (bytes < 1073741824) { return (bytes / 1048576).toFixed(2) + ' Mb.'; }
    else if (bytes < 1099511627776) { return (bytes / 1073741824).toFixed(2) + ' Gb'; }
    else { return (bytes / 1099511627776).toFixed(2) + ' Tb.'; }
}

function UpdateHrefParam(href, param, value) {
    var pattern = new RegExp("([&?])" + param + "=[^&]*", "i");
    if (pattern.test(href)) {
        href = href.replace(pattern, "$1" + param + "=" + value);
    } else if (href.indexOf('?') > 0) {
        href = href + '&' + param + '=' + value;
    } else {
        href = href + '?' + param + '=' + value;
    }
    return href;
}

function ShowAlert(type, message) {
    var $alert = $('<div class="alert alert-' + type + ' escaping">' + message + '</div></div>');
    $('#alerts-container').append($alert);
    $alert.fadeIn('fast');
    setTimeout(function () { $alert.fadeOut('slow', function () { $(this).remove(); }); }, 4000);
}

function GetGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function encodeRFC5987ValueChars(str) {
    return encodeURIComponent(str).
        // Замечание: хотя RFC3986 резервирует "!", RFC5987 это не делает, так что нам не нужно избегать этого
        replace(/['()]/g, escape). // i.e., %27 %28 %29
        replace(/\*/g, '%2A').
        // Следующее не требуется для кодирования процентов для RFC5987, так что мы можем разрешить немного больше читаемости через провод: |`^
        replace(/%(?:7C|60|5E)/g, unescape);
}