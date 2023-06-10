console.log("background script");

const url = 'https://1105.erply.com/api/'
const dataFixed = "clientCode=1105&sendContentType=1&request=getProducts&getStockInfo=1"
const warehouseID = 5000000091 // Upper Mt Gravatt

if (getSessionKey("username", "password")) {
    console.log("key gotten");
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(message.plus);
    if (message.plus) {
        getStockCount(message.plus).then(sendResponse);
    }
    return true;
});

async function getStockCount(plu) {
    const sessionKey = await readLocalStorage('key');
    const data = dataFixed + "&code=" + plu + "&sessionKey=" + sessionKey;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: data,
    });

    const text = await response.text();
    const obj = JSON.parse(text);

    if (obj.status.responseStatus == "ok") {
        return getCountFromJSON(obj);;
    } else {
	console.log("getStockCount: , something wrong");
	getSessionKey("username", "password);
        return "INVALID SESSION, REFRESH";
    }
}


async function getSessionKey(userName, password) {
    const data = "clientCode=1105&sendContentType=1"
 + "&username=" + userName + "&password=" + password + "&request=verifyUser&sessionLength=43200";
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: data,
    });

    const text = await response.text();
    const obj = JSON.parse(text);

    if (obj.status.responseStatus == "ok") {
	let value = obj.records[0].sessionKey;
	chrome.storage.local.set({ key: value }).then(() => {
  	    console.log("Value is set to " + value);
	});
	return 1;
    } else {
	console.log("verify user: oops, something wrong");
        return 0;
    }
}


const readLocalStorage = async (key) => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], function (result) {
            if (result[key] === undefined) {
                reject();
            } else {
                resolve(result[key]);
            }
        });
    });
};



function getCountFromJSON(obj) {
    if (obj.records.length == 0) {
        return -1000;
    } else {
        return obj.records[0].warehouses[warehouseID].free;
    }
}


