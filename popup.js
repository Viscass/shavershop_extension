if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',afterDOMLoaded);
} else {
    afterDOMLoaded();
}

function afterDOMLoaded(){
    let button = document.getElementById("btn1");
    button.addEventListener("click", changeBackground);
    function changeBackground() {
        document.body.style.backgroundColor = "blue";
    }
}