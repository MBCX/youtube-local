import { doXhr } from "./common.js";

async function onClickReplies(e) {
    const details = e.target.parentElement;
    const commentPages = details.querySelector(".comment_page");
    // e.preventDefault();
    console.log("loading replies...");
    doXhr(
        details.getAttribute("src") + "&slim=1",
        html => commentPages.innerHTML = html
    );
}

addEventListener("DOMContentLoaded", function () {
    const detailReplies = document.querySelectorAll("details.replies");
    detailReplies.forEach(details => {
        details.addEventListener("click", onClickReplies, { once: true });
        details.addEventListener("auxclick", e => {
            if (e.target.parentElement !== details) {
                return;
            } else if (e.button === 1) {
                open(details.getAttribute("src"));
            }
        });
    });
});
