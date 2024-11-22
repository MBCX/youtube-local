import { clamp, getVideoID, lerpInverse, percent } from "./common.js";

const intlLang = "default";

/** @type {HTMLVideoElement | null} */
let video = null;
if (data.settings.video_player === 0) {
    video = document.querySelector('#video-container-inner #mini-player + video');
} else {
    video = document.querySelector("video");
}
const numberFormat = new Intl.NumberFormat(intlLang, { notation: "compact" });

function setVideoDimensions(height, width){
    var body = document.querySelector('body');
    body.style.setProperty('--video_height', String(height));
    body.style.setProperty('--video_width', String(width));
    if (height < 240)
        body.style.setProperty('--plyr-control-spacing-num', '3');
    else
        body.style.setProperty('--plyr-control-spacing-num', '10');
    var theaterWidth = Math.max(640, data['video_duration'] || 0, width);
    body.style.setProperty('--theater_video_target_width', String(theaterWidth));

    // This will set the correct media query
    document.querySelector('#video-container').className = 'h' + height;
}
function changeQuality(selection) {
    var currentVideoTime = video.currentTime;
    var videoPaused = video.paused;
    var videoSpeed = video.playbackRate;
    var srcInfo;
    if (avMerge)
        avMerge.close();
    if (selection.type == 'uni'){
        srcInfo = data['uni_sources'][selection.index];
        video.src = srcInfo.url;
    } else {
        srcInfo = data['pair_sources'][selection.index];
        avMerge = new AVMerge(video, srcInfo, currentVideoTime);
    }
    setVideoDimensions(srcInfo.height, srcInfo.width);
    video.currentTime = currentVideoTime;
    if (!videoPaused){
        video.play();
    }
    video.playbackRate = videoSpeed;
}

// Initialize av-merge
window.avMerge = null;
if (data.using_pair_sources) {
    const srcPair = data['pair_sources'][data['pair_idx']];
    window.avMerge = new AVMerge(video, srcPair, 0);
}

// Quality selector
const qualitySelector = document.querySelector('#quality-select');
if (qualitySelector) {
    qualitySelector.addEventListener(
        "change",
        function () {
            changeQuality(JSON.parse(this.value))
        }
    );
}

// Set up video start time from &t parameter
if (data.time_start !== 0 && video)
    video.currentTime = data.time_start;

// External video speed control
const speedInput = document.querySelector('#speed-control');
speedInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        const speed = parseFloat(speedInput.value);
        if (!Number.isNaN(speed)) {
            video.playbackRate = speed;
        }
    }
});


// Playlist lazy image loading
if (data.playlist && data.playlist['id'] != null) {
    // lazy load playlist images
    // copied almost verbatim from
    // https://css-tricks.com/tips-for-rolling-your-own-lazy-loading/
    // IntersectionObserver isn't supported in pre-quantum
    // firefox versions, but the alternative of making it
    // manually is a performance drain, so oh well
    const observer = new IntersectionObserver(lazyLoad, {
        // where in relation to the edge of the viewport, we are observing
        rootMargin: "100px",

        // how much of the element needs to have intersected
        // in order to fire our loading function
        threshold: 1.0
    });

    function lazyLoad(elements) {
        elements.forEach(item => {
            if (item.intersectionRatio > 0) {
                // set the src attribute to trigger a load
                item.target.src = item.target.dataset.src;

                // stop observing this element. Our work here is done!
                observer.unobserve(item.target);
            };
        });
    };

    // Tell our observer to observe all img elements with a "lazy" class
    const lazyImages = document.querySelectorAll('img.lazy');
    lazyImages.forEach(img => {
        observer.observe(img);
    });
}


