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

var x = document.querySelectorAll(".product-tile");
var plus = [];
var pluString = "";
x.forEach(printNode);
if (pluString) {
    pluString = pluString.substring(0, pluString.length - 1);
}
console.log(pluString);




function printNode(item, index, arr) {
    let itemID = item.dataset.itemid;
    console.log(itemID );
    plus.push(itemID );
    pluString += itemID + ',';
}


