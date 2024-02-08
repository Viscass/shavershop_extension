
let stockCount; // This will be the stock count element
let loginForm; // This will be the login form
let container; // This will be the container block

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

async function updateStockCount(plu) {
  if (!(await checkSession())) {
    console.log("Invalid session key");
    return;
  }

  chrome.runtime.sendMessage(
    { type: "getStockCount", plus: plu },
    (response) => {
      var count = response;
      if (stockCount) {
        stockCount.textContent = "Stock count: " + count;
      }
    }
  );
}

async function getWareHouses() {
  const warehouses = await chrome.runtime.sendMessage({ type: "getWareHouses" });
  return warehouses;
}

async function checkSession() {
  try {
    let sessionKey = await readLocalStorage("key");
    let sessionExpiry = await readLocalStorage("sessionExpiry");
    if (sessionKey === undefined || sessionExpiry < Date.now() / 1000) {
      return false;
    }
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

async function createStockCountContainer() {
  // Create the container block
  if (!container) {
    container = document.createElement("div");
    container.style.position = "fixed";
    container.style.right = "0";
    container.style.top = "230px";
    container.style.transform = "translateY(-50%)";
    container.style.backgroundColor = "#fff";
    container.style.padding = "10px";
    container.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.25)";
    container.style.zIndex = "1000";
    container.style.width = "330px";
    // Add the container block to the body
    document.body.appendChild(container);
  }
  

  if (!stockCount) {
    stockCount = createStockCountElement(container);
  }

  if (!loginForm) {
    loginForm = createLoginForm(container);
  }

  createWarehouseSelectButton(container);

  updateElements();
}

function createStockCountElement(container) {
  // Create the stock count element
  const stockCount = document.createElement("p");
  stockCount.textContent = "Stock count: ?"; // update this value later
  stockCount.style.display = 'none'; // hide initially
  container.appendChild(stockCount);
  return stockCount;
}

function createLoginForm(container) {
  // Create the login form
  const loginForm = document.createElement("form");
  loginForm.style.padding = "20px";
  container.appendChild(loginForm);

  const logInText = document.createElement("p");
  logInText.textContent = "Please log in to see stock count.";
  logInText.style.marginBottom = "10px";
  loginForm.appendChild(logInText);

  // Create the username field
  const usernameField = document.createElement("input");
  usernameField.type = "text";
  usernameField.name = "username";
  usernameField.placeholder = "Username";
  loginForm.appendChild(usernameField);

  // Create the password field
  const passwordField = document.createElement("input");
  passwordField.type = "password";
  passwordField.name = "password";
  passwordField.placeholder = "Password";
  loginForm.appendChild(passwordField);

  // Create the submit button
  const submitButton = document.createElement("input");
  submitButton.type = "submit";
  submitButton.value = "Log in";
  loginForm.appendChild(submitButton);

  // Hide login form
  loginForm.style.display = "none";

  // Handle form submission
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    // Handle login here
    chrome.runtime.sendMessage(
      {
        type: "getSessionKey",
        username: usernameField.value,
        password: passwordField.value,
      },
      (response) => {
        updateElements();
        if (response) {
          console.log("Login successful");
        } else {        
          console.log("Login failed");
          alert("Login failed")
        }
      }
    );
  });

  return loginForm;
}

function createWarehouseSelectButton(container) {
  const button = document.createElement("button");
  button.textContent = "Select Warehouse";
  button.addEventListener("click", showPopup);
  container.appendChild(button);
}

// Add this function to show the popup
async function showPopup() {
  const popup = document.createElement("div");
  popup.style.position = "fixed";
  popup.style.left = "50%";
  popup.style.top = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.backgroundColor = "#fff";
  popup.style.padding = "20px";
  popup.style.zIndex = "1001";

  const warehouses = await getWareHouses();
  const list = document.createElement("ul");
  warehouses.forEach((warehouse) => {
    const listItem = document.createElement("li");
    listItem.textContent = warehouse;
    listItem.addEventListener("click", () => selectWarehouse(warehouse));
    list.appendChild(listItem);
  });
  popup.appendChild(list);

  document.body.appendChild(popup);
}

// Add this function to handle warehouse selection
function selectWarehouse(warehouse) {
  chrome.storage.local.set({ selectedWarehouse: warehouse }, function() {
    console.log('Warehouse selected: ' + warehouse);
  });
}


async function updateElements() {
  // Check the session status
  const sessionValid = await checkSession();

  // Update the visibility of the loginForm and stockCount based on the session status
  if (loginForm) {
    loginForm.style.display = sessionValid ? 'none' : 'block';
  }

  if (stockCount) {
    stockCount.style.display = sessionValid ? 'block' : 'none' ;
  }

  // If the session is valid, update the stock count
  if (sessionValid) {
    const plu = getCurrentPluFromUrl();
    if (plu) {
      updateStockCount(plu);
    }
  }
}

function getCurrentPluFromUrl() {
  var plu = /[0-9]{6}/.exec(window.location.href);
  console.log("plu: " + plu);
  return plu;
}

function checkURLforPlu() {
  return /[0-9]{6}/.test(window.location.href);
}

if (checkURLforPlu()) {
  createStockCountContainer();
}