// Autoplay
if (data.settings.related_videos_mode !== 0 || data.playlist !== null) {
    const playability_error = !!data.playability_error;
    let isPlaylist = false;
    if (data.playlist != null && data.playlist['current_index'] != null)
        isPlaylist = true;

    // read cookies on whether to autoplay
    // https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie
    let cookieValue;
    let playlist_id;
    if (isPlaylist) {
        // from https://stackoverflow.com/a/6969486
        function escapeRegExp(string) {
            // $& means the whole matched string
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
        playlist_id = data.playlist['id'];
        playlist_id = escapeRegExp(playlist_id);

        cookieValue = document.cookie.replace(new RegExp(
            '(?:(?:^|.*;\\s*)autoplay_'
            + playlist_id + '\\s*\\=\\s*([^;]*).*$)|^.*$'
        ), '$1');
    } else {
        cookieValue = document.cookie.replace(new RegExp(
            '(?:(?:^|.*;\\s*)autoplay\\s*\\=\\s*([^;]*).*$)|^.*$'
        ),'$1');
    }

    let autoplayEnabled = 0;
    if (cookieValue.length === 0) {
        autoplayEnabled = 0;
    } else {
        autoplayEnabled = Number(cookieValue);
    }

    // check the checkbox if autoplay is on
    let checkbox = document.querySelector('#autoplay-toggle');
    if(autoplayEnabled){
        checkbox.checked = true;
    }

    // listen for checkbox to turn autoplay on and off
    let cookie = 'autoplay'
    if (isPlaylist)
        cookie += '_' + playlist_id;

    checkbox.addEventListener( 'change', function() {
        if (this.checked) {
            autoplayEnabled = 1;
            document.cookie = cookie + '=1; SameSite=Strict';
        } else {
            autoplayEnabled = 0;
            document.cookie = cookie + '=0; SameSite=Strict';
        }
    });

    if (!playability_error) {
        // play the video if autoplay is on
        if (autoplayEnabled) {
            video.play();
        }
    }

    // determine next video url
    let nextVideoUrl;
    if (isPlaylist) {
        let currentIndex = data.playlist['current_index'];
        if (data.playlist['current_index'] + 1 == data.playlist['items'].length)
            nextVideoUrl = null;
        else
            nextVideoUrl = data.playlist['items'][data.playlist['current_index']+1]['url'];

        // scroll playlist to proper position
        // item height + gap == 100
        let pl = document.querySelector('.playlist-videos');
        pl.scrollTop = 100*currentIndex;
    } else {
        if (data.related.length === 0)
            nextVideoUrl = null;
        else
            nextVideoUrl = data.related[0]['url'];
    }
    let nextVideoDelay = 1000;

    // go to next video when video ends
    // https://stackoverflow.com/a/2880950
    if (nextVideoUrl) {
        if (playability_error) {
            videoEnded();
        } else {
            video.addEventListener("ended", videoEnded, false);
        }

        function nextVideo() {
            if (autoplayEnabled) {
                location.href = nextVideoUrl;
            }
        }

        function videoEnded(e) {
            setTimeout(nextVideo, nextVideoDelay);
        }
    }
}

function allowedCountriesFormated() {
    /** @type {string} */
    const displayNames = new Intl.DisplayNames(intlLang, { type: "region" });
    const countries = document.querySelector(".allowed-countries");
    const countriesContainer = countries.innerText;
    const countriesText = countriesContainer.split(":")[1].trim();
    let formattedCountries = "";
    countries.innerText = "";
    countriesText.split(",").forEach((country, i) => {
        const countryName = displayNames.of(country.trim());
        if (i === countriesText.length - 1) {
            formattedCountries += `${countryName}`;
        } else {
            formattedCountries += `${countryName}, `;
        }
    });
    countries.innerText = `Allowed countries: ${formattedCountries}`;
}

async function publishDateFormatted() {
    const publishEl = document.querySelector("time");
    const dateText = publishEl.innerText.split(" ");
    const stringDate = dateText[2];
    publishEl.innerText = `Published on ${Intl.DateTimeFormat(
        intlLang,
        {
            dateStyle: "long",
            timeZone: Intl.DateTimeFormat(intlLang).resolvedOptions().timeZone
        }
    ).format(
        new Date(stringDate)
    )}`;
    
    /** @type {HTMLSpanElement} */
    const likesEl = document.querySelector(".likes-dislikes");
    const request = fetch(`/https://ryd-proxy.kavin.rocks/votes/${getVideoID()}`);
    const [_, json] = await Promise.all([request, (await request).json()])
    likesEl.innerText = `${numberFormat.format(json.likes - 1)} likes, ${numberFormat.format(json.dislikes)} dislikes`;
}

function videoViewsFormatted() {
    /** @type {HTMLSpanElement} */
    const viewsEl = document.querySelector(".views");
    const views = Number(document.querySelector(".views").innerText.split(" ")[0].split(",").join(""));
    viewsEl.innerText = `${numberFormat.format(views)} views`;
    viewsEl.title = `${views} views`;
}

function formatUILikeYT() {
    publishDateFormatted();
    videoViewsFormatted();
}

function setupVideoThumbnail() {
    /** @type {HTMLDivElement} */
    const miniPlayer = document.querySelector("#mini-player");

    /** @type {HTMLVideoElement} */
    const miniPlayerVideo = document.querySelector("#mini-player video");
    
    /** @type {HTMLDivElement} */
    const videoContainer = document.querySelector("#video-container");
    const miniPlayerVideoSource = miniPlayerVideo.querySelector("source");

    const containerRect = videoContainer.getBoundingClientRect();
    const miniPlayerRect = miniPlayer.getBoundingClientRect();

    miniPlayer.style.opacity = "0";

    // Make sure the browser has enough video data.
    miniPlayerVideo.addEventListener("canplay", () => {
        let seekTime = 0;

        videoContainer.addEventListener("mousemove", e => {
            const mouseX = e.offsetX;
            const mouseY = e.offsetY;

            // Emulates where the "start" and "end"
            // of the built-in browser player duration
            // bar are.
            let miniPlayerStartPos = 0;
            let miniPlayerEndPos = 0;
    
            if (navigator.userAgent.includes("Firefox")) {
                // miniPlayerStartPos = Math.floor(containerRect.width * 0.060);
                miniPlayerStartPos = percent(6, containerRect.width);
                if (video.querySelector("track") == null) {
                    miniPlayerEndPos = Math.floor(containerRect.width * 0.692);
                } else {
                    miniPlayerEndPos = Math.floor(containerRect.width * 0.56);
                }
                // miniPlayer.style.opacity = (
                //     mouseY > containerRect.height * 0.9 &&
                //     mouseY <= containerRect.height * 0.96
                // ) ? "1" : "0";
                const mouseRange = lerpInverse(
                    mouseY,
                    0,
                    containerRect.height
                );
                miniPlayer.style.opacity = (
                    mouseRange > 0.8 &&
                    mouseRange < 0.95
                ) ? "1" : "0";
            }

            // Make sure that the miniplayer, when
            // reaching the end of the video seekbar
            // in the browser's video player, makes the
            // preview go to the end.
            const miniPlayerWidthHalf = miniPlayerRect.width * 0.5;
            const miniPlayerPos = clamp(
                mouseX,
                miniPlayerStartPos,
                miniPlayerEndPos
            );

            // Converts it to a 0 - 1 scale.
            // Where 0 is where value of miniPlayerStartPos
            const seekTimePercent = lerpInverse(mouseX, miniPlayerStartPos, miniPlayerEndPos);

            // Somewhat magic calculation here, but
            // is the offset of the seek time in the mini
            // player with the video.
            const seekOffset = miniPlayerWidthHalf - miniPlayerWidthHalf * 0.5;
            seekTime = clamp(
                (video.duration * seekTimePercent) - seekOffset,
                0,
                video.duration
            );
            miniPlayer.style.setProperty(
                "--video-hover-percent",
                `${miniPlayerPos - miniPlayerWidthHalf}px`
            );
            miniPlayerVideo.currentTime = Number.isFinite(seekTime) ? seekTime : 0;
        });
    });

    // Change source to the lowest quality for faster
    // seaking inside the mini player.
    miniPlayerVideoSource.src = "";
    miniPlayerVideoSource.type = "";
    if (data.using_pair_sources)
    {
        // Use webm.
        miniPlayerVideoSource.src = data.pair_sources[0].videos[0].url;
        miniPlayerVideoSource.type = data.pair_sources[0].videos[0].type;
    }
    else if (data.uni_sources.length !== 0)
    {
        miniPlayerVideoSource.src = data.uni_sources[0].url;
        miniPlayerVideoSource.type = data.uni_sources[0].type;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    formatUILikeYT();
    try {
        allowedCountriesFormated();
    } catch (error) {}
}, { once: true });

// save watched time to session storage
addEventListener("beforeunload", function() {
    // There's no reason to store the length if
    // there's 20 seconds left on the video, or
    // has ended.
    if (Math.floor(video.duration - video.currentTime) > 20)
    {
        sessionStorage.setItem(getVideoID(), video.currentTime);
    }
    else
    {
        if (sessionStorage.getItem(getVideoID()) != null)
        {
            sessionStorage.removeItem(getVideoID());
        }
    }
});

video.addEventListener("loadedmetadata", function () {
    const video_id = getVideoID();
    if (sessionStorage.getItem(video_id) !== null)
    {
        const prevWatchTime = sessionStorage.getItem(video_id);
        if (video.duration > prevWatchTime && prevWatchTime > 0) {
            video.currentTime = prevWatchTime;
        }
    }
});