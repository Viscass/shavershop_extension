console.log("background script");

importScripts("shared.js");

const url = "https://1105.erply.com/api/";
const maxSessionLength = "43200";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(message);
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
  
    if (message.type === 'getAllProducts') {
        getAllProducts().then(sendResponse);
        return true;
    }
  
    if (message.type === 'syncProductStock') {
      syncProductStock(message.warehouseID).then(sendResponse);
      return true;
    }
});

async function makeErplyRequest(request, parameters) {
  let data = "clientCode=1105&sendContentType=1" + "&request=" + request;

  for (let key in parameters) {
    data += "&" + key + "=" + parameters[key];
  }

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

async function getCountsFromJSON(obj) {
  let warehouse_counts = {};

  for (let key in obj.records[0].warehouses) {
    warehouse_counts[key] = obj.records[0].warehouses[key].free;
  }
  console.log(warehouse_counts);
  return warehouse_counts;
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
      StorageManager.setLocalStorage("key", value);
      let expiry = obj.status.requestUnixTime + obj.records[0].sessionLength;
      StorageManager.setLocalStorage("sessionExpiry", expiry);
      return { success: true, message: "Login successful" };
    } else {
      return { success: false, message: "Invalid credentials" };
    }
  } catch (error) {
    console.error("Error in getSessionKey: ", error);
    return { success: false, message: error.message };
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
        throw new Error("Session key is expired");
      }
    } else {
      throw new Error("Incorrect session key");
    }
  } catch (error) {
    console.error("Error in getSessionKeyInfo: ", error);
    throw error;
  }
}

async function getWareHouses() {
  try {
    let sessionKey = await StorageManager.readLocalStorage("key");
    let obj = await makeErplyRequest("getAllowedWarehouses", {
      sessionKey: sessionKey,
    });
    return getWarehousesfromJSON(obj);
  } catch (error) {
    console.log(error);
  }
}

function getWarehousesfromJSON(obj) {
  let warehouses = obj.records;
  let warehouseArray = warehouses.map(warehouse => ({
    id: warehouse.warehouseID,
    name: warehouse.name,
  }));
  return warehouseArray;
}

function getProductsfromJSON(obj) {
  let productArray = obj.records.map(product => ({
    id: product.productID,
    plu: product.code,
    name: product.name,
    count: null,
    lastUpdated: null,
  }));
  console.log(productArray)
  return productArray;
}


async function getAllProducts() {
  try {
    let sessionKey = await StorageManager.readLocalStorage("key");
    let pluMap = {};
    let productInfo = {};
    let numProducts = 0;
    let page = 1;
    let recordsOnPage = 1000;
    let recordsTotal = 0;
    do {
      let obj = await makeErplyRequest("getProducts", {
        sessionKey: sessionKey,
        recordsOnPage: recordsOnPage,
        pageNo: page,
      });
      if (obj.status.responseStatus != "ok") {
        console.log("Error in getting products");
        return null;
      }
      numProducts += obj.status.recordsInResponse;
      recordsTotal = obj.status.recordsTotal;
      page += 1;
      let products = getProductsfromJSON(obj);
      products.forEach(product => {
        pluMap[product.plu] = product.id;

        const { id, ...otherProperties } = product;
        productInfo[id] = otherProperties;
      });


    } while (numProducts < recordsTotal);

    // Store the product dictionarys in local storage
    StorageManager.setLocalStorage("pluMap", pluMap);
    StorageManager.setLocalStorage("productInfo", productInfo);


    return {pluMap, productInfo};
  } catch (error) {
    console.log(error);
  }
}


async function syncProductStock(warehouseID, overrideLastUpdate = false) {
  try {
    let sessionKey = await StorageManager.readLocalStorage("key");
    let lastUpdated = 0;
    if (overrideLastUpdate) {
      lastUpdated = overrideLastUpdate;
    } else {
      try {
        lastUpdated = await StorageManager.readLocalStorage("lastUpdatedStock");
      } catch (error) {
        console.log("No last updated stock found");
      }
    }
    console.log("lastUpdated: " + lastUpdated);

    let obj = await makeErplyRequest("getProductStock", {
      warehouseID: warehouseID,
      changedSince: lastUpdated,
      sessionKey: sessionKey,
    });

    console.log(obj);

    if (obj.status.responseStatus != "ok") {
      console.log("Error in syncing product stock");
      return null;
    }

    let productInfo = {}

    try {
      productInfo = await StorageManager.readLocalStorage("productInfo");
    } catch (error) {
      console.log("No product info found in local storage");
      ({_, productInfo} = await getAllProducts());
      console.log("products fetched");
    }

    obj.records.forEach(record => {
      if (!productInfo[record.productID]) {
        console.log("Product ID: ", record.productID, " not found in productInfo");
      } else {
        let stockCount = parseInt(record.amountInStock, 10);
        productInfo[record.productID].count = stockCount;
        productInfo[record.productID].lastUpdated = lastUpdated == 0 ? 0 : obj.status.requestUnixTime;
      }
    });

    StorageManager.setLocalStorage("lastUpdatedStock", obj.status.requestUnixTime);
    StorageManager.setLocalStorage("productInfo", productInfo);
    return productInfo;
  } catch (error) {
    console.log(error);
  }
}

