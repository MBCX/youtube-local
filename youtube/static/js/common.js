export function text(msg) {
    return document.createTextNode(msg);
}

export function clearNode(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}

export function toTimestamp(seconds) {
    const minutes = Math.floor(seconds / 60) % 60;
    const hours = Math.floor(minutes / 60);
    seconds = Math.floor(seconds) % 60;

    if (hours) {
        return `0${hours}:`.slice(- 3) + `0${minutes}:`.slice(- 3) + `0${seconds}`.slice(- 2);
    }
    return `0${minutes}:`.slice(- 3) + `0${seconds}`.slice(- 2);
}

/**
 * @param {number} value
 * @param {number} a
 * @param {number} b
 * @param {boolean} inclusive
 */
export function numberBetween(value, a, b, inclusive) {
    const min = Math.min(a, b);
    const max = Math.max(a, b);

    if (inclusive) {
        return value >= min && value <= max;
    }
    return value > min && value < max;
}

export function getVideoFrameRate() {
    if (data.settings.video_player === 0) {
        /** @type {HTMLSelectElement} */
        const selector = document.querySelector("#quality-select");
        if (selector == null) {
            return;
        }
        const options = [...selector.querySelectorAll("option")];
    
        // Get the current selected quality
        // option.
        const selected = selector.value;
        const quality = options.filter(option => option.value === selected)[0];
        return parseInt(quality.innerText.split("p")[1]);
    } else {
        if (data.using_pair_sources) {
            return data.pair_sources[data.pair_idx].fps;
        } else {
            return data.uni_sources[data.uni_idx].fps;
        }
    }
}

export function getActiveTranscriptTrackIdx() {
    const textTracks = document.querySelector("video").textTracks;
    let currentTrackIndex = getDefaultTranscriptTrackIdx();
    if (!textTracks.length) {
        return;
    }

    for (let i = 0; i < textTracks.length; i++) {
        if (textTracks[i].mode === "showing") {
            currentTrackIndex = i;
            return currentTrackIndex;
        }
    }
    return currentTrackIndex;
}

export function getActiveTranscriptTrack() {
    return document.querySelector("video").textTracks[getActiveTranscriptTrackIdx()];
}

export function getDefaultTranscriptTrackIdx() {
    const textTracks = document.querySelector("video").textTracks;
    return textTracks.length - 1;
}

export function doXhr(url, callback = null) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.onload = e => {
        callback(e.currentTarget.response);
    }
    xhr.send();
    return xhr;
}// https://stackoverflow.com/a/30810322

export function copyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    const parent_el = video.parentElement;
    //
    // *** This styling is an extra step which is likely not required. ***
    //
    // Why is it here? To ensure:
    // 1. the element is able to have focus and selection.
    // 2. if element was to flash render it has minimal visual impact.
    // 3. less flakyness with selection and copying which **might** occur if
    //    the textarea element is not visible.
    //
    // The likelihood is the element won't even render, not even a
    // flash, so some of these are just precautions. However in
    // Internet Explorer the element is visible whilst the popup
    // box asking the user for permission for the web page to
    // copy to the clipboard.
    //
    // Place in top-left corner of screen regardless of scroll position.
    textArea.style.position = 'fixed';
    textArea.style.top = 0;
    textArea.style.left = 0;
    // Ensure it has a small width and height. Setting to 1px / 1em
    // doesn't work as this gives a negative w/h on some browsers.
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    // We don't need padding, reducing the size if it does flash render.
    textArea.style.padding = 0;
    // Clean up any borders.
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    // Avoid flash of white box if rendered for any reason.
    textArea.style.background = 'transparent';
    textArea.value = text;
    parent_el.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        const msg = successful ? 'successful' : 'unsuccessful';
        console.log('Copying text command was ' + msg);
    } catch (err) {
        console.error('Oops, unable to copy', error);
    }
    parent_el.removeChild(textArea);
}

export function getVideoID() {
    if (!location.href.includes("v=")) {
        return "";
    }
    return location.href.split("v=")[1];
}

export function clamp(val, min, max) {
    return Math.min(
        Math.max(val, Math.min(min, max)),
        Math.max(min, max)
    );
}

export function lerpInverse(val, a, b) {
    return (val - a) / (b - a);
}

/**
 * Computes and returns the % of a number
 * based on a 0 t0 100 ratio.
 * @param amount Amount to determine percentage (10's scale)
 * @param to Number to take the percent of
 */
export function percent(amount, to) {
    return to * (amount * 0.01);
}

export function changeQuality(selection) {
    /** @type {HTMLVideoElement | null} */
    let video = null;
    if (data.settings.video_player === 0) {
        video = document.querySelector("#video-container-inner #mini-player + video");
    } else {
        video = document.querySelector("video");
    }
    const currentVideoTime = video.currentTime;
    const videoPaused = video.paused;
    const videoSpeed = video.playbackRate;
    let srcInfo;
    if (window.avMerge) {
        window.avMerge.close();
    }

    if (selection.type == 'uni') {
        srcInfo = data['uni_sources'][selection.index];
        video.src = srcInfo.url;
    } else {
        srcInfo = data['pair_sources'][selection.index];
        window.avMerge = new AVMerge(video, srcInfo, currentVideoTime);
    }
    setVideoDimensions(srcInfo.height, srcInfo.width);
    video.currentTime = currentVideoTime;
    if (!videoPaused) {
        video.play();
    }
    video.playbackRate = videoSpeed;
}



/**
 * @param {number} width
 * @param {number} height
 * */
export function setVideoDimensions(height, width) {
    const body = document.body;
    const theaterWidth = Math.max(640, data['video_duration'] ?? 0, width);
    body.style.setProperty('--video_height', String(height));
    body.style.setProperty('--video_width', String(width));
    body.style.setProperty('--plyr-control-spacing-num', (height < 240) ? "3" : "10");
    body.style.setProperty('--theater_video_target_width', String(theaterWidth));

    function setVideoAspectRatio() {
        // Recreate the video constant aspect ratio media query
        // in javascript because media queries do not accept css
        // variables and cannot be modified by javascript
        const videoContainerInner = document.querySelector('#video-container-inner');
        if (innerWidth < width) {
            videoContainerInner.style.paddingTop = String(100 * height / width) + '%';
            videoContainerInner.style.height = '0px';
        } else {
            videoContainerInner.style.paddingTop = '';
            videoContainerInner.style.height = '';
        }
    }

    if (data.settings.theater_mode) {
        setVideoAspectRatio();
        onresize = () => setVideoAspectRatio();
    }
}