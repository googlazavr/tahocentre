
Date.now = Date.now || function() { return +new Date; };
(function(){
    var videoThumb = {
        debug: false
        , init: function() {
            /* ПАРАМЕТРЫ */
            this.settings = {
                minHeight  : 500,
                speed      : 350,
                easing     : 'ease',
                slideSpeed : 500,
                slideDownSpeed : 250,
                videoInfoHeight: 150
            };
            this.slideshowInterval     = null;
            this.channelVideos         = false;
            this.initialSrcs           = [];
            this.videoData             = [];
            this.preloadedPictures     = [];
            this.videoPlayerParams     = {};
            this.loadedPage            = {'most-recent': 0, 'top-rated': 0, long: 0};
            this.countPages            = {'most-recent': 0, 'top-rated': 0, long: 0};
            this.pagesLeft             = {'most-recent': 1, 'top-rated': 1, long: 1};
            this.thumbs                = $('.video-thumb-image');
            this.videoTabs             = $('.video-tabs');
            this.thumbsTabsBlock       = this.videoTabs.find('.nav-tabs');
            this.thumbsTabsAnchors     = this.thumbsTabsBlock.find('a[data-toggle="tab"]');
            this.categorySelectorBlock = $('.category-selector');
            this.categorySelector      = this.categorySelectorBlock.find('select');
            this.mobileDevice =
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);


            /* ШАБЛОНЫ */
            this.clearfix      = '<div class="clearfix"></div>';
            this.loadingLine   = '<div class="col-sm-12 text-center loading-line"><h3><i class="fa fa-spinner fa-spin"></i> Loading...</h3></div>';
            this.noVideos   = '<div class="col-sm-12 text-center no-videos-line"><h3>Sorry - no videos!</h3></div>';
            this.thumbTemplate = _.template(
                '<div class="tc-col-lg-2 col-md-3 col-sm-4 <%= thumbSize %> video-thumb-block">' +
                    '<div class="video-thumb-wrapper text-center">' +
                        '<div class="video-thumb">' +
                            '<div>' +
                                '<a href="#" class="video-link" data-video-id="<%= videoId %>">' +
                                    '<img class="video-thumb-image" data-video-id="<%= videoId %>" src="<%= image %>" alt=""/>' +
                                    '<div class="duration"><%= duration %></div>' +
                                '</a>' +
                                '<img class="img-preload" src="<%= image %>?i=1" alt="">' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>'
            );
            this.nextBtn  = _.template(
                '<div class="tc-col-lg-offset-4 col-md-offset-4 col-sm-offset-4 col-xs-offset-3 tc-col-lg-2 col-md-4 col-sm-4 col-xs-6 text-center next">' +
                    '<a class="btn btn-default btn-block btn-next" href="#">LOAD MORE</a>' +
                '</div>'
            );
            this.videoContainer = _.template(
                '<div class="tc-col-xs-10 video-container" data-video-id="<%= videoId %>">' +
                    '<div class="video-container-wrapper">' +
                        '<div class="tc-col-sm-10 video-controlls-block">' +

                            '<div class="tc-col-sm-8 channel">' +
                                "<% if(!_.isNull(channel)) print('By: <a href=\"'+channel.site+'\">'+channel.name+'</a>') %>" +
                            '</div>' +
                            '<div class="tc-col-sm-2 text-right hidden-xs closeContainer">' +
                                '<a href="#" class="closeBtn">&times;</a>' +
                            '</div>' +
                        '</div>' +
                        '<div class="tc-col-xs-10 tc-col-sm-6 tc-col-sm-offset-2 video-block">' +
                            '<div id="video-player"></div>' +
                        '</div>' +

                        '<div class="tc-col-sm-offset-8 tc-col-sm-2 hidden-xs infoBtnBlock">' +
                            '<a href="#" class="infoBtn"><i class="fa fa-info-circle"></i></a>' +
                        '</div>' +
                        this.clearfix +
                    '</div>' +
                    '<div class="video-info-container-wrapper">' +
                        '<div class="tc-col-sm-6 tc-col-sm-offset-2 video-info-block">' +
                                '<div class="tc-row">' +
                                    '<div class="tc-col-sm-10"><%= videoTitle %></div>' +
                                '</div>' +
                                '<div class="tc-row">' +
                                    '<div class="tc-col-sm-5">Added <%= pubDate %></div>' +
                                '</div>' +
                                '<div class="tc-row">' +
                                    '<div class="tc-col-sm-5"><%= views %> views | ID <%= videoId %></div>' +
                                '</div>' +
                                '<div class="tc-row">' +
                                    '<div class="tc-col-sm-6">' +
                                        '<div class="input-group">' +
                                            '<input type="text" class="form-control input-sm" value="<%= videoLink %>" readonly>' +
                                            '<span class="input-group-btn">' +
                                                '<button class="btn btn-default btn-sm" type="button" title="Paste to clipboard"><i class="fa fa-clipboard"></i></button>' +
                                            '</span>' +
                                        '</div><!-- /input-group -->' +
                                    '</div>' +
                                    '<div class="tc-col-sm-4 text-right"><i class="fa fa-twitter-square"></i> <i class="fa fa-facebook-square"></i></div>' +
                                '</div>' +
                                '<div class="tc-row video-buttons">' +
                                    '<div class="tc-col-sm-6"> <a href="#" class="btn btn-default btn-sm">Download</a> <a href="#" class="btn btn-default btn-sm">Embed</a></div>' +
                                '</div>' +
                            '</div>' +
                            this.clearfix +
                    '</div>' +
                '</div>'
            );
            
            this.bindEvents();
        }
        , bindEvents: function() {
            var that = this;

            if(typeof landingVideo == 'object')
            {
                that.renderLanding();
            }

            that.thumbsTabsAnchors.on('shown.bs.tab', function (e) {
                var type = e.target.hash.replace('#', '');

                if($(this).hasClass('channel-video-tab') && typeof that.countPages[type] == 'undefined')
                {
                    that.channelVideos = true;
                    that.countPages[type] = 0;
                    that.pagesLeft[type] = 1;
                }
                //log(type, that.countPages[type]);
                if(that.countPages[type] == 0 && that.pagesLeft[type] == 1)
                {
                    that.loadVideos(type);
                }

                that.initScroll(type);
            });

            $(document).ready(function(){
                if(window.location.hash)
                {
                    that.thumbsTabsBlock.find('a[href="'+window.location.hash+'"]').tab('show');
                } else {
                    that.thumbsTabsBlock.find('a[href="#most-recent"]').tab('show');
                    that.thumbsTabsBlock.find('.channel-video-tab').tab('show');
                }
            });


            if(that.categorySelector)
                that.categorySelector.on('change', function() {
                    window.location = '/categories/'+$(this).val()+'/';
                });
        }
        , bindVideoControlsEvents: function() {
            var that = this;
            $('.closeBtn').on('click', function(e) {
                e.preventDefault();
                that.closeVideoContainer();
            });

            $('.infoBtn').on('click', function(e) {
                e.preventDefault();
                that.toggleVideoInfoContainer();
            });


        }
        , bindThumbsEvents: function(appendBlock) {
            var that                = this
                , videoLinks        = $('a.video-link', appendBlock)
                , thumbs            = $('.video-thumb-image', appendBlock)
                ;

            videoLinks.off('click');

            videoLinks.on('click', function(e) {
                e.preventDefault();
                var $this = this
                    , existedVideoContainer = $('.video-container')
                    , videoId = $($this).data('videoId');

                if(existedVideoContainer.length && existedVideoContainer.data('videoId') == videoId)
                {
                    that.closeVideoContainer();
                }
                else if (existedVideoContainer.length && existedVideoContainer.data('videoId') != videoId)
                {
                    that.addVideoContainer($this);
                }
                else
                {
                    that.addVideoContainer(this);
                }
            });

            //$.each(thumbs, function(index, thumb) {
            //
            //    that.initialSrcs[$(thumb).data('videoId')] = $(thumb).attr('src');
            //    if( ! that.mobileDevice)
            //    {
            //        $(thumb).on('mouseenter',
            //            function(){
            //                if(that.slideshowInterval)
            //                    clearInterval(that.slideshowInterval);
            //
            //                that.preloadPreviews(thumb);
            //                var videoId = $(thumb).data('videoId')
            //                    , countPreviews = that.videoData[videoId].countPreviews
            //                    , cur = 1
            //                    ;
            //                $(thumb).attr('src', that.getPreview('small', videoId)+'?i='+cur);
            //                that.slideshowInterval = setInterval(function() {
            //                    cur = (cur + 1) % countPreviews;
            //                    $(thumb).attr('src', that.getPreview('small', videoId)+'?i='+cur);
            //                }, that.settings.slideSpeed)
            //            });
            //        $(thumb).on('mouseleave', function(){
            //                if(that.slideshowInterval)
            //                    clearInterval(that.slideshowInterval);
            //
            //                $(thumb).attr('src', that.initialSrcs[$(thumb).data('videoId')])
            //            }
            //        );
            //    }
            //});

            if( ! that.mobileDevice)
            {
                $(thumbs).off('mouseenter, mouseleave');
                $(thumbs).on('mouseenter', function(){
                    if(that.slideshowInterval)
                        clearInterval(that.slideshowInterval);

                    that.preloadPreviews(this);
                    var imageObject = $(this)
                        , videoId = imageObject.data('videoId')
                        , countPreviews = that.videoData[videoId].countPreviews
                        , cur = 1
                        , image = that.getPreview('small', videoId)+'?i='+cur
                        ;
                    imageObject.attr('src', image);
                    //log('prepare slideshow', videoId, countPreviews, cur, image);
                    that.slideshowInterval = setInterval(function() {
                        cur = (cur + 1) % countPreviews;
                        image = that.getPreview('small', videoId)+'?i='+cur;
                        imageObject.attr('src', image);
                        //log(image);
                    }, that.settings.slideSpeed)
                });
                $(thumbs).on('mouseleave', function(){
                    //log('thumb mouse leave');
                    if(that.slideshowInterval)
                        clearInterval(that.slideshowInterval);

                    $(this).attr('src', that.getPreview('small', $(this).data('videoId')));
                });
            }
        }
        , renderLanding: function() {
            //log('render landing for video:', landingVideo);

            this.videoPlayerParams = landingVideo.videoParams;

            var video = landingVideo.data
                , landingContainer = $('<div></div>').addClass('landing')
                , videoContainer = $(this.videoContainer(video))
                , videoBlock     = videoContainer.find('.video-block')
                , pageContainer  = this.videoTabs.parents('.container-fluid')
                ;

            pageContainer.prepend(landingContainer.append(videoContainer.css({display: 'block'})));

            videoBlock.css({height: Math.ceil(videoBlock.outerWidth()/16*9) + 20});

            this.initVideoPlayer(video.videoId);

            this.bindVideoControlsEvents();
        }
        , capitaliseFirstLetter: function(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }
        , getPreview: function(size, videoId) {
            var path = 'path' + this.capitaliseFirstLetter(size);
            return this.videoData[videoId].src.domain + this.videoData[videoId].src[path] + videoId + '/'
        }
        , preloadPreviews: function(thumb) {
            var that = this
                , videoId = $(thumb).data('videoId')
                , imagesCount =  that.videoData[videoId].countPreviews
                , imagesContainer = $(thumb).parents('.video-thumb').find('div')
            ;
            that.videoData[videoId].firstImg = that.getPreview('full', videoId);

            //log('preload images for video '+videoId);

            if(!that.preloadedPictures[videoId])
            {
                for(var i = 2; i<= imagesCount; i++) {
                    var img = $('<img/>', {
                        "alt": '',
                        "src": that.getPreview('small', videoId)+'?i='+i,
                        "class": 'img-preload'
                    });
                    imagesContainer.append(img);
                }
                var firstImg = $('<img/>', {
                    "alt": '',
                    "src": that.videoData[videoId].firstImg,
                    "class": 'img-preload first-img'
                });

                imagesContainer.append(firstImg);

                that.preloadedPictures[videoId] = true;
            }
        }
        , loadVideos: function(type, callback) {
            callback = callback || false;
            var that = this
                , videoData = null;

            if(that.channelVideos)
            {
                videoData = {channel: type, page: ++that.countPages[type]};
            }
            else
            {
                videoData = {type: type, page: ++that.countPages[type]};
            }

            $.ajax({
                //url: '/',
                data: videoData,
                type: 'get',
                beforeSend: function() {
                    if(that.countPages[type] == 1)
                        $('#'+type).find('.jscroll-inner').append(that.loadingLine);

                },
                success: function(response) {
                    $('.loading-line').remove();
                    $('.jscroll-loading').remove();

                    if(response.data.length)
                    {
                        that.pagesLeft[response.type] = response.pagesLeft;
                        that.renderVideosOnPage(response.data, response.type, callback);

                        if(response.videoParams)
                            that.videoPlayerParams = response.videoParams;
                    }
                    else
                    {
                        $('#'+type).find('.jscroll-inner').append(that.noVideos);
                    }
                }
            });
        }
        , closeVideoContainer: function(existedVideoContainer) {
            existedVideoContainer = existedVideoContainer || $('.video-container');
            this.showPlayer(existedVideoContainer, true);
            this.deactivateThumbBlock();
            $('.landing').remove();

        }
        , toggleVideoInfoContainer: function() {
            var that = this
                , infoContainer = $('.video-info-container-wrapper')
                ;
            if(infoContainer.actual('height') == 0)
            {
                this.setTransition(infoContainer);
                infoContainer.css('height', that.settings.videoInfoHeight);
                that.centerVideoContainer($('.video-container'), that.settings.videoInfoHeight);
            }
            else
            {
                infoContainer.css('height', 0);
                that.centerVideoContainer($('.video-container'), -that.settings.videoInfoHeight);
            }
        }
        , initVideoPlayer: function(videoId) {
            var timestamp = Date.now() / 1000;
            this.videoPlayerParams.urlPrev  = this.videoPlayerParams.domain + 'video/preview-special/' + videoId + '/?i=';
            this.videoPlayerParams.file_mp4 = this.videoPlayerParams.domain + 'video/view/'            + videoId +'/?t='+timestamp;
            this.videoPlayerParams.file_f4m = 'video/viewstream/'       + videoId + '/playlist.f4m?t='+timestamp;
            this.videoPlayerParams.image    = this.videoPlayerParams.domain + 'video/preview/'          + videoId + '/?t='+timestamp;
            this.videoPlayerParams.callbackPlay = function(){
                //console.log('Play');
                //<?php AdHelper::gaSendEventGoogle('Play', Yii::$app->urlManager->createAbsoluteUrl([Yii::$app->requestedRoute, 'id' => $video_user['video_id']])); ?>
            };
            this.videoPlayerParams.callbackPause = function(){
                //console.log('Pause');
                //<?php AdHelper::gaSendEventGoogle('Pause', Yii::$app->urlManager->createAbsoluteUrl([Yii::$app->requestedRoute, 'id' => $video_user['video_id']])); ?>
            };
            this.videoPlayerParams.callbackFinish = function(){
                //console.log('Finish');
                //<?php AdHelper::gaSendEventGoogle('Finish', Yii::$app->urlManager->createAbsoluteUrl([Yii::$app->requestedRoute, 'id' => $video_user['video_id']])); ?>
            };
            //log('player params:', this.videoPlayerParams);

            $('#video-player').vivudPlayer(this.videoPlayerParams);
        }
        , centerVideoContainer: function(videoContainer, videoBlockHeight) {
            var videoContainerHeight = videoContainer.actual('height') + videoBlockHeight
                , videoContainerPosition = videoContainer.offset().top
                , existedVideoContainer = $('.video-container')
                , videoContainerExists = (existedVideoContainer.length > 0 && existedVideoContainer.index() != videoContainer.index())
                , existedVideoContainerHeight  = (videoContainerExists) ? existedVideoContainer.actual('height') : 0

                , viewportHeight = $(window).actual('height')
                , videoContainerMargins = (viewportHeight > videoContainerHeight) ? viewportHeight/2 - videoContainerHeight/2 : 0
                , scrollTopPosition = videoContainerPosition - videoContainerMargins - existedVideoContainerHeight
                ;
            //log(viewportHeight, videoContainerHeight, videoContainerPosition, videoContainerMargins, existedVideoContainerHeight,  scrollTopPosition);
            $('html, body').animate({
                scrollTop: scrollTopPosition
            }, this.settings.slideDownSpeed);
        }
        , deactivateThumbBlock: function() {
            $('.video-thumb-block.active').removeClass('active');
        }
        , activateThumbBlock: function(videoThumbBlock) {
            videoThumbBlock.addClass('active');
        }
        , activateInactiveTabs: function() {
            if(this.thumbsTabsBlock.hasClass('sr-only'))
                this.thumbsTabsBlock.removeClass('sr-only');

            if(this.categorySelectorBlock.hasClass('sr-only'))
                this.categorySelectorBlock.removeClass('sr-only');
        }
        , insertNewPlayer: function(existedVideoContainer, videoContainer) {
            var videoBlock        = videoContainer.find('.video-block')
                , videoBlockWidth = videoBlock.actual('width')
                , videoBlockHeight = Math.ceil(videoBlockWidth/16*9)
                ;
            videoBlock.css({height: videoBlockHeight});
            videoBlock.find('object').attr({height: videoBlockHeight});
            $(videoContainer).css({height: 'auto'});
            existedVideoContainer.replaceWith($(videoContainer));
        }
        , addVideoContainer: function(videoAnchor) {
            var that                   = this
                , videoId              = $(videoAnchor).data('videoId')
                , videoThumbBlock      = $(videoAnchor).parents('.video-thumb-block')
                , videoThumbBlockIndex = videoThumbBlock.index() + 1
                , containerBlockWidth  = videoThumbBlock.parent().actual('width')
                , videoThumbBlockWidth = videoThumbBlock.actual('width')

                , videoThumbsContainer = videoThumbBlock.parent()

                , existedVideoContainer = $('.video-container')
                , videoContainerExists  = (existedVideoContainer.length > 0)
                , videoContainerIndex   = (videoContainerExists) ? existedVideoContainer.index() + 1: null


                , videoThumbBlocks      = videoThumbBlock.parent().children().size()
                , videoThumbBlocksIndex = (videoThumbsContainer.find('.video-container').length > 0) ? videoThumbBlocks - 2 : videoThumbBlocks - 1


                , videoContainerBefore = (videoContainerExists && (videoThumbBlockIndex - videoContainerIndex) >= 0)
                , videoThumbIndex      = (videoContainerBefore) ? videoThumbBlockIndex - 1 : videoThumbBlockIndex
                , thumbsInRow          = Number((containerBlockWidth/videoThumbBlockWidth).toFixed())

                , existedVideoContainerInTheSameRow = (videoContainerExists)
                    ? (videoContainerIndex - videoThumbBlockIndex <= thumbsInRow && videoContainerIndex - videoThumbBlockIndex >= 0  )
                    : false

                , lastInRowBlockIndex  = videoThumbIndex/thumbsInRow
                , lastInRowBlockCoeff  = Math.ceil(lastInRowBlockIndex) - lastInRowBlockIndex
                , blocksToTheEndOfRow  = Number((lastInRowBlockCoeff*thumbsInRow).toFixed())
                , lastRowElementIndex  = (videoThumbIndex+blocksToTheEndOfRow < videoThumbBlocksIndex)
                    ? videoThumbIndex+blocksToTheEndOfRow
                    : videoThumbBlocksIndex
                , videoContainer       = $(this.videoContainer(that.videoData[videoId]))
                , thumbSize;
                if (window.location.pathname.indexOf('video') == 1) {
                    videoContainer.append('<script type="text/javascript" src="http://syndication.exoclick.com/splash.php?idzone=1757324&type=12&capping=0"></script>');
                }
            ;
            if (window.location.pathname.indexOf('video') == 1) {
                thumbSize = 'col-xs-12 thumb-full-wide'
            } else {
                thumbSize = 'col-xs-6'
            }

            videoContainer.insertAfter(videoThumbBlock.parent().find('.video-thumb-block').get(lastRowElementIndex-1));

            that.initVideoPlayer(videoId);

            that.bindVideoControlsEvents();
            this.deactivateThumbBlock();
            if(videoContainerExists && !existedVideoContainerInTheSameRow)
            {
                that.closeVideoContainer(existedVideoContainer);
            }

            that.activateInactiveTabs();
            that.activateThumbBlock(videoThumbBlock);

            if(!existedVideoContainerInTheSameRow)
            {
                that.showPlayer(videoContainer);
            }
            else
            {
                that.insertNewPlayer(existedVideoContainer, videoContainer)
            }
        }
        , showPlayer: function(videoContainer, remove) {
            remove = remove || false;
            var videoBlock        = videoContainer.find('.video-block')
                , videoBlockWidth = videoBlock.actual('width')
                , videoBlockHeight = Math.ceil(videoBlockWidth/16*9)
                ;

            this.setTransition(videoContainer);

            if(remove)
            {
                    videoBlock.empty();
                    videoBlock.css({height: 0});
                    videoBlock.find('object').attr({height: 0});
                    setInterval(function(){
                        videoContainer.remove();
                    }, this.settings.slideDownSpeed);
            }
            else
            {
                videoBlock.css({height: videoBlockHeight});
                videoBlock.find('object').attr({height: videoBlockHeight});
                $(videoContainer).css({height: 'auto'});
                this.centerVideoContainer(videoContainer, videoBlockHeight)
            }

        }
        , setTransition: function (videoContainer) {
            videoContainer.css('transition', 'height ' + this.settings.slideDownSpeed + 'ms ' + this.settings.easing);
            videoContainer.find('.video-block').css('transition', 'height ' + this.settings.slideDownSpeed + 'ms ' + this.settings.easing);
        }
        , renderVideosOnPage: function(response, type, callback) {
            var that            = this
              , appendContainer = (that.countPages[type] == 1) ? '.jscroll-inner' : '.jscroll-added:last'
              , thumb = ''
                , appendBlock = $('#'+type).find(appendContainer);
            //log('render '+type+' videos', 'countPages:', that.countPages[type]);

            $.each(response, function(index, video) {
                that.videoData[video.videoId] = video;
                thumb += that.thumbTemplate({videoId: video.videoId, image: that.getPreview('small', video.videoId), duration: video.duration});

            });
            appendBlock.append(thumb);

            that.loadedPage[type]++;

            appendBlock.append(that.clearfix);

            if(that.pagesLeft[type] > 1) {
                appendBlock.append(that.nextBtn({type: type, page: that.countPages[type]}));
            }

            that.bindThumbsEvents(appendBlock);

            if(that.pagesLeft[type] > 1) {
                if(callback) {
                    callback();
                }
                else {
                    that.initScroll(type);
                }
            }
        }
        , destroyScroll: function(type) {
            $('#'+type).jscroll.destroy();
        }
        , initScroll: function(type) {
            var that = this;
            if(that.pagesLeft[type] > 1)
            {
                $('#'+type).jscroll({
                    refresh: true,
                    loadingHtml: that.loadingLine,
                    autoTrigger: true,
                    load: function(callback) {
                        that.loadVideos(type, callback);
                    },
                    paddingSelector: '#' + type + ' .jscroll-inner',
                    autoTriggerUntil: function() {
                        if(that.countPages[type] % 3 )
                            return 3;

                        return false;
                    },
                    callback: function() {
                        if(that.pagesLeft[type] <= 1)
                            that.destroyScroll(type);
                    }
                });
            }
        }
    };

    videoThumb.init();
})();