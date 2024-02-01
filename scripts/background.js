console.log("background script");

const url = 'https://1105.erply.com/api/'
const dataFixed = "clientCode=1105&sendContentType=1&request=getProducts&getStockInfo=1"
const warehouseID = 5000000091 // Upper Mt Gravatt


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


getCredentials().then((result) => {
    const { username, password } = result;
    console.log(username, password);
    getSessionKey(username, password);
}).catch((error) => {
    console.log(error);
});


getStockCount("009963").then((result) => { console.log(result) });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(message.plus);
    if (message.plus) {
        getStockCount(message.plus).then(sendResponse);
    }
    return true;
});



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


async function getCredentials() {
    try {
        const username = await readLocalStorage('username');
        const password = await readLocalStorage('password');
        return { username, password };
    } catch (error) {
        console.log("No credentials found");
        throw error;
    }
}


async function getSessionKey() {
    let username, password;
    try {
        ({ username, password } = await getCredentials());
    } catch (error) {
        console.log(error);
        return 0;
    }

    console.log(username, password);
    const data = "clientCode=1105&sendContentType=1"
 + "&username=" + username + "&password=" + password + "&request=verifyUser&sessionLength=43200";
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


function getCountFromJSON(obj) {
    if (obj.records.length == 0) {
        return -1000;
    } else {
        return obj.records[0].warehouses[warehouseID].free;
    }
}


