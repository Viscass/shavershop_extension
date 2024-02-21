console.log("background script");

importScripts("shared.js");

const url = "https://1105.erply.com/api/";
const maxSessionLength = "43200";


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getStockCount") {
    getStockCount(message.plus).then(sendResponse);
    return true;
  }
  if (message.type === "getSessionKey") {
    getSessionKey(message.username, message.password).then(sendResponse);
    return true;
  }
  if (message.type === "getSessionKeyInfo") {
    getSessionKeyInfo().then(sendResponse);
    return true;
  }
  if (message.type === "getWareHouses") {
    getWareHouses().then(sendResponse);
    return true;
  }
});

async function makeErplyRequest(request, parameters) {
  let data = "clientCode=1105&sendContentType=1" + "&request=" + request;

  for (let key in parameters) {
    data += "&" + key + "=" + parameters[key];
  }

  console.log(data);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: data,
  });

  const text = await response.text();
  const obj = JSON.parse(text);

  return obj;
}

async function getStockCount(plu) {
  try {
    let sessionKey = await StorageManager.readLocalStorage("key");
    let obj = await makeErplyRequest("getProducts", {
      getStockInfo: "1",
      code: plu,
      sessionKey: sessionKey,
    });
    console.log(obj);
    if (obj.status.responseStatus == "ok") {
      return getCountsFromJSON(obj);
    } else {
      console.log("Error in getting stock count");
      return null;
    }
  } catch (error) {
    console.error("Error in getting stock count:", error);
    return null;
  }
}

async function getSessionKey(username, password) {
  try {
    let obj = await makeErplyRequest("verifyUser", {
      username: username,
      password: password,
      sessionLength: maxSessionLength,
    });
    if (obj.status.responseStatus == "ok") {
      let value = obj.records[0].sessionKey;
      setLocalStorage("key", value);
      let expiry = obj.status.requestUnixTime + obj.records[0].sessionLength;
      setLocalStorage("sessionExpiry", expiry);
      return true;
    } else {
      console.log("getSessionKey: Oops, Invalid credentials");
      return false;
    }
  } catch (error) {
    console.error("Error in makeErplyRequest: ", error);
  }
}

// retrieves the session key information from erply server, then returns if it is expired
async function getSessionKeyInfo() {
  try {
    let sessionKey = await StorageManager.readLocalStorage("key");
    let obj = await makeErplyRequest("getSessionKeyInfo", {
      sessionKey: sessionKey,
    });
    if (obj.status.responseStatus == "ok") {
      if (obj.records[0].expireUnixTime > obj.status.requestUnixTime) {
        console.log("Session key is still valid");
        return true;
      } else {
        console.log("Session key is expired");
        return false;
      }
    } else {
      console.log("Incorrect session key");
      return false;
    }
  } catch (error) {
    console.log(error);
    return false;
  }
}

async function getWareHouses() {
  try {
    let sessionKey = await StorageManager.readLocalStorage("key");
    let obj = await makeErplyRequest("getAllowedWarehouses", {
      sessionKey: sessionKey,
    });
    console.log(obj);
    return await getWarehousesfromJSON(obj);
  } catch (error) {
    console.log(error);
  }
}

function getWarehousesfromJSON(obj) {
  let warehouses = obj.records;
  let warehouseArray = [];
  // cycle through the warehouses and get the name and id
  console.log(warehouses);
  for (let key in warehouses) {
    warehouseArray.push({
      id: warehouses[key].warehouseID,
      name: warehouses[key].name,
    });
  }

  return warehouseArray;
}

getWareHouses();

async function getCountsFromJSON(obj) {
  console.log(obj);
  console.log(obj.records[0].warehouses);
  let warehouse_counts = {};

  for (let key in obj.records[0].warehouses) {
    warehouse_counts[key] = obj.records[0].warehouses[key].free;
  }
  console.log(warehouse_counts);
  return warehouse_counts;
}
