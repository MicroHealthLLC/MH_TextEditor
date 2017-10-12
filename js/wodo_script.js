
var openSlider = document.getElementById("openSliderbtn"),
    slide = document.querySelector(".slide"),
    closeSlider = document.getElementById("closeSliderbtn"),
    docslistingdiv = document.getElementById("docslistingdiv");

openSlider.addEventListener("click",  function () {
    docslistingdiv.style.zIndex = 2000;
    slide.classList.remove("slide-up");
});

closeSlider.addEventListener("click", function () {
    slide.classList.add("slide-up");
    setTimeout(function () {
        docslistingdiv.style.zIndex = -2000;
    }, 800);
});



function saveMHTextEditor() {
    "use strict";
    var thesemh_texteditorperson2 = JSON.stringify(mh_texteditorperson);
    localStorage.setItem("thesemh_texteditorperson2", thesemh_texteditorperson2);
}


function setupDocs() {
    "use strict";
    var thesemh_texteditorperson2 = localStorage.getItem("thesemh_texteditorperson2");
    if ((thesemh_texteditorperson2 !== null) && (thesemh_texteditorperson2 !== "") && (thesemh_texteditorperson2 !== undefined)) {
        mh_texteditorperson = JSON.parse(thesemh_texteditorperson2);
    }
    createEditor();
    document.getElementById("docfilename").value = "doc.odt";
}


