console.log("background script");

const url = 'https://1105.erply.com/api/'
const dataFixed = "clientCode=1105&sendContentType=1&request=getProducts&getStockInfo=1"
const warehouseID = 5000000091 // Upper Mt Gravatt

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(message.plus);
    if (message.plus) {
        getStockCount(message.plus).then(sendResponse);
    }
    return true;
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
    let sessionKey;

    try {
        sessionKey = await readLocalStorage('key');
    } catch (error) {
        console.log(error);
        console.log("No session key found, getting new session key");
        const success = await getSessionKey();
        if (success) {
            sessionKey = await readLocalStorage('key'); // update sessionKey with the new session key
        } else {
            console.log("failed to get session key")
            return "Log in to ERPLY first"
        }
    };

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

    print(text)
    print(obj)

    if (obj.status.responseStatus == "ok") {
        return getCountFromJSON(obj);
    } else {
        console.log("getStockCount: something wrong");
        return "something went wrong";
    }
}

async function getSessionKey(username, password) {
    try {
        let obj = await makeErplyRequest("verifyUser", { username: username, password: password });
    
        console.log(obj);
    
        if (obj.status.responseStatus == "ok") {
            let value = obj.records[0].sessionKey;
            chrome.storage.local.set({ key: value }).then(() => {
                console.log("Value is set to " + value);
            });
            return 1;
        } else {
            console.log("getSessionKey: oops, something wrong");
            return 0;
        }
    } catch (error) {
        console.error("Error in makeErplyRequest:", error);
    }
}



// retrieves the session key information from erply server, then returns if it is expired
async function getSessionKeyInfo() {
    try {
        let sessionKey = await readLocalStorage('key');
        let obj = await makeErplyRequest("getSessionKeyInfo", { sessionKey: sessionKey, sessionLength: "43200"});
        if (obj.status.responseStatus == "ok") {
            console.log(obj);
            console.log(Math.floor(Date.now() / 1000));
            if (obj.records[0].expireUnixTime > Math.floor(Date.now() / 1000)){
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

function getCountFromJSON(obj) {
    if (obj.records.length == 0) {
        return -1000;
    } else {
        return obj.records[0].warehouses[warehouseID].free;
    }
}


