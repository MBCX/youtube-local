import { sha256 } from "./utils/sha256.js";
import { numberBetween } from "./common.js";

addEventListener("load", load_sponsorblock);
document.addEventListener("DOMContentLoaded", async () => {
    const check = document.querySelector("#skip_sponsors");
    check.addEventListener("change", () => {
        if (check.checked) {
            load_sponsorblock();
        }
    });
}, { once: true });

function cloneVideoElement(originalVideo) {
    // create new video element
    let newVideo = document.createElement('video');

    // copy all attributes from the original video to the new video
    for (let i = 0; i < originalVideo.attributes.length; i++) {
        let attr = originalVideo.attributes[i];
        newVideo.setAttribute(attr.name, attr.value);
    }

    // copy all child nodes (like source elements) from original video to the new video
    for (let i = 0; i < originalVideo.childNodes.length; i++) {
        newVideo.appendChild(originalVideo.childNodes[i].cloneNode(true));
    }
    return newVideo;
}

async function load_sponsorblock() {
    /** @type {HTMLParagraphElement} */
    const info_elem = document.querySelector("#skip_n");
    if (info_elem.innerText.length) {
        return; // already fetched
    }
    const sponsorBlockCategories = [
        "sponsor",
        "intro",
        "interaction",
        "preview",
        "selfpromo",
        "music_offtopic",
        "filler"
    ];

    /** @type {HTMLVideoElement | null} */
    let videoObj = null;
    if (data.settings.video_player === 0) {
        videoObj = document.querySelector("#video-container-inner #mini-player + video");
    } else {
        videoObj = document.querySelector("video");
    }

    /** @type {boolean} */
    const skipSponsors = document.querySelector("#skip_sponsors").checked;
    
    const hash = sha256(data.video_id).substring(0, 4);
    const url = `/https://sponsor.ajay.app/api/skipSegments/${hash}?categories=[${sponsorBlockCategories.map(v => `"${v}"`)}]`;
    const req = fetch(url)
    const [_, api] = await Promise.all([req, (await req).json()]);

    for (const video of api)
    {
        // Because we're using a hash as input for the API,
        // it may retive more than 1 video.
        // Skip it if that's the case.
        if (video.videoID !== data.video_id)
        {
            continue;
        }
        
        info_elem.innerText = `(${video.segments.length} segments)`;
        const cat_n = video.segments.map(e => e.category).sort().reduce(
            (acc, e) => ((acc[e] = (acc[e] || 0) + 1), acc),
            {}
        );
        info_elem.title = Object.entries(cat_n).map(e => e.join(": ")).join(", ");

        for (const segment of video.segments)
        {
            const [start, stop] = segment.segment;
            const categoryIndex = sponsorBlockCategories.indexOf(segment.category);
    
            // Sponsorblock segment not supported in our
            // sponsor list.
            if (categoryIndex === -1) {
                continue;
            }
            
            videoObj.addEventListener("timeupdate", () => {
                const time = videoObj.currentTime;
                if (
                    skipSponsors &&
                    numberBetween(time, start, stop - 1, true)
                ) {
                    videoObj.currentTime = stop;
                }
            });
        }
    }
}