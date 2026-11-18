function revealEndingParagraphs(paragraphs) {
    paragraphs.forEach((paragraph, index) => {
        setTimeout(() => { paragraph.style.opacity = "1"; }, index * 3000);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    revealEndingParagraphs(document.querySelectorAll(".container > .text"));
});
