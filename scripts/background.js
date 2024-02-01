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
            return "Failed to log in to ERPLY"
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

let port = null;

chrome.runtime.onConnect.addListener(function(p) {
    port = p;
    port.onMessage.addListener(function(msg) {
        if (msg.type === "CREDENTIALS") {
            getSessionKey(msg.username, msg.password);
        }
    });
});

async function getSessionKey() {

    let credentials;
    // Check if the content script is ready
    if (!port) {
        console.log("Content script is not ready");
        return 0;
    }

    try {
        credentials = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: "GET_CREDENTIALS" }, function (response) {
                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError.message);
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });
    } catch (error) {
        console.log("Failed to get credentials: ", error);
        return 0;
    }

    
    let username = credentials.username
    let password = credentials.password;
    console.log(username, password);
    const data = "clientCode=1105&sendContentType=1"
 + "&username=" + credentials.username + "&password=" + credentials.password + "&request=verifyUser&sessionLength=43200";
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
        console.log("getSessionKey: oops, something wrong");
        return 0;
    }
}


// retrieves the session key information from erply server, then returns if it is expired
async function getSessionKeyInfo(sessionKey) {
    

}



function getCountFromJSON(obj) {
    if (obj.records.length == 0) {
        return -1000;
    } else {
        return obj.records[0].warehouses[warehouseID].free;
    }
}


