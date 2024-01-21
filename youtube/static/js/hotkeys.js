import {
    getActiveTranscriptTrack,
    getVideoFrameRate,
    copyTextToClipboard
} from "./common.js";
import { player } from "./plyr-start.js";

/**
 * @param {KeyboardEvent} e
 * */
function onKeyDown(e) {
    if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
        return false;
    }

    if (!e.isTrusted || e.ctrlKey) {
        return;  // plyr CustomEvent
    }

    /** @type {HTMLVideoElement | null} */
    let video = null;
    if (data.settings.video_player === 0) {
        video = document.querySelector("#video-container-inner #mini-player + video");
    } else {
        video = document.querySelector("video");
    }
    const key = e.key.toLowerCase();
    const code = e.keyCode;
    const preventDefaultKeys = [
        "c",
        "k", "j",
        "l", "f",
        "arrowleft",
        "arrowright",
        " "
    ];
    const videoFrameRate = getVideoFrameRate();
    const isVideoFocused = document.activeElement === video;
    const isChrome = navigator.userAgent.indexOf("Chrome") !== -1;

    // Prevent the default if any of the
    // keys defined in the array are pressed.
    if (preventDefaultKeys.some(val => val === key)) {
        e.preventDefault();
    }

    function pauseOrResume() {
        video.paused ? video.play() : video.pause();
    }

    function pauseVideo() {
        !video.paused && video.pause();
    }

    function control5Seconds() {
        if (key.includes("left")) {
            video.currentTime -= 5;
        } else if (key.includes("right")) {
            video.currentTime += 5;
        }
    }

    // Video element has built in functionality
    // for pausing, but not for k though.
    if (key === "k") {
        pauseOrResume();
    } else if (key === " ") {
        if (isChrome && !isVideoFocused) {
            pauseOrResume();
        } else {
            pauseOrResume();
        }
    }

    switch (key) {
        case "m":
            video.muted = !video.muted;
            break;
        case "arrowleft":
        case "arrowright":
            if (isChrome && !isVideoFocused) {
                control5Seconds();
            } else {
                control5Seconds();
            }
            break;
        case "j":
            video.currentTime -= 10;
            break;
        case "l":
            video.currentTime += 10;
            break;
        case "f":
            if (data.settings.video_player === 1) {
                player.fullscreen.toggle();
            } else {
                if (document.fullscreen) {
                    document.exitFullscreen();
                } else {
                    video.requestFullscreen();
                }
            }
            break;
        case "c":
            if (data.settings.video_player === 1) {
                player.toggleCaptions();
            } else {
                const tt = getActiveTranscriptTrack();
                if (tt == null) {
                    return;
                }
                tt.mode = (t.mode === "showing") ? "disabled" : "showing";
            }
            break;
        case "t":
            const ts = Math.floor(video.currentTime);
            copyTextToClipboard(`https://youtu.be/${data.video_id}?t=${ts}`);
            break;
        case ",":
            pauseVideo();
            video.currentTime -= 1 / videoFrameRate;
            break;
        case ".":
            pauseVideo();
            video.currentTime += 1 / videoFrameRate;
            break;
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
            if (code > 57) {
                break;
            }
            const percent = (code - 48) * 10;
            const newTime = video.duration * (percent / 100);
            video.currentTime = newTime;
            break;
    }
}

addEventListener("DOMContentLoaded", function () {
    document.addEventListener("keydown", onKeyDown);
}, { once: true });
