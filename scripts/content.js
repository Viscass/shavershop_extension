chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === "GET_CREDENTIALS") {
        const username = window.prompt("Enter your username");
        const password = window.prompt("Enter your password");
        port.postMessage({type: "CREDENTIALS", username: username, password: password});
    }
});

console.log("content script");
if (/[0-9]{6}/.test(window.location.href)) {
  var plu = /[0-9]{6}/.exec(window.location.href);
  console.log("plu: " + plu);

  chrome.runtime.sendMessage({plus: plu}, (response) => {
    var count = response;
    const el = document.querySelector(".brand-name");
    const badge = document.createElement("span");
    badge.classList.add('product-name');
    badge.textContent = `Count: ` + count;
    badge.style.cssFloat = 'right';
    el.insertAdjacentElement("beforeend", badge);
  })
}

