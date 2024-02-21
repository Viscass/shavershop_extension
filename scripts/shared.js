class StorageManager {
  static async readLocalStorage(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], function (result) {
        if (result[key] === undefined) {
          reject(`No value found for key: ${key}`);
        } else {
          resolve(result[key]);
        }
      });
    });
  }

  static async setLocalStorage(key, value) {
    return new Promise((resolve, reject) => {
      let obj = {};
      obj[key] = value;
      chrome.storage.local.set(obj, function () {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  static async clearLocalStorage() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(function () {
        var error = chrome.runtime.lastError;
        if (error) {
          reject(error);
        } else {
          console.log("Local storage cleared");
          resolve();
        }
      });
    });
  }
}
