console.log("background script");

const url = 'https://1105.erply.com/api/'
const warehouseID = 5000000091 // Upper Mt Gravatt

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(message.plus);
    if (message.type === 'getStockCount')  {
        getStockCount(message.plus).then(sendResponse);
        return true;
    }
    if (message.type === 'getSessionKey') {
        getSessionKey(message.username, message.password).then(sendResponse);
        return true; 
    }
    if (message.type === 'getSessionKeyInfo') {
        getSessionKeyInfo().then(sendResponse);
        return true;
    }
    if (message.type === 'getWareHouses') {
        getWareHouses().then(sendResponse);
        return true;
    }
});

const readLocalStorage = async (key) => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], function (result) {
            if (result[key] === undefined) {
                reject(`No value found for key: ${key}`);
            } else {
                resolve(result[key]);
            }
        });
    });
};

async function makeErplyRequest(request, parameters) {
    let data = "clientCode=1105&sendContentType=1" + "&request=" + request
    
    for (let key in parameters) {
        data += "&" + key + "=" + parameters[key];
    }

    console.log(data)
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

    return obj;
}

async function getStockCount(plu) {
    try {
        let sessionKey = await readLocalStorage('key');
        let obj = await makeErplyRequest("getProducts", { getStockInfo: "1", code: plu, sessionKey: sessionKey });
        console.log(obj)
        if (obj.status.responseStatus == "ok") {
            return getCountFromJSON(obj);
        }
    } catch (error) {
        console.error("Error in getting stock count:", error);
    }

    if (obj.status.responseStatus == "ok") {
        return getCountFromJSON(obj);
    } else {
        console.log("getStockCount: something wrong");
        return "something went wrong";
    }
}

async function getSessionKey(username, password) {
    try {
        let obj = await makeErplyRequest("verifyUser", { username: username, password: password,  sessionLength: "43200"});
        if (obj.status.responseStatus == "ok") {
            let value = obj.records[0].sessionKey;
            chrome.storage.local.set({ key: value }).then(() => {
                console.log("Sesion key is set to " + value);
            });
            let expiry = obj.status.requestUnixTime + obj.records[0].sessionLength;
            chrome.storage.local.set({ sessionExpiry: expiry }).then(() => {
                console.log("Sesion expires at: " + expiry);
            });
            return 1;
        } else {
            console.log("getSessionKey: Oops, Invalid credentials");
            return 0;
        }
    } catch (error) {
        console.error("Error in makeErplyRequest: ", error);
    }
}

// retrieves the session key information from erply server, then returns if it is expired
async function getSessionKeyInfo() {
    try {
        let sessionKey = await readLocalStorage('key');
        let obj = await makeErplyRequest("getSessionKeyInfo", { sessionKey: sessionKey});
        if (obj.status.responseStatus == "ok") {
            if (obj.records[0].expireUnixTime > obj.status.requestUnixTime) {
                console.log("Session key is still valid");
                return 1;
            } else {
                console.log("Session key is expired");
                return 0;
            }
        } else {
            console.log("Incorrect session key");
            return 0;
        }
    } catch (error) {
        console.log(error);
        return 0;
    };
}

async function getWareHouses() {
    try {
        let sessionKey = await readLocalStorage('key');
        let obj = await makeErplyRequest("getAllowedWarehouses", { sessionKey: sessionKey });
        return obj;
    } catch (error) {
        console.log(error);
    }

}

getWareHouses();

function getCountFromJSON(obj) {
    if (obj.records.length == 0) {
        return -1000;
    } else {
        return obj.records[0].warehouses[warehouseID].free;
    }
}