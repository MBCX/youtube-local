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
    let newVideo = document.createElement("video");

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

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
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

    /** @type {HTMLInputElement | null} */
    let seekInput = null;

    if (data.settings.video_player === 0) {
        videoObj = document.querySelector("#video-container-inner #mini-player + video");
    } else {
        videoObj = document.querySelector("video");
    }
    
    const hash = sha256(data.video_id).substring(0, 4);
    const url = `/https://sponsor.ajay.app/api/skipSegments/${hash}?service=YouTube&categories=[${sponsorBlockCategories.map(v => `"${v}"`)}]`;
    const req = fetch(url)
    const [_, api] = await Promise.all([req, (await req).json()]);
    const gradientStops = [];

    let hideThumb = false;

    for (const video of api)
    {
        // Because we"re using a hash as input for the API,
        // it may retive more than 1 video.
        // Skip it if that"s the case.
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
            const startPosition = ((start) / (videoObj.duration)) * 100;
            const stopPosition = ((stop) / (videoObj.duration)) * 100;
            const categoryIndex = sponsorBlockCategories.indexOf(segment.category);
            const gradientColours = {
                // Red.
                "sponsor": "#f44336",

                // Medium green.
                "intro": "#4caf50",

                // Bright yellow.
                "interaction": "#ffeb3b",

                // Powerful orange.
                "selfpromo": "#ff5722",

                // Blue.
                "preview": "#2196f3",

                // Dark purple.
                "music_offtopic": "#9c27b0",

                // Light green.
                "filler": "#8bc34a",

                // Light grey with touch of aqua.
                "poi_highlight": "#e6e3fd",
            };
            const gradientCategory = `transparent ${startPosition}%, transparent ${startPosition}%, ${gradientColours[segment.category]} ${startPosition}%, ${gradientColours[segment.category]} ${stopPosition}%, transparent ${stopPosition}%, transparent ${stopPosition}%`
    
            // Sponsorblock segment not supported in our
            // sponsor list.
            if (categoryIndex === -1) {
                continue;
            }

            if (segment.category === "poi_highlight") {
                const redDiv = document.createElement("div");
                const highlightSpan = document.createElement("span");
                stopPosition += 1;
                seekInput = document.querySelector(`input[id^="plyr-seek-"]`);
                redDiv.style.position = "absolute";
                redDiv.style.left = `${startPosition}%`;
                redDiv.style.width = `${stopPosition - startPosition}%`;
                redDiv.style.height = "50%";
                redDiv.style.top = "5px";
                redDiv.title = "Highlight";

                //	redDiv.style.zIndex="6666";
                //redDiv.style.pointerEvents = "none";
                redDiv.style.backgroundColor = "red";
                seekInput.parentNode.appendChild(redDiv);

                highlightSpan.textContent = "Highlight";
                highlightSpan.style.position = "absolute";
                highlightSpan.style.bottom = "15px";
                highlightSpan.style.left = `${startPosition}%`;
                highlightSpan.style.transform = "translateX(-50%)";
                highlightSpan.style.backgroundColor = "black";
                highlightSpan.style.zIndex = "5555";
                highlightSpan.style.fontSize = "13px";
                highlightSpan.style.marginLeft = "5px";
                highlightSpan.style.color = "white";
                highlightSpan.style.padding = "2px 5px";
                highlightSpan.style.display = "none";

                seekInput.parentNode.appendChild(highlightSpan);
                seekInput.parentNode.addEventListener("mousemove", function(event) {
                    const rect = redDiv.getBoundingClientRect();
                    const mouseX = event.clientX - rect.left;
                    const mouseY = event.clientY - rect.top;
                    if (mouseX >= 0 && mouseX <= redDiv.offsetWidth && mouseY >= 0 && mouseY <= redDiv.offsetHeight) {
                        highlightSpan.style.display = "block";
                    } else {
                        highlightSpan.style.display = "none";
                    }
                });

                seekInput.parentNode.addEventListener("mouseout", function(event) {
                    highlightSpan.style.display = "none";
                });
            } else {
                gradientStops.push(gradientCategory);
            }

            videoObj.addEventListener("timeupdate", () => {
                const time = videoObj.currentTime;
                /** @type {boolean} */
                const skipSponsors = document.querySelector("#skip_sponsors").checked;

                if (skipSponsors && numberBetween(time, start, stop - 1, true)) {
                    videoObj.currentTime = stop;
                }
            });

            videoObj.addEventListener("timeupdate", throttle(() => {
                const time = videoObj.currentTime;
                const skipSponsors = document.querySelector("#skip_sponsors").checked;
                const sponsorSegments = video.segments;
                const inSponsorSegment = sponsorSegments.some(part => {
                    return numberBetween(time, part.segment[0] - 2, part.segment[1] - 1, true);
                });

                if (skipSponsors && inSponsorSegment) {
                    if (!seekInput.classList.contains("hidden-thumb")) {
                        seekInput.classList.add("hidden-thumb");
                    }
                } else {
                    if (seekInput.classList.contains("hidden-thumb")) {
                        seekInput.classList.remove("hidden-thumb");
                    }
                }

            }, 200));
        }
    }

    const allGradientStops = gradientStops.join(", ");
    seekInput = document.querySelector(`input[id^="plyr-seek-"]`);
    seekInput.style.backgroundSize = `100% 50%`;
    seekInput.style.backgroundPosition = `center 5px`;
    seekInput.style.backgroundRepeat = "no-repeat";
    seekInput.style.backgroundImage = `linear-gradient(to right, ${allGradientStops})`;
}